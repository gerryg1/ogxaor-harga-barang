import fs from 'fs';
import path from 'path';

const RATHENA_DIR = path.join(process.cwd(), 'src', 'data', 'rathena');

let cachedDb = null;
let dropMap = null;

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

function initDropMap() {
  if (dropMap) return dropMap;
  dropMap = new Map();
  const mobFile = path.join(RATHENA_DIR, 'mob_db.yml');
  if (!fs.existsSync(mobFile)) return dropMap;

  try {
    const text = fs.readFileSync(mobFile, 'utf-8');
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
  } catch (err) {
    console.error('Error loading mob_db in search:', err);
  }

  return dropMap;
}

function parseChunk(chunk, type, drops) {
  const idMatch = chunk.match(/^(\d+)/);
  if (!idMatch) return null;
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

  const resolvedType = typeMatch ? typeMatch[1].trim() : type;
  const subType = subTypeMatch ? subTypeMatch[1].trim() : (resolvedType === 'Card' ? 'Card' : resolvedType);

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

  const mobDrops = drops.get(aegisName.toLowerCase()) || [];

  let desc = '';
  if (script) {
    desc = `Efek: ${script.slice(0, 200)}...`;
  } else if (resolvedType === 'Healing' || resolvedType === 'Usable') {
    desc = `Item pemulihan & konsumsi Ragnarok (${name}).`;
  } else if (resolvedType === 'Card') {
    desc = `Kartu monster Ragnarok Online (${name}).`;
  } else if (resolvedType === 'Etc') {
    desc = `Bahan material / barang tempa / loot jarahan (${name}).`;
  } else {
    desc = `Perlengkapan Ragnarok Online (${name}).`;
  }

  return {
    id,
    name,
    subtype: subType ? `[${subType}]` : `[${resolvedType}]`,
    aegisName,
    type: resolvedType,
    class: subType || resolvedType,
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
    itemScript: script ? `{ ${script.slice(0, 160)} }` : '{}',
    droppedBy: mobDrops,
    enchantment: slots > 0 ? 'Socket Enchantable' : (resolvedType === 'Card' ? 'Card Compound' : 'None'),
    images: {
      icon: `https://static.divine-pride.net/images/items/item/${id}.png`,
      collection: `https://static.divine-pride.net/images/items/collection/${id}.png`,
      rmsIcon: `https://ratemyserver.net/item_gfx/${id}.gif`
    }
  };
}

export function searchRathenaDb(query, limit = 50) {
  if (!query || !query.trim()) return [];

  const drops = initDropMap();
  const qClean = query.trim().toLowerCase();
  const isNumeric = /^\d+$/.test(qClean);
  const targetId = isNumeric ? parseInt(qClean, 10) : null;

  // Words for regex matching
  const words = qClean.split(/\s+/).filter(Boolean);
  const regex = new RegExp(words.map(w => `(?=.*${w})`).join(''), 'i');

  const files = [
    { file: 'item_db_equip.yml', type: 'Equipment' },
    { file: 'item_db_usable.yml', type: 'Usable' },
    { file: 'item_db_etc.yml', type: 'Etc' }
  ];

  const results = [];
  const seenIds = new Set();

  for (const { file, type } of files) {
    const filePath = path.join(RATHENA_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, 'utf-8');
    const chunks = text.split(/\n  - Id:\s+/);

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (isNumeric) {
        if (!chunk.startsWith(String(targetId) + '\n') && !chunk.startsWith(String(targetId) + '\r')) {
          continue;
        }
      } else {
        // Quick string check
        const match = regex.test(chunk);
        if (!match) continue;
      }

      const parsed = parseChunk(chunk, type, drops);
      if (parsed && !seenIds.has(parsed.id)) {
        // If not numeric, ensure name or aegis matches
        if (!isNumeric) {
          const searchable = `${parsed.name} ${parsed.aegisName} ${parsed.type}`.toLowerCase();
          const allWordsMatch = words.every(w => searchable.includes(w));
          if (!allWordsMatch) continue;
        }

        seenIds.add(parsed.id);
        results.push(parsed);
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
