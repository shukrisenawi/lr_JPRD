import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

function normalize(phone) {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.startsWith('0060')) return `0${digits.slice(4)}`;
    return digits.startsWith('60') ? `0${digits.slice(2)}` : digits;
}

export default function PhoneNumber({ phone, voterId, module, children }) {
    const { verifiedPhones = [] } = usePage().props;
    const [processing, setProcessing] = useState(false);
    const normalized = normalize(phone);
    const verified = verifiedPhones.includes(normalized);
    if (!phone || !normalized) return children || phone || '-';

    const toggle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setProcessing(true);
        router.put(route(`${module}.phone-verification`, voterId), { phone, verified: !verified }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setProcessing(false),
        });
    };

    return <span className="inline-flex items-center gap-1.5">
        <span title={verified ? 'Nombor telefon disahkan aktif' : undefined} className={verified ? 'rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200' : undefined}>
            {children || phone}{verified && <span className="ml-1 text-[10px]" aria-label="Disahkan aktif">✓</span>}
        </span>
        {module && voterId && normalized.length >= 9 && normalized.length <= 15 && <button type="button" disabled={processing} onClick={toggle}
            title={verified ? 'Batalkan pengesahan telefon' : 'Sahkan nombor telefon aktif'}
            aria-label={verified ? 'Batalkan pengesahan telefon' : 'Sahkan nombor telefon aktif'}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border text-sm font-bold disabled:opacity-40 ${verified ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
            {processing ? '…' : verified ? '×' : '✓'}
        </button>}
    </span>;
}
