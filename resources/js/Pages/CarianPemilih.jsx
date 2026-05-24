import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const bot = 'SSDP_Kedah_Bot';
function cmd(v, p) { const n = v?.no_kp || v?.old_ic || ''; return n ? `/${p} ${n}` : ''; }

function UserIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function MapPinIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function ChevronRightIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

function XIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function SearchIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

function ResultCard({ voter, onClear, onOpenTelegram, tgReady }) {
    if (!voter) return null;
    const fields = [
        ['Nama', voter.name], ['No. IC Baru', voter.no_kp || '-'], ['No. IC Lama', voter.old_ic || '-'],
        ['Umur', voter.age ?? '-'], ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm], ['Lokaliti', voter.locality], ['Jantina', voter.gender],
        ['Bangsa', voter.race], ['Status Culaan', voter.cula_display_label || voter.cula_code], ['Alamat', voter.address],
    ];

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="label-section">Detail Pemilih</p>
                    <h3 className="truncate text-sm font-bold uppercase leading-tight text-slate-800">{voter.name}</h3>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {!voter.is_manual && <>
                        <button onClick={() => onOpenTelegram(voter, 'kemascula')} disabled={!tgReady} className="btn-primary">Kemas Cula</button>
                        <button onClick={() => onOpenTelegram(voter, 'kemastel')} disabled={!tgReady} className="btn-emerald">Kemaskini Tel</button>
                    </>}
                    <button onClick={onClear} className="rounded-md bg-slate-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-500">Buang</button>
                </div>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
                {fields.map(([l, v]) => (
                    <div key={l} className="rounded-md border border-slate-100 bg-white px-2.5 py-1.5">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-700">{l}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-800">{v || '-'}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SearchPanel() {
    const [q, setQ] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [err, setErr] = useState('');
    const [openingTg, setOpeningTg] = useState(false);
    const ac = useRef(null);
    const rid = useRef(0);
    useEffect(() => () => ac.current?.abort(), []);

    const handleChange = async (e) => {
        const nq = e.target.value;
        setQ(nq); setSelected(null); setErr('');
        ac.current?.abort();
        if (nq.trim().length < 2) { setSuggestions([]); setSearching(false); return; }

        const reqId = ++rid.current;
        const c = new AbortController();
        ac.current = c;
        setSearching(true);

        try {
            const res = await fetch(`${route('carian-pemilih.search')}?q=${encodeURIComponent(nq)}`, { headers: { Accept: 'application/json' }, signal: c.signal });
            const ct = res.headers.get('content-type') ?? '';
            if (res.redirected || !res.ok || !ct.includes('application/json')) throw new Error();
            const p = await res.json();
            if (rid.current === reqId) { setSuggestions(p.suggestions ?? []); setErr(''); }
        } catch (error) {
            if (error.name !== 'AbortError') { setSuggestions([]); setErr('Carian gagal. Sila cuba lagi.'); }
        } finally { if (rid.current === reqId) setSearching(false); }
    };

    const pick = (voter) => {
        ac.current?.abort(); rid.current += 1; setSearching(false); setSuggestions([]); setQ(voter.name ?? ''); setSelected(voter);
    };

    const openTg = async (voter, prefix) => {
        const c = cmd(voter, prefix);
        if (!c) { setErr('No. IC tidak tersedia.'); return; }
        const w = window.open('about:blank', '_blank');
        setOpeningTg(true);
        try { w?.location.replace(`tg://resolve?domain=${bot}&text=${encodeURIComponent(c)}`); } catch { w?.close(); setErr('Telegram gagal dibuka.'); }
        finally { setOpeningTg(false); }
    };

    const clearSearch = () => {
        ac.current?.abort();
        rid.current += 1;
        setQ('');
        setSuggestions([]);
        setSelected(null);
        setSearching(false);
        setErr('');
    };

    return (
        <>
            <section className="card relative">
                <div className="px-4 py-3">
                    <p className="label-section">Carian Pemilih</p>
                    <p className="text-muted mt-0.5">Cari nama, IC atau nombor telefon.</p>
                    <div className="relative mt-2">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={q} onChange={handleChange} placeholder="Ali, 900101025555, 0123456789" className="input-field py-2 pl-10 pr-10 focus:ring-2" />
                        {q && (
                            <button type="button" onClick={clearSearch} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100">
                                <XIcon className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                    {err && <p className="mt-1 text-xs font-bold text-rose-500">{err}</p>}
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                        {searching ? (
                            <div className="px-3 py-2 text-xs font-medium text-slate-500">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => (
                                <button key={voter.id} onClick={() => pick(voter)}
                                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_minmax(8rem,0.9fr)_auto] items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-left transition hover:bg-green-50 last:border-b-0">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                                        <UserIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-800">{voter.name}</p>
                                        <p className="text-xs font-medium text-slate-500">IC: {voter.no_kp || '-'} <span className="mx-1 text-slate-300">|</span> HP: {voter.phone_mobile || '-'}</p>
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-800">{voter.dm || '-'}</p>
                                        <p className="truncate text-xs font-medium text-slate-500">{voter.locality || '-'}</p>
                                    </div>
                                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </section>

            <ResultCard voter={selected} onClear={() => { clearSearch(); setOpeningTg(false); }}
                onOpenTelegram={openTg} tgReady={!openingTg && Boolean(cmd(selected, 'kemascula'))} />
        </>
    );
}

export default function CarianPemilih() {
    return (
        <AuthenticatedLayout header={
            <div>
                <p className="label-section">Carian Pemilih</p>
                <h2 className="mt-0.5 heading-lg">Semak detail pemilih</h2>
                <p className="text-muted mt-0.5">Cari maklumat pemilih tanpa mengganggu laporan graf.</p>
            </div>
        }>
            <Head title="Carian Pemilih" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                <SearchPanel />
            </div>
        </AuthenticatedLayout>
    );
}
