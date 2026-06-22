import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        chevronDown: <><path d="m6 9 6 6 6-6" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        mapPin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
        phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></>,
        idCard: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3" /><path d="M14 11h3" /><path d="M7 14h10" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

const levelMeta = {
    jprd: { label: 'JPRD', bg: 'bg-green-100', text: 'text-green-700' },
    udm: { label: 'UDM', bg: 'bg-sky-100', text: 'text-sky-700' },
    cawangan: { label: 'Cawangan', bg: 'bg-purple-100', text: 'text-purple-700' },
};

function LevelBadge({ level, size = 'sm' }) {
    const meta = levelMeta[level] || { label: level, bg: 'bg-slate-100', text: 'text-slate-700' };
    const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
    return <span className={'inline-block rounded-md font-bold ' + meta.bg + ' ' + meta.text + ' ' + sizing}>{meta.label}</span>;
}

const levelPriority = { jprd: 3, udm: 2, cawangan: 1 };
const allLevels = ['jprd', 'udm', 'cawangan'];

function PemimpinSearchModal({ scopes, onSelect, onClose, userLevel }) {
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [query, setQuery] = useState('');
    const defaultLevel = allLevels.filter(l => levelPriority[l] <= levelPriority[userLevel]).at(-1) || userLevel;
    const [selectedLevel, setSelectedLevel] = useState(defaultLevel);
    const ac = useRef(null);

    const availableLevels = allLevels.filter(l => levelPriority[l] <= levelPriority[userLevel]);

    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        ac.current?.abort();
        const c = new AbortController();
        ac.current = c;
        setSearching(true);
        const params = new URLSearchParams({ q: query, level: selectedLevel });
        fetch(route('kad-ten.suggest-pemimpin') + '?' + params.toString(), { headers: { Accept: 'application/json' }, signal: c.signal })
            .then(r => r.json())
            .then(p => setResults(p.suggestions ?? []))
            .catch(() => {})
            .finally(() => setSearching(false));
    }, [query, selectedLevel]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Pilih Ketua (AJK)</p>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="border-b border-slate-100 px-4 py-2 space-y-2">
                    <div className="flex gap-1">
                        {availableLevels.map(l => (
                            <button key={l} type="button" onClick={() => setSelectedLevel(l)}
                                className={'rounded-lg px-3 py-1.5 text-xs font-bold transition ' + (selectedLevel === l ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-green-50')}>
                                {levelMeta[l].label}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama atau No KP..." className="input-field w-full pl-9 text-xs" autoFocus />
                    </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-4 space-y-1.5">
                    {searching ? <p className="py-4 text-center text-xs text-slate-400">Mencari...</p> : results.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">{query.trim().length < 2 ? 'Taip minimum 2 aksara.' : 'Tiada hasil.'}</p> : results.map(r => (
                        <button key={r.id} type="button" onClick={() => onSelect(r)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-green-300 hover:bg-green-50">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"><Icon name="user" className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800">{r.name}</p>
                                <p className="text-[10px] text-slate-400">{r.no_kp || r.old_ic || '-'} | {r.dm} / {r.locality || '-'}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <LevelBadge level={r.level} />
                                <p className="text-[9px] text-slate-400 mt-0.5">{r.position_name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AddMemberModal({ kad, scopes, onClose }) {
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoters, setSelectedVoters] = useState([]);
    const [query, setQuery] = useState('');
    const [clusters, setClusters] = useState(null);
    const [selectedClusterType, setSelectedClusterType] = useState(null);
    const [showClusterFor, setShowClusterFor] = useState(null);
    const ac = useRef(null);
    const [adding, setAdding] = useState(false);
    const [clusterLoading, setClusterLoading] = useState(false);

    const handleSearch = useCallback((q) => {
        setQuery(q);
        ac.current?.abort();
        if (q.trim().length < 2) { setSuggestions([]); return; }
        const c = new AbortController();
        ac.current = c;
        setSearching(true);
        fetch(route('kad-ten.search-pemilih') + '?' + new URLSearchParams({ q }), { headers: { Accept: 'application/json' }, signal: c.signal })
            .then(r => r.json())
            .then(p => setSuggestions(p.suggestions ?? []))
            .catch(() => {})
            .finally(() => setSearching(false));
    }, []);

    const loadClusters = useCallback((voter) => {
        setClusterLoading(true);
        setShowClusterFor(voter.id);
        fetch(route('kad-ten.clusters', voter.id), { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(p => setClusters(p))
            .catch(() => setClusters(null))
            .finally(() => setClusterLoading(false));
    }, []);

    const toggleSelect = (voter) => {
        setSelectedVoters(prev => prev.find(v => v.id === voter.id) ? prev.filter(v => v.id !== voter.id) : [...prev, voter]);
    };

    const isSelected = (id) => selectedVoters.some(v => v.id === id);

    const addSelected = async (voters, clusterType, clusterValue) => {
        if (voters.length === 0) return;
        setAdding(true);
        try {
            await router.post(route('kad-ten.members.store', kad.id), {
                pemilih_record_ids: voters.map(v => v.id),
                cluster_type: clusterType || null,
                cluster_value: clusterValue || null,
            }, { preserveScroll: true, preserveState: true });
            setSelectedVoters([]);
            setClusters(null);
            setShowClusterFor(null);
        } finally {
            setAdding(false);
        }
    };

    const addCluster = async (voters, type, value) => {
        await addSelected(voters, type, value);
        setClusters(null);
        setShowClusterFor(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Tambah Ahli</p>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="border-b border-slate-100 px-4 py-2 shrink-0">
                    <div className="relative">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={query} onChange={e => handleSearch(e.target.value)} placeholder="Cari pemilih (Nama, No KP...) — cula 2/3B/3D/3K/3M/3P/3U" className="input-field w-full pl-9 text-xs" autoFocus />
                    </div>
                    {(searching || suggestions.length > 0) && (
                        <div className="mt-1.5 overflow-hidden rounded-lg border border-green-200 bg-white shadow-lg">
                            {searching ? <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div> : suggestions.map(voter => (
                                <label key={voter.id} className="flex cursor-pointer items-center gap-3 border-b border-green-100 px-3 py-2 text-left transition hover:bg-green-50 last:border-b-0">
                                    <input type="checkbox" checked={isSelected(voter.id)} onChange={() => toggleSelect(voter)} className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800">{voter.name}</p>
                                        <p className="text-[10px] text-slate-400">{voter.no_kp || voter.old_ic || '-'}</p>
                                    </div>
                                    <div className="shrink-0 text-right text-[10px] text-slate-500">
                                        <p>{voter.dm || '-'}</p>
                                        {voter.locality && <p className="mt-0.5">{voter.locality}</p>}
                                    </div>
                                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); loadClusters(voter); }}
                                        className="rounded border border-green-200 bg-white px-2 py-0.5 text-[10px] font-bold text-green-700 hover:bg-green-50">
                                        Kluster
                                    </button>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {showClusterFor && clusterLoading && <div className="px-4 py-2 text-xs text-slate-400 shrink-0">Mencari kluster...</div>}

                {clusters && showClusterFor && (
                    <div className="border-b border-slate-100 px-4 py-2 shrink-0 space-y-2">
                        {clusters.by_address?.length > 0 && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-sky-700">Alamat sama ({clusters.by_address.length})</p>
                                    <button type="button" onClick={() => addCluster(clusters.by_address, 'alamat', query)}
                                        className="rounded bg-sky-600 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-sky-500">
                                        <Icon name="plus" className="h-3 w-3 inline" /> Tambah Semua
                                    </button>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {clusters.by_address.slice(0, 5).map(v => (
                                        <span key={v.id} className="rounded bg-white px-1.5 py-0.5 text-[9px] font-medium text-sky-700 border border-sky-200">{v.name}</span>
                                    ))}
                                    {clusters.by_address.length > 5 && <span className="text-[9px] text-sky-500">+{clusters.by_address.length - 5} lagi</span>}
                                </div>
                            </div>
                        )}
                        {clusters.by_rumah?.length > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-amber-700">No. Rumah + Lokaliti sama ({clusters.by_rumah.length})</p>
                                    <button type="button" onClick={() => addCluster(clusters.by_rumah, 'no_rumah', query)}
                                        className="rounded bg-amber-600 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-amber-500">
                                        <Icon name="plus" className="h-3 w-3 inline" /> Tambah Semua
                                    </button>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {clusters.by_rumah.slice(0, 5).map(v => (
                                        <span key={v.id} className="rounded bg-white px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">{v.name}</span>
                                    ))}
                                    {clusters.by_rumah.length > 5 && <span className="text-[9px] text-amber-500">+{clusters.by_rumah.length - 5} lagi</span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {selectedVoters.length > 0 && (
                    <div className="border-b border-slate-100 px-4 py-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-600"><span className="font-bold text-green-700">{selectedVoters.length}</span> dipilih</p>
                            <button type="button" onClick={() => addSelected(selectedVoters, 'manual', null)} disabled={adding}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">
                                {adding ? '...' : 'Tambah Ahli'}
                            </button>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {selectedVoters.map(v => (
                                <span key={v.id} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                                    {v.name}
                                    <button type="button" onClick={() => toggleSelect(v)} className="text-green-500 hover:text-rose-600"><Icon name="x" className="h-3 w-3" /></button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-4 text-center text-[10px] text-slate-400 shrink-0">
                    Hanya pemilih dengan cula 2, 3B, 3D, 3K, 3M, 3P, 3U/aktif/tiada ditunjukkan.
                </div>
            </div>
        </div>
    );
}

function KadCard({ kad, onEdit, onDelete, onDeleteMember }) {
    const [expanded, setExpanded] = useState(false);
    const [addModal, setAddModal] = useState(false);

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-green-50">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={'shrink-0 transition-transform duration-200 ' + (expanded ? 'rotate-90' : '')}>
                        <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
                    </span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                        <Icon name="users" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{kad.name || 'Kad 10'}</p>
                        {kad.pemimpin && <p className="text-[10px] text-slate-500">Ketua: {kad.pemimpin.name}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <LevelBadge level={kad.level} />
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{kad.member_count} ahli</span>
                </div>
            </button>

            {kad.pemimpin && (
                <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            {kad.pemimpin.avatar_url ? <img src={kad.pemimpin.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <Icon name="user" className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-emerald-800">{kad.pemimpin.name}</p>
                            <p className="text-[10px] text-slate-400">{kad.pemimpin.no_kp || kad.pemimpin.old_ic || '-'}</p>
                        </div>
                        <div className="shrink-0 text-right text-[10px] text-slate-500">
                            <p>{kad.pemimpin.dm || '-'}</p>
                            {kad.pemimpin.locality && <p>{kad.pemimpin.locality}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => onEdit(kad)} className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50">Edit</button>
                            <button type="button" onClick={() => onDelete(kad)} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">Padam</button>
                        </div>
                    </div>
                </div>
            )}

            {expanded && (
                <div className="border-t border-slate-100">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Senarai Ahli</p>
                        <button type="button" onClick={() => setAddModal(true)} className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-0.5 text-[10px] font-bold text-green-700 hover:bg-green-50">
                            <Icon name="plus" className="h-3 w-3" /> Tambah
                        </button>
                    </div>
                    {kad.members.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[10px] text-slate-400">Tiada ahli dalam kad ini.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {kad.members.map((m, i) => (
                                <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                                    <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{i + 1}.</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-800">{m.voter?.name || '-'}</p>
                                        <p className="text-[10px] text-slate-400">{m.voter?.no_kp || m.voter?.old_ic || '-'} | {m.voter?.dm} / {m.voter?.locality || '-'}</p>
                                        {m.cluster_type && <p className="text-[9px] text-sky-600">via {m.cluster_type === 'alamat' ? 'Alamat' : m.cluster_type === 'no_rumah' ? 'No. Rumah' : 'Manual'}</p>}
                                    </div>
                                    <div className="shrink-0 text-right text-[10px] text-slate-500">
                                        {m.voter?.phone_mobile && <p>{m.voter.phone_mobile}</p>}
                                        {m.voter?.cula_display_label && <p className="text-[9px] text-green-600">{m.voter.cula_display_label}</p>}
                                    </div>
                                    <button type="button" onClick={() => onDeleteMember(kad.id, m.id)}
                                        className="shrink-0 rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Buang">
                                        <Icon name="x" className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {addModal && <AddMemberModal kad={kad} onClose={() => setAddModal(false)} />}
        </div>
    );
}

function EditKadModal({ kad, onClose, userLevel }) {
    const form = useForm({
        name: kad.name || '',
        pemimpin_id: kad.pemimpin?.id || '',
        notes: kad.notes || '',
    });
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedPemimpinName, setSelectedPemimpinName] = useState(kad.pemimpin?.name || '');

    const selectPemimpin = (voter) => {
        form.setData('pemimpin_id', voter.id);
        setSelectedPemimpinName(voter.name);
        setSearchOpen(false);
    };

    const submit = (e) => {
        e.preventDefault();
        form.put(route('kad-ten.update', kad.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Edit Kad 10</p>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-3 p-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Nama Kad</label>
                        <input type="text" value={form.data.name} onChange={e => form.setData('name', e.target.value)}
                            className="input-field mt-1 w-full text-xs" placeholder="Contoh: KAD 10 - Taman XXX" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Ketua (Pemimpin)</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input type="text" readOnly value={selectedPemimpinName} className="input-field flex-1 text-xs bg-slate-50" placeholder="Klik cari untuk pilih" />
                            <button type="button" onClick={() => setSearchOpen(true)} className="rounded-md border border-green-200 bg-white px-2.5 py-2 text-[10px] font-bold text-green-700 hover:bg-green-50">Cari</button>
                        </div>
                        {form.errors.pemimpin_id && <p className="mt-1 text-[10px] text-rose-600">{form.errors.pemimpin_id}</p>}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600">Nota</label>
                        <textarea value={form.data.notes} onChange={e => form.setData('notes', e.target.value)}
                            className="input-field mt-1 w-full text-xs" rows="2" placeholder="Optional" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                        <button type="submit" disabled={form.processing} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">
                            {form.processing ? '...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
            {searchOpen && <PemimpinSearchModal scopes={{}} userLevel={userLevel} onSelect={selectPemimpin} onClose={() => setSearchOpen(false)} />}
        </div>
    );
}

export default function KadTenIndex({ kads, scopes }) {
    const { auth } = usePage().props;
    const userLevel = auth?.user?.access_level ?? 'jprd';
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editKad, setEditKad] = useState(null);

    const createForm = useForm({ name: '', pemimpin_id: '', notes: '' });
    const [selectedPemimpin, setSelectedPemimpin] = useState(null);
    const [pemimpinSearchOpen, setPemimpinSearchOpen] = useState(false);

    const selectPemimpin = (voter) => {
        setSelectedPemimpin(voter);
        createForm.setData('pemimpin_id', voter.id);
        setPemimpinSearchOpen(false);
    };

    const submitCreate = (e) => {
        e.preventDefault();
        if (!createForm.data.pemimpin_id) {
            createForm.setError('pemimpin_id', 'Sila pilih seorang ketua.');
            return;
        }
        createForm.post(route('kad-ten.store'), {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setSelectedPemimpin(null);
                setCreateModalOpen(false);
            },
        });
    };

    const handleDelete = (kad) => {
        if (window.confirm('Padam Kad 10 "' + (kad.name || 'Kad 10') + '"? Semua ahli akan dibuang.')) {
            router.delete(route('kad-ten.destroy', kad.id), { preserveScroll: true });
        }
    };

    const handleDeleteMember = (kadId, memberId) => {
        if (window.confirm('Buang ahli ini dari kad?')) {
            router.delete(route('kad-ten.members.destroy', [kadId, memberId]), {
                preserveScroll: true, preserveState: true,
            });
        }
    };

    const tabs = [
        { key: 'index', label: 'Kad Saya' },
        { key: 'senarai-pemilih', label: 'Senarai Pemilih' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Kad 10</p>
                        <h2 className="mt-0.5 heading-lg">Agih pemilih di bawah seorang ketua</h2>
                    </div>
                    <button type="button" onClick={() => setCreateModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-500">
                        <Icon name="plus" className="h-4 w-4" /> Cipta Kad 10
                    </button>
                </div>
            }
        >
            <Head title="Kad 10" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="flex gap-1 border-b border-slate-200 pb-0">
                    {tabs.map(t => (
                        <button key={t.key} type="button" onClick={() => {
                            if (t.key === 'senarai-pemilih') router.get(route('kad-ten.senarai-pemilih'));
                        }}
                            className={'rounded-t-lg px-4 py-2 text-xs font-bold transition ' + (t.key === 'index' ? 'border-x border-t border-slate-200 bg-white text-green-700' : 'text-slate-500 hover:bg-green-50 hover:text-green-700')}>
                            {t.label}
                        </button>
                    ))}
                </div>
                {kads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-green-300 bg-white py-12 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                            <Icon name="users" className="h-8 w-8" />
                        </div>
                        <p className="mt-4 text-sm font-bold text-slate-600">Belum ada Kad 10</p>
                        <p className="mt-1 text-xs text-slate-400">Klik butang "Cipta Kad 10" untuk mula mengagihkan pemilih di bawah seorang ketua.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {kads.map(kad => (
                            <KadCard key={kad.id} kad={kad} onEdit={setEditKad} onDelete={handleDelete} onDeleteMember={handleDeleteMember} />
                        ))}
                    </div>
                )}
            </div>

            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={() => setCreateModalOpen(false)}>
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Cipta Kad 10</p>
                            <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitCreate} className="space-y-3 p-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Nama Kad (Optional)</label>
                                <input type="text" value={createForm.data.name} onChange={e => createForm.setData('name', e.target.value)}
                                    className="input-field mt-1 w-full text-xs" placeholder="Contoh: KAD 10 - Taman XXX" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Ketua (Pemimpin) <span className="text-rose-500">*</span></label>
                                {selectedPemimpin ? (
                                    <div className="mt-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"><Icon name="user" className="h-4 w-4" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-green-800">{selectedPemimpin.name}</p>
                                                <p className="text-[10px] text-green-600">{selectedPemimpin.no_kp || selectedPemimpin.old_ic || '-'} | {selectedPemimpin.position_name}</p>
                                            </div>
                                            <button type="button" onClick={() => { setSelectedPemimpin(null); createForm.setData('pemimpin_id', ''); }} className="rounded-md p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600">
                                                <Icon name="x" className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-1">
                                        <button type="button" onClick={() => setPemimpinSearchOpen(true)}
                                            className="w-full rounded-lg border border-dashed border-green-300 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50">
                                            <Icon name="search" className="h-4 w-4 inline mr-1" /> Cari & Pilih Ketua (AJK)
                                        </button>
                                    </div>
                                )}
                                {createForm.errors.pemimpin_id && <p className="mt-1 text-[10px] text-rose-600">{createForm.errors.pemimpin_id}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Nota (Optional)</label>
                                <textarea value={createForm.data.notes} onChange={e => createForm.setData('notes', e.target.value)}
                                    className="input-field mt-1 w-full text-xs" rows="2" placeholder="Contoh: untuk tugasan gotong-royong" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={createForm.processing} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">
                                    {createForm.processing ? '...' : 'Cipta Kad'}
                                </button>
                            </div>
                        </form>
                    </div>
                    {pemimpinSearchOpen && <PemimpinSearchModal scopes={scopes} userLevel={userLevel} onSelect={selectPemimpin} onClose={() => setPemimpinSearchOpen(false)} />}
                </div>
            )}

            {editKad && <EditKadModal kad={editKad} userLevel={userLevel} onClose={() => setEditKad(null)} />}
        </AuthenticatedLayout>
    );
}
