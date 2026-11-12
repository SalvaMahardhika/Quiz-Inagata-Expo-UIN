/**
 * Manajemen Penyimpanan Data Peserta Kuis Guru Expo UIN
 * - LocalStorage browser
 * - Background Sync ke Google Apps Script / Google Sheets
 * - Export data ke CSV (Excel-compatible dengan UTF-8 BOM)
 */

import { GOOGLE_SCRIPT_URL } from '../data/bankSoal';

export interface TeacherQuizRecord {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // formatted WIB date
  name: string;
  institution: string;
  phone: string;
  topicId: number;
  topicName: string;
  score: number; // 0 - 100
  totalQuestions: number;
  correctCount: number;
  timedOutCount: number;
}

const STORAGE_KEY = 'QUIZ_INAGATA_RECORDS_V1';
const LEGACY_STORAGE_KEY = 'EXPO_UIN_GURU_RECORDS_V1';

/**
 * Mengambil seluruh data peserta kuis dari localStorage
 */
export function getAllQuizRecords(): TeacherQuizRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Gagal membaca data riwayat dari localStorage:', err);
    return [];
  }
}

/**
 * Menyimpan data peserta baru (Dual Backup)
 */
export function saveTeacherQuizRecord(
  data: Omit<TeacherQuizRecord, 'id' | 'timestamp' | 'formattedDate'>
): TeacherQuizRecord {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now);

  const newRecord: TeacherQuizRecord = {
    id: 'guru_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: now.toISOString(),
    formattedDate,
    ...data,
  };

  // 1. Simpan ke LocalStorage
  try {
    const currentList = getAllQuizRecords();
    const updatedList = [newRecord, ...currentList];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Gagal menyimpan ke localStorage:', err);
  }

  // 2. Background Sync ke Google Sheets jika GOOGLE_SCRIPT_URL diisi
  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== '') {
    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waktu: newRecord.formattedDate,
          nama: newRecord.name,
          instansi: newRecord.institution,
          noHp: newRecord.phone,
          topik: newRecord.topicName,
          skor: newRecord.score,
          benar: newRecord.correctCount,
          waktuHabis: newRecord.timedOutCount,
          total: newRecord.totalQuestions,
        }),
      }).catch((err) => {
        console.warn('Background sync ke Google Sheets gagal (tersimpan aman di localStorage):', err);
      });
    } catch (err) {
      console.warn('Error saat inisiasi background fetch:', err);
    }
  }

  return newRecord;
}

/**
 * Mengambil Top 10 Skor Tertinggi
 */
export function getTopLeaderboard(limit = 10): TeacherQuizRecord[] {
  const all = getAllQuizRecords();
  return all
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, limit);
}

/**
 * Ekspor semua data peserta ke format CSV (Excel Friendly dengan UTF-8 BOM)
 */
export function exportRecordsToCSV(): boolean {
  const records = getAllQuizRecords();
  if (records.length === 0) {
    return false;
  }

  const headers = [
    'No',
    'Waktu',
    'Nama Peserta',
    'Asal Instansi / Sekolah',
    'Nomor HP / WhatsApp',
    'Topik Soal',
    'Nilai Akhir (0-100)',
    'Jumlah Benar',
    'Waktu Habis / Salah',
    'Total Soal',
  ];

  const rows = records.map((r, index) => [
    index + 1,
    `"${r.formattedDate.replace(/"/g, '""')}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${r.institution.replace(/"/g, '""')}"`,
    `"${r.phone.replace(/"/g, '""')}"`,
    `"${r.topicName.replace(/"/g, '""')}"`,
    r.score,
    r.correctCount,
    r.totalQuestions - r.correctCount,
    r.totalQuestions,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Data_Peserta_Quiz_Inagata_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Reset seluruh riwayat kuis lokal (khusus Admin booth via verifikasi PIN)
 */
export function clearAllRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Gagal mereset data:', err);
  }
}
