import { TeacherQuizRecord, getAllQuizRecords } from '../utils/storage';

export function exportRecordsToCSV(customRecords?: TeacherQuizRecord[]): boolean {
  const records = customRecords ?? getAllQuizRecords();
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
