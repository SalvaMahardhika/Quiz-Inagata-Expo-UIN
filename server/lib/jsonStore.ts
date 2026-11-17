import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.resolve(__dirname, '..', '.quiz-data');
export const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
export const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
export const SPREADSHEET_CONFIG_FILE = path.join(DATA_DIR, 'spreadsheet-config.json');
export const PARTICIPANT_SHEET_CONFIG_FILE = path.join(DATA_DIR, 'participant-sheet-config.json');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Gagal membaca ${filePath}:`, err);
    return fallback;
  }
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Gagal menulis ${filePath}:`, err);
  }
}
