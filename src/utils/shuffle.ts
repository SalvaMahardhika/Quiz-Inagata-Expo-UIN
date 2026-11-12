/**
 * Algoritma Fisher-Yates Shuffle (Knuth Shuffle)
 * Digunakan untuk:
 * 1. Mengacak seluruh bank soal pada topik terpilih, lalu mengambil 10 soal pertama.
 * 2. Mengacak urutan 4 pilihan jawaban (A, B, C, D) pada setiap soal.
 */

import { RawQuestion } from '../data/bankSoal';

export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface PreparedTeacherQuestion {
  kode: string;
  pertanyaan: string;
  gambar: string;
  options: string[];
  correctAnswerText: string;
}

/**
 * Mengacak bank soal topik, mengambil 10 soal pertama, dan mengacak 4 opsi jawaban tiap soal
 */
export function prepareTeacherQuiz(rawQuestions: RawQuestion[]): PreparedTeacherQuestion[] {
  // 1. Acak seluruh soal di bank soal topik
  const shuffledQuestions = fisherYatesShuffle(rawQuestions);

  // 2. Ambil tepat 10 soal pertama
  const selectedTen = shuffledQuestions.slice(0, 10);

  // 3. Acak 4 pilihan jawaban pada masing-masing soal
  return selectedTen.map((q) => {
    const correctText = q.pilihan[q.jawabanBenar];
    const shuffledOptions = fisherYatesShuffle([...q.pilihan]);

    return {
      kode: q.kode,
      pertanyaan: q.pertanyaan,
      gambar: q.gambar || "",
      options: shuffledOptions,
      correctAnswerText: correctText,
    };
  });
}
