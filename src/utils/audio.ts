/**
 * Web Audio API - Sintesis Efek Suara Profesional Edu-Tech
 * Berjalan sepenuhnya di sisi klien tanpa file audio eksternal.
 */

let audioCtx: AudioContext | null = null;
let isMuted: boolean = false;

// Load mute preference from localStorage
try {
  const savedMute = localStorage.getItem('QUIZ_INAGATA_MUTED') || localStorage.getItem('EXPO_GURU_QUIZ_MUTED');
  if (savedMute !== null) {
    isMuted = savedMute === 'true';
  }
} catch {
  // ignore
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getIsMuted(): boolean {
  return isMuted;
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
  try {
    localStorage.setItem('QUIZ_INAGATA_MUTED', String(muted));
  } catch {
    // ignore
  }
}

export function toggleMuted(): boolean {
  setMuted(!isMuted);
  return isMuted;
}

/**
 * Suara Detak Halus Timer Kritis (saat sisa waktu <= 2 detik)
 */
export function playTickSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5 crisp tick
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Nada Naik Ceria & Profesional saat Jawaban Benar
 */
export function playCorrectSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    gain.gain.setValueAtTime(0, now + idx * 0.07);
    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.22);
  });
}

/**
 * Nada Lembut saat Jawaban Salah atau Waktu Habis
 */
export function playWrongSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Efek Suara Tombol Halus
 */
export function playClickSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(550, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * Fanfare Singkat saat Skor Akhir Muncul
 */
export function playFanfareSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const fanfareNotes = [
    { freq: 523.25, time: 0.0, dur: 0.12 },
    { freq: 659.25, time: 0.12, dur: 0.12 },
    { freq: 783.99, time: 0.24, dur: 0.14 },
    { freq: 1046.5, time: 0.38, dur: 0.25 },
  ];

  fanfareNotes.forEach((item) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(item.freq, now + item.time);

    gain.gain.setValueAtTime(0, now + item.time);
    gain.gain.linearRampToValueAtTime(0.2, now + item.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + item.time + item.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + item.time);
    osc.stop(now + item.time + item.dur + 0.05);
  });

  // Chord penutup
  [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + 0.65);

    gain.gain.setValueAtTime(0, now + 0.65);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.67);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + 0.65);
    osc.stop(now + 1.55);
  });
}
