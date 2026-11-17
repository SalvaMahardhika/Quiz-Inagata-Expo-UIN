const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function fisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createRandomTokenCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
  }
  return code;
}

export function generateUniqueRoomCode(existingCodes: Set<string> | Map<string, unknown>): string {
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existingCodes.has(code));
  return code;
}
