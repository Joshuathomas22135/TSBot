import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function walk(dir: string, fileExtension?: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  function recurse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile()) {
        if (!fileExtension || entry.name.endsWith(fileExtension)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  recurse(dir);
  return files;
}

export function getScriptFiles(dir: string): string[] {
  return walk(dir, '.ts').concat(walk(dir, '.js'));
}