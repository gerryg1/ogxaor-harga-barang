/**
 * rAthena & Divine-Pride Scraper Script
 * Fetches item databases from rAthena's official GitHub repository,
 * parses stats, scripts, and descriptions, and combines with Divine Pride CDN image links.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RATHENA_BASE_URL = 'https://raw.githubusercontent.com/rathena/rathena/master/db/re';

export function getDivinePrideImages(itemId) {
  return {
    icon: `https://static.divine-pride.net/images/items/item/${itemId}.png`,
    collection: `https://static.divine-pride.net/images/items/collection/${itemId}.png`,
    card: `https://static.divine-pride.net/images/items/cards/${itemId}.png`
  };
}

export async function fetchRathenaYaml(filename) {
  const url = `${RATHENA_BASE_URL}/${filename}`;
  console.log(`Fetching from rAthena: ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    return yaml.load(text);
  } catch (err) {
    console.error(`Failed to fetch ${filename}:`, err.message);
    return null;
  }
}

// Function to run scraper and output formatted JSON
export async function runScraper() {
  console.log('--- Starting rAthena & Divine Pride Scraping ---');
  
  const equipData = await fetchRathenaYaml('item_db_equip.yml');
  const items = [];

  if (equipData && equipData.Body) {
    console.log(`Loaded ${equipData.Body.length} equip items from rAthena.`);
    
    // Pick iconic/popular sample items
    for (const entry of equipData.Body.slice(0, 150)) {
      const id = entry.Id;
      const images = getDivinePrideImages(id);
      
      items.push({
        id: id,
        name: entry.AegisName?.replace(/_/g, ' ') || `Item ${id}`,
        aegisName: entry.AegisName || '',
        type: entry.Type || 'Armor',
        subtype: entry.SubType || '',
        class: entry.SubType || entry.Type || '',
        buy: entry.Buy || 20,
        sell: entry.Sell || 10,
        weight: (entry.Weight || 0) / 10,
        attack: entry.Attack || 0,
        magicAttack: entry.MagicAttack || 0,
        defense: entry.Defense || 0,
        requiredLvl: entry.EquipLevelMin || 1,
        weaponLvl: entry.WeaponLevel || 0,
        slot: entry.Slots || 0,
        applicableJobs: entry.Jobs ? Object.keys(entry.Jobs).join(', ') : 'All Jobs',
        description: entry.Script ? `rAthena Script: ${entry.Script}` : 'Standard rAthena equipment.',
        itemScript: entry.Script || '{}',
        droppedBy: [],
        images: images
      });
    }
  }

  const outputPath = path.resolve(__dirname, '../src/data/items.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`Scraper successfully saved ${items.length} items to: ${outputPath}`);
}

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScraper();
}
