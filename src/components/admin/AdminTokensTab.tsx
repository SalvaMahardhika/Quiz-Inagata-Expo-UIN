import React, { useState } from 'react';
import { Copy, Check, Trash2, Plus } from 'lucide-react';
import { SessionToken, TokenMode } from '../../services/quizApi';

interface AdminTokensTabProps {
  tokens: SessionToken[];
  isBusy: boolean;
  copiedCode: string | null;
  onGenerate: (params: { count: number; mode: TokenMode; label: string }) => void;
  onDelete: (code: string) => void;
  onClearUsed: () => void;
  onCopyText: (text: string, id: string) => void;
  onCopyAllUnused: () => void;
}

export const AdminTokensTab: React.FC<AdminTokensTabProps> = ({
  tokens,
  isBusy,
  copiedCode,
  onGenerate,
  onDelete,
  onClearUsed,
  onCopyText,
  onCopyAllUnused,
}) => {
  const [tokenCount, setTokenCount] = useState(5);
  const [tokenMode, setTokenMode] = useState<TokenMode>('ALL');
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenFilter, setTokenFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');

  const unusedCount = tokens.filter((t) => t.status === 'UNUSED').length;
  const usedCount = tokens.filter((t) => t.status === 'USED').length;
  const filteredTokens = tokens.filter((t) => {
    if (tokenFilter === 'ALL') return true;
    return t.status === tokenFilter;
  });

  const modeBadgeLabel = (mode: TokenMode) => {
    if (mode === 'SOLO') return 'Solo';
    if (mode === 'MULTIPLAYER') return 'Kelompok';
    return 'Solo / Kelompok';
  };

  const handleSubmitGenerate = () => {
    onGenerate({ count: tokenCount, mode: tokenMode, label: tokenLabel.trim() });
    setTokenLabel('');
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900">
            Buat Token Baru (1 Token = 1 Sesi)
          </h4>
          <span className="text-[11px] font-medium text-amber-800">
            Berlaku di semua perangkat
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Mode Sesi
            </label>
            <select
              value={tokenMode}
              onChange={(e) => setTokenMode(e.target.value as TokenMode)}
              className="w-full h-9 px-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
            >
              <option value="ALL">Solo / Kelompok</option>
              <option value="SOLO">Khusus Solo</option>
              <option value="MULTIPLAYER">Khusus Kelompok</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Jumlah Token
            </label>
            <select
              value={tokenCount}
              onChange={(e) => setTokenCount(Number(e.target.value))}
              className="w-full h-9 px-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
            >
              <option value={1}>1 Token</option>
              <option value={5}>5 Token</option>
              <option value={10}>10 Token</option>
              <option value={20}>20 Token</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Label (Opsional)
            </label>
            <input
              type="text"
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
              placeholder="Misal: Booth A"
              className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmitGenerate}
          disabled={isBusy}
          className="w-full h-9 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs border-b-2 border-amber-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isBusy ? 'Membuat...' : `Generate ${tokenCount} Token`}</span>
        </button>
      </div>

      {/* Filter & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['ALL', 'UNUSED', 'USED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTokenFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                tokenFilter === f
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'ALL'
                ? `Semua (${tokens.length})`
                : f === 'UNUSED'
                ? `Tersedia (${unusedCount})`
                : `Terpakai (${usedCount})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCopyAllUnused}
            className="px-2.5 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            {copiedCode === 'ALL_UNUSED' ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>Salin Tersedia</span>
          </button>
          {usedCount > 0 && (
            <button
              type="button"
              onClick={onClearUsed}
              className="px-2.5 py-1.5 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
            >
              Hapus Terpakai
            </button>
          )}
        </div>
      </div>

      {/* Token List */}
      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Belum ada token. Klik Generate Token di atas untuk membuat.
          </div>
        ) : (
          filteredTokens.map((t) => (
            <div
              key={t.code}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
                t.status === 'USED'
                  ? 'bg-slate-50 border-slate-200 opacity-75'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-sm font-black tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                  {t.code}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.status === 'UNUSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.status === 'UNUSED' ? 'Tersedia' : 'Terpakai'}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      {modeBadgeLabel(t.mode)}
                    </span>
                    {t.label && (
                      <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                        · {t.label}
                      </span>
                    )}
                  </div>
                  {t.status === 'USED' && (
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      Dipakai {t.usedBy} (
                      {t.usedMode === 'MULTIPLAYER'
                        ? `Kelompok PIN ${t.roomCode || '-'}`
                        : 'Solo'}
                      )
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {t.status === 'UNUSED' && (
                  <button
                    type="button"
                    onClick={() => onCopyText(t.code, t.code)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    title="Salin Token"
                  >
                    {copiedCode === t.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(t.code)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Hapus Token"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
