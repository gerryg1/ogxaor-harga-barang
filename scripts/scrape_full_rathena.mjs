/**
 * Comprehensive rAthena & Divine-Pride Scraper
 * Pulls:
 * 1. Monster drop tables from mob_db.yml
 * 2. Equipment from item_db_equip.yml (Weapons, Armors, Headgears, Accessories)
 * 3. Consumables & Herbs from item_db_usable.yml (Potions, Herbs, Wings, Buffs, Yggdrasil)
 * 4. Cards & Etc/Materials/Sampahan from item_db_etc.yml (Jellopy, Oridecon, Elunium, Empty Bottle, etc.)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://raw.githubusercontent.com/rathena/rathena/master/db/re';

function formatMonsterName(name) {
  if (!name) return 'Monster';
  const map = {
    'B_EREMES': 'Assassin Cross Eremes',
    'G_EREMES': 'Assassin Cross Eremes',
    'E_B_EREMES': 'Assassin Cross Eremes',
    'RSX_0806': 'RSX 0806 / RSX-0806',
    'LORD_OF_DEATH': 'Lord of Death / Lord of the Dead',
    'BAPHOMET_': 'Baphomet',
    'DOPPELGANGER_': 'Doppelganger',
    'GOLDEN_BUG': 'Golden Thief Bug',
    'VALKYRIE': 'Valkyrie Randgris'
  };
  if (map[name]) return map[name];
  return name.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

async function fetchText(url) {
  console.log(`Downloading: ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return await res.text();
}

async function buildDropMap() {
  console.log('Building Monster Drop Map from rAthena mob_db.yml...');
  const dropMap = new Map();

  try {
    const text = await fetchText(`${BASE_URL}/mob_db.yml`);
    const mobBlocks = text.split(/\n  - Id:\s+/);

    for (const block of mobBlocks) {
      const nameMatch = block.match(/(?:^|\n)\s*Name:\s*([^\r\n]+)/);
      const aegisMatch = block.match(/(?:^|\n)\s*AegisName:\s*([^\r\n]+)/);
      if (!nameMatch && !aegisMatch) continue;
      
      const rawName = nameMatch ? nameMatch[1].trim() : aegisMatch[1].trim();
      const mobName = formatMonsterName(rawName);

      const dropsSection = block.split(/\n    Drops:\s*\n/)[1];
      if (!dropsSection) continue;

      const dropItems = dropsSection.split(/\n      - Item:\s+/);
      for (let i = 1; i < dropItems.length; i++) {
        const dropChunk = dropItems[i];
        const lines = dropChunk.split('\n');
        const itemName = lines[0].trim();
        const rateMatch = dropChunk.match(/Rate:\s*(\d+)/);
        const rawRate = rateMatch ? parseInt(rateMatch[1], 10) : 100;
        const percent = (rawRate / 100).toFixed(rawRate < 100 ? 2 : 1) + '%';

        const key = itemName.toLowerCase();
        if (!dropMap.has(key)) {
          dropMap.set(key, []);
        }
        const existing = dropMap.get(key);
        if (existing.length < 5 && !existing.some(x => x.monster === mobName)) {
          existing.push({ monster: mobName, rate: percent });
        }
      }
    }
    console.log(`Loaded drop tables for ${dropMap.size} unique items.`);
  } catch (err) {
    console.error('Error parsing mob drops:', err.message);
  }

  return dropMap;
}

function parseItemsFromText(text, dropMap, defaultType = 'Etc') {
  const items = [];
  const rawBlocks = text.split(/\n  - Id:\s+/);

  for (let i = 1; i < rawBlocks.length; i++) {
    const chunk = rawBlocks[i];
    const idMatch = chunk.match(/^(\d+)/);
    if (!idMatch) continue;
    const id = parseInt(idMatch[1], 10);

    const aegisMatch = chunk.match(/(?:^|\n)\s*AegisName:\s*([^\r\n]+)/);
    const nameMatch = chunk.match(/(?:^|\n)\s*Name:\s*([^\r\n]+)/);
    const typeMatch = chunk.match(/(?:^|\n)\s*Type:\s*([^\r\n]+)/);
    const subTypeMatch = chunk.match(/(?:^|\n)\s*SubType:\s*([^\r\n]+)/);
    const buyMatch = chunk.match(/(?:^|\n)\s*Buy:\s*(\d+)/);
    const sellMatch = chunk.match(/(?:^|\n)\s*Sell:\s*(\d+)/);
    const weightMatch = chunk.match(/(?:^|\n)\s*Weight:\s*(\d+)/);
    const atkMatch = chunk.match(/(?:^|\n)\s*Attack:\s*(\d+)/);
    const matkMatch = chunk.match(/(?:^|\n)\s*MagicAttack:\s*(\d+)/);
    const defMatch = chunk.match(/(?:^|\n)\s*Defense:\s*(\d+)/);
    const slotMatch = chunk.match(/(?:^|\n)\s*Slots:\s*(\d+)/);
    const lvlMatch = chunk.match(/(?:^|\n)\s*EquipLevelMin:\s*(\d+)/);
    const wlvMatch = chunk.match(/(?:^|\n)\s*WeaponLevel:\s*(\d+)/);

    const aegisName = aegisMatch ? aegisMatch[1].trim() : `Item_${id}`;
    let name = nameMatch ? nameMatch[1].trim() : aegisName.replace(/_/g, ' ');

    const slots = slotMatch ? parseInt(slotMatch[1], 10) : 0;
    if (slots > 0 && !name.includes('[')) {
      name = `${name} [${slots}]`;
    }

    const type = typeMatch ? typeMatch[1].trim() : defaultType;
    const subType = subTypeMatch ? subTypeMatch[1].trim() : (type === 'Card' ? 'Card' : type);

    // Extract jobs
    let jobs = ['All Jobs'];
    const jobsBlock = chunk.split(/Jobs:\s*\n/)[1]?.split(/\n    [A-Z]/)[0];
    if (jobsBlock) {
      const jobLines = jobsBlock.match(/([a-zA-Z]+):\s*true/g);
      if (jobLines) {
        jobs = jobLines.map(j => j.split(':')[0].trim());
      }
    }

    // Extract script
    let script = '';
    const scriptMatch = chunk.match(/Script:\s*\|\s*\n([\s\S]*?)(?=\n    [A-Z]|\n  - Id:|$)/);
    if (scriptMatch) {
      script = scriptMatch[1].trim().split('\n').map(l => l.trim()).join(' ');
    }

    // Drops lookup
    const drops = dropMap.get(aegisName.toLowerCase()) || [];

    // Divine Pride URLs
    const images = {
      icon: `https://static.divine-pride.net/images/items/item/${id}.png`,
      collection: `https://static.divine-pride.net/images/items/collection/${id}.png`,
      rmsIcon: `https://ratemyserver.net/item_gfx/${id}.gif`
    };

    let desc = '';
    if (script) {
      desc = `Efek: ${script.slice(0, 180)}...`;
    } else if (type === 'Healing' || type === 'Usable') {
      desc = `Item konsumsi / pemulihan HP & SP (${name}).`;
    } else if (type === 'Card') {
      desc = `Kartu monster Ragnarok Online (${name}).`;
    } else if (type === 'Etc') {
      desc = `Bahan material / barang jarahan monster (Loot: ${name}).`;
    } else {
      desc = `Item perlengkapan resmi dari rAthena database.`;
    }

    items.push({
      id,
      name,
      subtype: subType ? `[${subType}]` : `[${type}]`,
      aegisName,
      type,
      class: subType || type,
      buy: buyMatch ? `${buyMatch[1]}z` : '20z',
      sell: sellMatch ? `${sellMatch[1]}z` : '10z',
      weight: weightMatch ? (parseInt(weightMatch[1], 10) / 10) : 0,
      attack: atkMatch ? parseInt(atkMatch[1], 10) : 0,
      magicAttack: matkMatch ? parseInt(matkMatch[1], 10) : 0,
      defense: defMatch ? parseInt(defMatch[1], 10) : 0,
      requiredLvl: lvlMatch ? parseInt(lvlMatch[1], 10) : 0,
      weaponLvl: wlvMatch ? parseInt(wlvMatch[1], 10) : 0,
      slot: slots,
      applicableJobs: jobs,
      description: desc,
      itemScript: script ? `{ ${script.slice(0, 150)} }` : '{}',
      droppedBy: drops,
      enchantment: slots > 0 ? 'Socket Enchantable' : (type === 'Card' ? 'Card Compound' : 'None'),
      images
    });
  }

  return items;
}

export async function runFullScraper() {
  console.log('=== STARTING COMPREHENSIVE RATHENA SCRAPER ===');
  const dropMap = await buildDropMap();

  // 1. Equipment (Weapons, Armors, Shields, Headgears, Accessories)
  console.log('Downloading item_db_equip.yml...');
  const equipText = await fetchText(`${BASE_URL}/item_db_equip.yml`);
  const equipItems = parseItemsFromText(equipText, dropMap, 'Equipment');
  console.log(`Parsed ${equipItems.length} equipment items.`);

  // 2. Consumables & Herbs (Potions, Herbs, Wings, Yggdrasil, Buffs)
  console.log('Downloading item_db_usable.yml (Consumables & Herbs)...');
  const usableText = await fetchText(`${BASE_URL}/item_db_usable.yml`);
  const usableItems = parseItemsFromText(usableText, dropMap, 'Usable');
  console.log(`Parsed ${usableItems.length} usable & herb items.`);

  // 3. Cards & Etc/Materials/Loot/Sampahan
  console.log('Downloading item_db_etc.yml (Cards & Monster Loot/Sampahan)...');
  const etcText = await fetchText(`${BASE_URL}/item_db_etc.yml`);
  const etcItems = parseItemsFromText(etcText, dropMap, 'Etc');
  const cardItems = etcItems.filter(it => it.type === 'Card' || it.aegisName.includes('Card') || (it.id >= 4001 && it.id <= 4700));
  const lootItems = etcItems.filter(it => it.type !== 'Card' && !it.aegisName.includes('Card'));
  console.log(`Parsed ${cardItems.length} cards and ${lootItems.length} monster loot/material items.`);

  const combined = [];
  const seenIds = new Set();

  function addItem(it) {
    if (!it || seenIds.has(it.id)) return;
    seenIds.add(it.id);
    combined.push(it);
  }

  // A. Priority Items (Weapons, Armor, Cards)
  const priorityIds = [
    1230, 1228, 1227, 1261, 1126, 1127, 1263, 2357, 2353, 2421, 2524, 2114, 2629, 2630, 1530,
    4047, 4054, 4143, 4128, 4005, 4008, 4131, 4025, 4147, 4148
  ];
  for (const id of priorityIds) {
    const found = equipItems.find(x => x.id === id) || cardItems.find(x => x.id === id);
    if (found) addItem(found);
  }

  // B. Add ALL Usable Items & Herbs (Potions, Herbs 507-511, Wings 601-602, Yggdrasil 607-608, Panacea, Awakening, etc.)
  for (const it of usableItems) {
    addItem(it);
  }

  // C. Add Monster Loot / Sampahan / Materials / Ore (Jellopy 909, Garlet, Scell, Zargon, Fluff, Empty Bottle 713, Oridecon 984, Elunium 985, Steel 999, Coal, Fabric, etc.)
  // Pick all classic and widely traded loot items
  for (const it of lootItems) {
    // Include all items that drop from monsters or are under ID 2000 or have drop records
    if (it.id < 2000 || it.id < 7500 || it.droppedBy.length > 0) {
      addItem(it);
    }
    if (combined.length >= 2500) break;
  }

  // D. Add Weapons & Equipments
  for (const it of equipItems) {
    addItem(it);
    if (combined.length >= 3500) break;
  }

  // E. Add All Cards
  for (const it of cardItems) {
    addItem(it);
    if (combined.length >= 4200) break;
  }

  console.log(`=== TOTAL COMPILED ITEMS: ${combined.length} ===`);

  const outputPath = path.join(__dirname, '..', 'src', 'data', 'items.json');
  fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`Successfully written database with Consumables, Herbs, Loot & Equips to: ${outputPath}`);
}

runFullScraper().catch(console.error);
