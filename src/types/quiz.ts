export const GOOGLE_SCRIPT_URL: string =
  'https://script.google.com/macros/s/AKfycbwuZZLFO8k7mHoXpjuKfaG7LbXOxfmxPhYIZg5qIJAgkZlEySfY6aHjbGrayx5aZVG9QQ/exec';

export const ADMIN_PIN: string = '1234';

export interface RawQuestion {
  kode: string;
  pertanyaan: string;
  gambar: string;
  pilihan: [string, string, string, string];
  jawabanBenar: number;
}

export interface TopicPackage {
  id: number;
  sheetName?: string;
  nama: string;
  judul: string;
  ikon: string;
  deskripsi: string;
  warnaAksen: string;
  soal: RawQuestion[];
}
