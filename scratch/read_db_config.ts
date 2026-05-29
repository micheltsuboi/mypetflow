import fs from 'fs';
import path from 'path';

const envPath = path.resolve('/Users/micheltsuboi/Documents/MY PET FLOW/.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(l => {
    const parts = l.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      // Omit sensitive data partially
      console.log(`${key}: ${val ? (val.substring(0, 12) + '...') : 'empty'}`);
    }
  });
} else {
  console.log('No .env.local found at path.');
}
