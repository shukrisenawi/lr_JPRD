import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Modal from '@/Components/Modal';

function normalize(phone) {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.startsWith('0060')) return `0${digits.slice(4)}`;
    return digits.startsWith('60') ? `0${digits.slice(2)}` : digits;
}

export default function PhoneNumber({ phone, voterId, module, children }) {
    const { verifiedPhones = [], invalidPhones = [] } = usePage().props;
    const [processing, setProcessing] = useState(false);
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const normalized = normalize(phone);
    const verified = verifiedPhones.includes(normalized);
    const invalid = invalidPhones.includes(normalized);
    if (!phone || !normalized) return children || phone || '-';

    const save = (isValid) => {
        setError('');
        setProcessing(true);
        router.put(route(`${module}.phone-verification`, voterId), { phone, verified: true, is_valid: isValid }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setShow(false),
            onError: () => setError('Status telefon tidak berjaya disimpan. Sila cuba lagi.'),
            onFinish: () => setProcessing(false),
        });
    };

    return <><span className="inline-flex items-center gap-1.5">
        <span title={verified ? 'Nombor telefon sah' : invalid ? 'Nombor telefon tidak sah' : undefined} className={verified ? 'rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200' : invalid ? 'rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200' : undefined}>
            {children || phone}{(verified || invalid) && <span className="ml-1 text-[10px]" aria-label={verified ? 'Telefon sah' : 'Telefon tidak sah'}>{verified ? '✓' : '×'}</span>}
        </span>
        {module && voterId && normalized.length >= 9 && normalized.length <= 15 && <button type="button" disabled={processing} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setError(''); setShow(true); }}
            title="Semak status nombor telefon"
            aria-label="Semak status nombor telefon"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold text-slate-400 transition hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-2.91-8.67A2 2 0 0 1 4.26 2.15h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.23 10.05a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" /></svg>
        </button>}
    </span>
        {module && voterId && <Modal show={show} maxWidth="sm" animate={false} closeable={!processing} onClose={() => setShow(false)} title="Pengesahan nombor telefon">
            <div className="p-5" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-sm font-bold text-slate-900">No. Telefon Sah atau Tidak?</h3>
                <p className="mt-2 font-mono text-sm text-slate-600">{phone}</p>
                {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
                <div className="mt-5 flex gap-2">
                    <button type="button" disabled={processing} onClick={() => save(true)} className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">No. Telefon Sah</button>
                    <button type="button" disabled={processing} onClick={() => save(false)} className="flex-1 rounded-md bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">Tidak Sah</button>
                </div>
                <button type="button" disabled={processing} onClick={() => setShow(false)} className="mt-3 w-full py-1 text-xs text-slate-500 hover:text-slate-800">Batal</button>
            </div>
        </Modal>}
    </>;
}
