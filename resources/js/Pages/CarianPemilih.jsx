import AvatarLightbox from '@/Components/AvatarLightbox';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
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

function NoAhliModal({ voter, onClose, onSaved }) {
    const [value, setValue] = useState(voter?.no_ahli || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!voter) return;
        setSaving(true);
        try {
            const res = await fetch(route('carian-pemilih.update-no-ahli'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: JSON.stringify({ record_id: voter.record_id, no_ahli: value }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `HTTP ${res.status}`);
            }
            const data = await res.json();
            if (data.success) {
                onSaved(value);
                onClose();
            } else {
                alert(data.message || 'Gagal mengemaskini No. Ahli.');
            }
        } catch (e) {
            alert('Gagal mengemaskini No. Ahli.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="mb-3 text-sm font-bold text-slate-800">Kemaskini No. Ahli</h3>
                <p className="mb-2 text-xs text-slate-500">{voter?.name}</p>
                <input type="text" value={value} onChange={e => setValue(e.target.value)} className="input-field w-full text-xs" placeholder="Masukkan No. Ahli" autoFocus />
                <div className="mt-3 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300">Batal</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
            </div>
        </div>
    );
}

function ResultCard({ voter, onClear, onOpenTelegram, tgReady, onUpdateNoAhli, canEditNoAhli, isCulaPending, onCulaSiap }) {
    const [avatarUrl, setAvatarUrl] = useState(voter?.avatar_url || null);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [uploading, setUploading] = useState(false);
    const avatarRef = useRef(null);
    if (!voter) return null;

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!voter.record_id) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', voter.record_id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.success) {
                setAvatarUrl(data.avatar_url + '&t=' + Date.now());
                voter.avatar_url = data.avatar_url;
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploading(false);
        }
    };

    const fields = [
        ['Nama', voter.name], ['No KP', voter.no_kp || '-'],
        ['No. Ahli', voter.no_ahli || '-'], ['Umur', voter.age ?? '-'], ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm], ['Lokaliti', voter.locality], ['Bangsa', voter.race], ['Status Culaan', voter.cula_display_label || voter.cula_code], ['Alamat', voter.address],
    ];

    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="h-10 w-10 cursor-pointer rounded-full object-cover border border-slate-200" onClick={() => setLightboxSrc(avatarUrl)} />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 border border-slate-200">
                                <UserIcon className="h-5 w-5" />
                            </div>
                        )}
                        {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
                    </div>
                    <div className="min-w-0">
                        <p className="label-section">Detail Pemilih</p>
                        <h3 className="truncate text-sm font-bold uppercase leading-tight text-slate-800">{voter.name}</h3>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {!voter.is_manual && <>
                        <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        <button onClick={() => avatarRef.current?.click()} disabled={uploading || !voter.record_id} className="btn-outline" title="Muat Naik Avatar">{uploading ? <span className="text-xs font-bold">...</span> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>}</button>
                        {isCulaPending ? (
                            <button onClick={() => onCulaSiap(voter)} className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500">Siap Cula</button>
                        ) : (
                            <button onClick={() => onOpenTelegram(voter, 'kemascula')} disabled={!tgReady} className="btn-primary">Kemas Cula</button>
                        )}
                        <button onClick={() => onOpenTelegram(voter, 'kemastel')} disabled={!tgReady} className="btn-emerald">Kemaskini Tel</button>
                        {canEditNoAhli && <button onClick={() => onUpdateNoAhli(voter)} className="btn-primary">Kemaskini No Ahli</button>}
                    </>}
                    <button onClick={onClear} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-600 text-white shadow-sm transition hover:bg-slate-500" title="Tutup"><XIcon className="h-3.5 w-3.5" /></button>
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
        const { auth, available_cula_codes: initialCulaCodes, available_dms, localities_by_dm } = usePage().props;
        const canEditNoAhli = auth.user?.allowed_modules?.includes('kemaskini-no-ahli');

    const [q, setQ] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [err, setErr] = useState('');
    const isUdmLevel = auth.user?.access_level === 'udm';
    const isCawanganLevel = auth.user?.access_level === 'cawangan';
    const [selectedDm, setSelectedDm] = useState('');
    const [selectedLocality, setSelectedLocality] = useState('');
    const [openingTg, setOpeningTg] = useState(false);
    const [editNoAhli, setEditNoAhli] = useState(null);
    const [flash, setFlash] = useState('');
    const [culaPendingIds, setCulaPendingIds] = useState(new Set());
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [showCulaModal, setShowCulaModal] = useState(false);
    const ac = useRef(null);
    const rid = useRef(0);
    useEffect(() => () => ac.current?.abort(), []);
    useEffect(() => { if (flash) { const t = setTimeout(() => setFlash(''), 2000); return () => clearTimeout(t); } }, [flash]);

    const fetchSuggestions = async (searchQ, dm, locality) => {
        ac.current?.abort();
        if (searchQ.trim().length < 2) { setSuggestions([]); setSearching(false); return; }

        const reqId = ++rid.current;
        const c = new AbortController();
        ac.current = c;
        setSearching(true);

        try {
            const params = new URLSearchParams({ q: searchQ });
            if (dm) params.set('dm', dm);
            if (locality) params.set('locality', locality);
            const res = await fetch(`${route('carian-pemilih.search')}?${params.toString()}`, { headers: { Accept: 'application/json' }, signal: c.signal });
            const ct = res.headers.get('content-type') ?? '';
            if (res.redirected || !res.ok || !ct.includes('application/json')) throw new Error();
            const p = await res.json();
            if (rid.current === reqId) { setSuggestions(p.suggestions ?? []); setErr(''); }
        } catch (error) {
            if (error.name !== 'AbortError') { setSuggestions([]); setErr('Carian gagal. Sila cuba lagi.'); }
        } finally { if (rid.current === reqId) setSearching(false); }
    };

    const handleChange = async (e) => {
        const nq = e.target.value;
        setQ(nq); setSelected(null); setErr('');
        fetchSuggestions(nq, selectedDm, selectedLocality);
    };

    useEffect(() => {
        if (q.trim().length >= 2) {
            setSelected(null);
            fetchSuggestions(q, selectedDm, selectedLocality);
        }
    }, [selectedDm, selectedLocality]);

    const pick = (voter) => {
        ac.current?.abort(); rid.current += 1; setSearching(false); setSuggestions([]); setQ(voter.name ?? ''); setSelected(voter);
    };

    const openTg = async (voter, prefix) => {
        const c = cmd(voter, prefix);
        if (!c) { setErr('No Kp tidak tersedia.'); return; }
        const w = window.open('about:blank', '_blank');
        setOpeningTg(true);
        try { w?.location.replace(`tg://resolve?domain=${bot}&text=${encodeURIComponent(c)}`); } catch { w?.close(); setErr('Telegram gagal dibuka.'); }
        finally { setOpeningTg(false); }
        if (prefix === 'kemascula') {
            setCulaPendingIds((prev) => new Set([...prev, voter.id]));
        }
    };

    const handleCulaSiap = async (code, label) => {
        if (!selectedVoterForCula) return;
        const recordId = selectedVoterForCula.record_id;
        if (!recordId) { setErr('Rekod pemilih tidak dijumpai.'); setShowCulaModal(false); setSelectedVoterForCula(null); return; }
        const voterId = selectedVoterForCula.id;
        setShowCulaModal(false);
        try {
            const res = await fetch(route('carian-pemilih.update-cula', recordId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ cula_code: code, cula_display_label: label }),
            });
            if (!res.ok) throw new Error();
            setSelected((prev) => prev?.id === voterId ? { ...prev, cula_code: code, cula_display_label: label } : prev);
        } catch {
            setErr('Gagal menyimpan kod culaan.');
        }
        setCulaPendingIds((prev) => { const n = new Set(prev); n.delete(voterId); return n; });
        setSelectedVoterForCula(null);
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
                    <p className="text-muted mt-0.5">Cari nama, No Kp, nombor telefon atau No. Ahli.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {!isUdmLevel && (
                            <div className="relative flex-1 basis-full sm:basis-[180px]">
                                <select value={selectedDm} onChange={(e) => { setSelectedDm(e.target.value); setSelectedLocality(''); }}
                                    className="input-field py-2 pl-3 pr-8 text-xs">
                                    <option value="">Semua UDM</option>
                                    {available_dms.map((dm) => <option key={dm} value={dm}>{dm}</option>)}
                                </select>
                            </div>
                        )}
                        {(selectedDm || isUdmLevel) && !isCawanganLevel && (
                            <div className="relative flex-1 basis-full sm:basis-[180px]">
                                <select value={selectedLocality} onChange={(e) => setSelectedLocality(e.target.value)}
                                    className="input-field py-2 pl-3 pr-8 text-xs">
                                    <option value="">Semua Lokaliti</option>
                                    {(selectedDm ? (localities_by_dm[selectedDm] || []) : Object.values(localities_by_dm).flat()).map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="relative mt-2">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={q} onChange={handleChange} placeholder="Ali, 900101025555, 0123456789, A0001" className="input-field py-2 pl-10 pr-10 focus:ring-2" />
                        {q ? (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100"
                            >
                                <XIcon className="h-3 w-3" />
                            </button>
                        ) : (
                            <span className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-400">
                                <SearchIcon className="h-3.5 w-3.5" />
                            </span>
                        )}
                    </div>
                    {err && <p className="mt-1 text-xs font-bold text-rose-500">{err}</p>}
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                        {searching ? (
                            <div className="px-3 py-2 text-xs font-medium text-slate-500">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => {
                                const matchFilter = (selectedDm && voter.dm === selectedDm) || (selectedLocality && voter.locality === selectedLocality);
                                return (
                                <button key={voter.id} onClick={() => pick(voter)}
                                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_minmax(8rem,0.9fr)_auto] items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-left transition last:border-b-0 ${matchFilter ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-green-50'}`}>
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${matchFilter ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700'}`}>
                                        <UserIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-800">{voter.name}</p>
                                        <p className="text-xs font-medium text-slate-500">No Kp: {voter.no_kp || '-'} <span className="mx-1 text-slate-300">|</span> HP: {voter.phone_mobile || '-'}</p>
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-800">{voter.dm || '-'}</p>
                                        <p className="truncate text-xs font-medium text-slate-500">{voter.locality || '-'}</p>
                                    </div>
                                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
                                </button>
                                );
                            })
                        )}
                    </div>
                )}
            </section>

            {flash && <div className="flash-msg">{flash}</div>}
            {editNoAhli && canEditNoAhli && <NoAhliModal voter={editNoAhli} onClose={() => setEditNoAhli(null)}
                onSaved={(val) => { setSelected(prev => prev ? { ...prev, no_ahli: val } : prev); setFlash('No. Ahli berjaya dikemaskini!'); }} />}
            <ResultCard key={selected?.record_id ?? 'no-voter'} voter={selected} onClear={() => { clearSearch(); setOpeningTg(false); }}
                onOpenTelegram={openTg} tgReady={!openingTg && Boolean(cmd(selected, 'kemascula'))}
                onUpdateNoAhli={(v) => setEditNoAhli(v)} canEditNoAhli={canEditNoAhli}
                isCulaPending={culaPendingIds.has(selected?.id)} onCulaSiap={(v) => { setSelectedVoterForCula(v); setShowCulaModal(true); }} />

            {showCulaModal && selectedVoterForCula && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCulaModal(false)}>
                    <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Siap Cula — {selectedVoterForCula.name}</h3>
                            <button onClick={() => setShowCulaModal(false)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200">Tutup</button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {(initialCulaCodes ?? []).map((c) => (
                                <button key={c.code} onClick={() => handleCulaSiap(c.code, c.label)}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md ${c.code === (selectedVoterForCula.cula_code || '') ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}>
                                    {c.label}
                                </button>
                            ))}
                            {(!initialCulaCodes || initialCulaCodes.length === 0) && (
                                <p className="text-xs text-slate-400">Tiada kod culaan tersedia.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
