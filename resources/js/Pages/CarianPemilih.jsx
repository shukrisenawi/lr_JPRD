import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const bot = 'SSDP_Kedah_Bot';
function cmd(v, p) { const n = v?.no_kp || v?.old_ic || ''; return n ? `/${p} ${n}` : ''; }

function ResultCard({ voter, onClear, onOpenTelegram, tgReady }) {
    if (!voter) return null;
    const fields = [
        ['Nama', voter.name], ['No. IC Baru', voter.no_kp || '-'], ['No. IC Lama', voter.old_ic || '-'],
        ['Umur', voter.age ?? '-'], ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm], ['Lokaliti', voter.locality], ['Jantina', voter.gender],
        ['Bangsa', voter.race], ['Status Culaan', voter.cula_display_label || voter.cula_code], ['Alamat', voter.address],
    ];

    return (
        <section className="card-accent">
            <div className="flex flex-col gap-3 border-b border-slate-700/60 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="label-section">Detail Pemilih</p>
                    <h3 className="mt-0.5 heading-lg">{voter.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => onOpenTelegram(voter, 'kemascula')} disabled={!tgReady} className="btn-primary">Kemas Cula</button>
                    <button onClick={() => onOpenTelegram(voter, 'kemastel')} disabled={!tgReady} className="btn-emerald">Kemaskini Tel</button>
                    <button onClick={onClear} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-600">Buang</button>
                </div>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
                {fields.map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-slate-800/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{l}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-200">{v}</p>
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

    return (
        <>
            <section className="card relative">
                <div className="px-4 py-3">
                    <p className="label-section">Carian Pemilih</p>
                    <p className="text-muted mt-0.5">Cari nama, IC atau nombor telefon.</p>
                    <input type="search" value={q} onChange={handleChange} placeholder="Ali, 900101025555, 0123456789" className="input-field mt-2" />
                    {err && <p className="mt-1.5 text-xs font-bold text-rose-400">{err}</p>}
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-3 right-3 z-20 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                        {searching ? (
                            <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => (
                                <button key={voter.id} onClick={() => pick(voter)}
                                    className="flex w-full items-start justify-between gap-3 border-b border-slate-700/50 px-3 py-2.5 text-left transition hover:bg-violet-500/10 last:border-b-0">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white">{voter.name}</p>
                                        <p className="mt-0.5 text-[10px] text-slate-400">IC: {voter.no_kp || '-'} | HP: {voter.phone_mobile || '-'}</p>
                                    </div>
                                    <div className="shrink-0 text-right text-[10px] text-slate-500">
                                        <p>{voter.dm}</p>
                                        <p className="mt-0.5">{voter.locality}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </section>

            <ResultCard voter={selected} onClear={() => { setSelected(null); setQ(''); setSuggestions([]); setSearching(false); setOpeningTg(false); }}
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
