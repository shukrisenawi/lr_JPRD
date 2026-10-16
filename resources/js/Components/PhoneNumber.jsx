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
    const [showClear, setShowClear] = useState(false);
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

    const clearStatus = () => {
        setProcessing(true);
        router.put(route(`${module}.phone-verification`, voterId), { phone, verified: false }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setShowClear(false),
            onFinish: () => setProcessing(false),
        });
    };

    return <><span className="inline-flex items-center gap-1.5">
        <span title={verified ? 'Nombor telefon sah' : invalid ? 'Nombor telefon tidak sah' : undefined} className={verified ? 'rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200' : invalid ? 'rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200' : undefined}>
            {children || phone}{(verified || invalid) && <span className="ml-1 text-[10px]" aria-label={verified ? 'Telefon sah' : 'Telefon tidak sah'}>{verified ? '✓' : '×'}</span>}
        </span>
        {module && voterId && normalized.length >= 9 && normalized.length <= 15 && <button type="button" disabled={processing} onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (verified || invalid) { setShowClear(true); } else { setError(''); setShow(true); } }}
            title={verified || invalid ? 'Buang status nombor telefon' : 'Semak status nombor telefon'}
            aria-label={verified || invalid ? 'Buang status nombor telefon' : 'Semak status nombor telefon'}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold text-slate-400 transition hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-40">
            <span aria-hidden="true">{verified || invalid ? '×' : '?'}</span>
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
        {module && voterId && <Modal show={showClear} maxWidth="sm" animate={false} closeable={!processing} onClose={() => setShowClear(false)} title="Buang status nombor telefon">
            <div className="p-5" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-sm font-bold text-slate-900">Buang status nombor telefon?</h3>
                <p className="mt-2 font-mono text-sm text-slate-600">{phone}</p>
                <p className="mt-2 text-xs text-slate-500">Status Sah/Tidak Sah akan dibuang. Nombor telefon tidak akan dipadam.</p>
                <div className="mt-5 flex gap-2">
                    <button type="button" disabled={processing} onClick={() => setShowClear(false)} className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Batal</button>
                    <button type="button" disabled={processing} onClick={clearStatus} className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">Ya, buang status</button>
                </div>
            </div>
        </Modal>}
    </>;
}
