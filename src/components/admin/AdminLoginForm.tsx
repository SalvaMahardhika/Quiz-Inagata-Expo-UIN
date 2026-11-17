import React from 'react';

interface AdminLoginFormProps {
  pinInput: string;
  isVerifying: boolean;
  onChangePin: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  pinInput,
  isVerifying,
  onChangePin,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Admin</label>
        <input
          type="password"
          inputMode="numeric"
          value={pinInput}
          onChange={(e) => onChangePin(e.target.value)}
          placeholder="Masukkan PIN Admin"
          className="w-full h-10 px-3 text-center tracking-widest text-sm font-bold text-slate-900 bg-white border border-slate-300 focus:border-amber-500 rounded-xl outline-none transition-colors"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={isVerifying}
        className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
      >
        {isVerifying ? 'Memeriksa...' : 'Masuk'}
      </button>
    </form>
  );
};
