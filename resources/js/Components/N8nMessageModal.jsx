import { useRef } from 'react';

const quickMessageIcons = ['📌', '♦️', '🟩', '🌸', '▪️', '✅', '❌', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

export default function N8nMessageModal({ open, message, onChange, onClose, onSend, sending, error, title = 'Semak mesej culaan', description = 'Edit teks jika perlu sebelum approve dan hantar.' }) {
    const textareaRef = useRef(null);

    if (!open) return null;

    const insertIcon = (icon) => {
        const textarea = textareaRef.current;
        const start = textarea?.selectionStart ?? message.length;
        const end = textarea?.selectionEnd ?? start;
        const nextMessage = `${message.slice(0, start)}${icon}${message.slice(end)}`;
        onChange(nextMessage);

        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + icon.length, start + icon.length);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="n8n-message-title">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-green-700">n8n</p>
                        <h3 id="n8n-message-title" className="mt-0.5 text-base font-bold text-slate-900">{title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{description}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">&times;</button>
                </div>
                <textarea
                    value={message}
                    onChange={(e) => onChange(e.target.value)}
                    ref={textareaRef}
                    rows={18}
                    className="input-field mt-4 min-h-[22rem] w-full resize-y whitespace-pre-wrap font-mono text-xs leading-5"
                />
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Icon pantas</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {quickMessageIcons.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                title={`Masukkan ${icon}`}
                                aria-label={`Masukkan ${icon}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertIcon(icon)}
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-slate-200 bg-white px-1.5 text-base transition hover:border-green-300 hover:bg-green-50"
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Klik icon untuk masukkan pada posisi kursor.</p>
                </div>
                {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={sending} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Batal</button>
                    <button type="button" onClick={onSend} disabled={sending || !message.trim()} className="rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-green-600 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Menghantar...' : 'Approve & Hantar'}</button>
                </div>
            </div>
        </div>
    );
}
