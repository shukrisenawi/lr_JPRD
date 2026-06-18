import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');
function fmt(v) { return nf.format(v ?? 0); }

function buildTelegramLink(command, identity) {
    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(identity ? `/${command} ${identity}` : `/${command}`)}`;
}

function extractNamaAyah(name) {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    const connectors = [' bin ', ' binti ', ' bt ', ' a/p ', ' a/l '];
    for (const connector of connectors) {
        const idx = lowerName.lastIndexOf(connector);
        if (idx !== -1) {
            const result = name.substring(idx + connector.length).trim();
            return result || null;
        }
    }
    return null;
}

function UserGroupIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function Pagination({ voters, onNavigate }) {
    if (!voters || voters.last_page <= 1) return null;
    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {voters.from ?? 0} - {voters.to ?? 0} daripada {voters.total} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onNavigate(voters.current_page - 1)}
                    disabled={!voters.prev_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
                    Sebelum
                </button>
                {voters.links?.filter((link) => /^\d+$/.test(String(link.label))).map((link) => (
                    <button key={link.label} type="button" onClick={() => onNavigate(Number(link.label))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${link.active ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700'}`}>
                        {link.label}
                    </button>
                ))}
                <button type="button" onClick={() => onNavigate(voters.current_page + 1)}
                    disabled={!voters.next_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">
                    Seterusnya
                </button>
            </div>
        </div>
    );
}

export default function CulaanBotIndex({ filters, summary, udms, localities, voters, available_cula_codes = [] }) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [actionError, setActionError] = useState('');
    const [showMarked, setShowMarked] = useState(Boolean(filters.show_marked));
    const [pendingIds, setPendingIds] = useState([]);
    const [culaSemulaIds, setCulaSemulaIds] = useState(new Set());
    const [showCulaModal, setShowCulaModal] = useState(false);
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [localVoters, setLocalVoters] = useState(voters);
    const [localSummary, setLocalSummary] = useState(summary);
    const [uploadingAvatarIds, setUploadingAvatarIds] = useState({});
    const [avatarUpdates, setAvatarUpdates] = useState({});
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [detailVoter, setDetailVoter] = useState(null);
    const closeDetail = () => { setDetailVoter(null); };
    const suggestionsAbort = useRef(null);

    useEffect(() => {
        setLocalVoters(voters);
        setLocalSummary(summary);
        setActionError('');
        setPendingIds([]);
    }, [summary, voters]);

    const rows = search.trim().length >= 2 ? suggestions : localVoters.data ?? [];

    const formState = {
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: showMarked,
    };

    const applyFilters = (nextState) => {
        router.get(route('culaan-bot.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const goToPage = (page) => {
        const listEl = document.getElementById('voter-count');
        if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        applyFilters({ ...formState, page });
    };

    const updateFilter = (key, value) => {
        const nextState = { ...formState, [key]: value };
        if (key === 'udm' && value !== formState.udm) nextState.locality = '';
        applyFilters(nextState);
    };

    const toggleShowMarked = () => {
        const next = !showMarked;
        setShowMarked(next);
        applyFilters({ ...formState, show_marked: next });
    };

    const doSearch = async (value) => {
        setSearch(value);
        setSearchError('');
        suggestionsAbort.current?.abort();
        if (value.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }
        const controller = new AbortController();
        suggestionsAbort.current = controller;
        setSearching(true);
        try {
            const params = new URLSearchParams({ q: value, udm: formState.udm, locality: formState.locality });
            const response = await fetch(`${route('culaan-bot.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error('Search failed');
            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError') setSearchError('Carian tidak berjaya dimuatkan.');
        } finally { setSearching(false); }
    };

    const clearSearch = () => {
        suggestionsAbort.current?.abort();
        setSearch('');
        setSuggestions([]);
        setSearching(false);
        setSearchError('');
    };

    const doSearchNamaAyah = (namaAyah) => {
        doSearch(namaAyah);
        const el = document.getElementById('bot-search');
        if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    };

    const updateLocalCollections = (voter) => {
        setSuggestions((current) => current.filter((item) => item.id !== voter.id));
        setLocalVoters((current) => {
            const nextData = (current.data ?? []).filter((item) => item.id !== voter.id);
            return { ...current, data: nextData, total: Math.max(0, (current.total ?? 0) - 1), to: nextData.length > 0 ? ((current.from ?? 1) + nextData.length - 1) : null };
        });
        setLocalSummary((current) => ({ ...current, total: Math.max(0, (current.total ?? 0) - 1) }));
        setCulaSemulaIds((prev) => { const next = new Set(prev); next.delete(voter.id); return next; });
    };

    const handleAvatarUpload = async (e, voterId) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: true }));
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', voterId), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.avatar_url) {
                setAvatarUpdates((prev) => ({ ...prev, [voterId]: data.avatar_url + '&t=' + Date.now() }));
            }
        } catch { alert('Gagal muat naik gambar.'); }
        finally { setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: false })); e.target.value = ''; }
    };

    const unmarkVoter = async (voter) => {
        setActionError('');
        setPendingIds((current) => [...current, voter.id]);
        try {
            const response = await fetch(route('culaan-bot.mark.destroy', voter.id), {
                method: 'DELETE',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) throw new Error('Request failed');
            await response.json();
            setLocalVoters((current) => {
                const nextData = current.data ?? [];
                const updated = nextData.map((item) =>
                    item.id === voter.id ? { ...item, is_marked: false } : item
                );
                return { ...current, data: updated };
            });
        } catch { setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.'); }
        finally { setPendingIds((current) => current.filter((id) => id !== voter.id)); }
    };

    const handleCulaSiap = async (code, label) => {
        if (!selectedVoterForCula || !code) return;
        setActionError('');
        setShowCulaModal(false);
        try {
            const response = await fetch(route('culaan-bot.update-cula', selectedVoterForCula.id), {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ cula_code: code, cula_display_label: label }),
            });
            if (!response.ok) throw new Error('Request failed');
            await response.json();
            updateLocalCollections(selectedVoterForCula);
            if (detailVoter?.id === selectedVoterForCula.id) closeDetail();
            setSelectedVoterForCula(null);
        } catch { setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.'); }
    };

    const [filterOpen, setFilterOpen] = useState(() => Boolean(filters.udm || filters.locality || showMarked));
    const hasFilterValue = filters.udm || filters.locality || showMarked;
    const shouldPromptUdm = !filters.udm && !filters.locality;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Culaan Bot</p>
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Senarai Pemilih</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">Kemas data culaan melalui Telegram Bot</p>
                    </div>
                </div>
            }
        >
            <Head title="Culaan Bot" />

            <div className="mx-auto max-w-2xl space-y-3 px-3 sm:px-4">
                <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
                    <button type="button" onClick={() => setFilterOpen(!filterOpen)}
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 text-green-600 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Carian</span>
                            {hasFilterValue && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">Aktif</span>}
                        </div>
                        {!filterOpen && hasFilterValue && (
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                {filters.udm && <span>{filters.udm}</span>}
                                {filters.locality && <span>{filters.locality}</span>}
                                {showMarked && <span className="rounded bg-slate-100 px-1 py-0.5">Siap</span>}
                            </div>
                        )}
                    </button>
                    {filterOpen && (
                        <div className="border-t border-green-100 px-4 pb-4 pt-3">
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="bot-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                                        <select id="bot-udm" value={formState.udm}
                                            onChange={(e) => updateFilter('udm', e.target.value)}
                                            className="input-field mt-1.5">
                                            <option value="">Semua</option>
                                            {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="bot-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                                        <select id="bot-locality" value={formState.locality}
                                            onChange={(e) => updateFilter('locality', e.target.value)}
                                            className="input-field mt-1.5">
                                            <option value="">Semua</option>
                                            {localities.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="bot-search" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Cari Pemilih</label>
                                    <div className="relative mt-1.5">
                                        <input id="bot-search" value={search}
                                            onChange={(e) => doSearch(e.target.value)}
                                            className="input-field pr-10" placeholder="Nama, No Kp..."
                                        />
                                        {search ? (
                                            <button type="button" onClick={clearSearch}
                                                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100">
                                                <span className="text-sm leading-none">×</span>
                                            </button>
                                        ) : (
                                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-green-600">⌕</span>
                                        )}
                                    </div>
                                </div>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={showMarked} onChange={toggleShowMarked}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500" />
                                    <span className="text-xs font-bold text-slate-600">Tunjuk yang sudah siap cula</span>
                                </label>
                            </div>
                            {actionError && <InputError className="mt-2" message={actionError} />}
                            {searchError && <InputError className="mt-1" message={searchError} />}
                        </div>
                    )}
                </section>

                <div id="voter-count" className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-green-600 shadow-sm shadow-green-600/20">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-green-700">Jumlah</p>
                    <p className="text-2xl font-black text-slate-800">{search.trim().length >= 2 ? rows.length : fmt(localSummary.total)}</p>
                </div>

                <section id="voter-list">
                    {rows.length === 0 ? (
                        <p className="rounded-xl border border-green-600 bg-white py-6 text-center text-xs font-medium text-slate-500 shadow-sm shadow-green-600/20">
                            {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk paparan.' : 'Tiada pemilih.'}
                        </p>
                    ) : (
                        <div className="grid gap-[3px]">
                            {rows.map((voter, index) => {
                                const namaAyah = extractNamaAyah(voter.name);
                                const isSearchResult = search.trim().length >= 2;
                                if (isSearchResult && voter.is_marked) {
                                    return (
                                        <button key={voter.id} type="button" onClick={() => { setDetailVoter(voter); }}
                                            className="w-full rounded-xl border border-green-600 bg-white p-3 text-left shadow-sm overflow-hidden transition hover:bg-green-50 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <span className="shrink-0 text-xs font-bold text-slate-800 min-w-[1.2rem] text-right">
                                                    {index + 1}.
                                                </span>
                                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                                    {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                                        <img src={avatarUpdates[voter.id] || voter.avatar_url} alt=""
                                                            className="h-6 w-6 shrink-0 rounded-full object-cover border border-slate-200"
                                                            onClick={(e) => { e.stopPropagation(); setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url); }} />
                                                    )}
                                                    <p className="text-sm font-bold leading-5 text-slate-800 break-words">
                                                        {voter.name}
                                                        {(voter.cula_display_label || voter.cula_code) && (
                                                            <span className="ml-1 text-[10px] font-semibold text-slate-500">
                                                                {voter.cula_display_label || voter.cula_code}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                                    {voter.age ?? '-'}
                                                </span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400"><polyline points="9 18 15 12 9 6"/></svg>
                                            </div>
                                        </button>
                                    );
                                }
                                return (
                                    <button key={voter.id} type="button" onClick={() => { setDetailVoter(voter); }}
                                        className="w-full rounded-xl border border-green-600 bg-white p-3 text-left shadow-sm overflow-hidden transition hover:bg-green-50 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <span className="shrink-0 text-xs font-bold text-slate-800 min-w-[1.2rem] text-right">
                                                {isSearchResult ? index + 1 : (localVoters.from ?? 0) + index}.
                                            </span>
                                            <div className="min-w-0 flex-1 flex items-center gap-2">
                                                {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                                    <img src={avatarUpdates[voter.id] || voter.avatar_url} alt=""
                                                        className="h-6 w-6 shrink-0 rounded-full object-cover border border-slate-200"
                                                        onClick={(e) => { e.stopPropagation(); setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url); }} />
                                                )}
                                                <p className="text-sm font-bold leading-5 text-slate-800 break-words">
                                                    {voter.name}
                                                    {(voter.cula_display_label || voter.cula_code) && (
                                                        <span className="ml-1 text-[10px] font-semibold text-slate-500">
                                                            {voter.cula_display_label || voter.cula_code}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                                {voter.age ?? '-'}
                                            </span>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-400"><polyline points="9 18 15 12 9 6"/></svg>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {!shouldPromptUdm && search.trim().length < 2 && (
                        <Pagination voters={localVoters} onNavigate={goToPage} />
                    )}
                </section>
            </div>

            {lightboxSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setLightboxSrc(null)} onKeyDown={(e) => { if (e.key === 'Escape') setLightboxSrc(null); }} role="presentation">
                    <img src={lightboxSrc} alt="Avatar" className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl" />
                </div>
            )}

            {detailVoter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeDetail} onKeyDown={(e) => { if (e.key === 'Escape') closeDetail(); }} role="presentation">
                    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {detailVoter.avatar_url && (
                                    <img src={detailVoter.avatar_url} alt=""
                                        className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover border border-slate-200"
                                        onClick={() => setLightboxSrc(detailVoter.avatar_url)} />
                                )}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{detailVoter.name}</h3>
                                    <p className="text-[11px] font-medium text-slate-500">{detailVoter.no_kp || detailVoter.old_ic || '-'}</p>
                                </div>
                            </div>
                            <button type="button" onClick={closeDetail}
                                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50">
                                Tutup
                            </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Umur</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.age ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telegram</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.telegram_identity || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">UDM</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.dm || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lokaliti</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.locality || '-'}</p>
                            </div>
                            {(detailVoter.cula_code || detailVoter.cula_display_label) && (
                                <>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cula</p>
                                        <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.cula_display_label || '-'}</p>
                                    </div>
                                    {detailVoter.marked_by_name && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dikemas oleh</p>
                                            <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.marked_by_name}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            {!detailVoter.is_manual && (
                                <>
                                    <input type="file" accept="image/*" id={`detail-avatar-${detailVoter.id}`}
                                        onChange={(e) => handleAvatarUpload(e, detailVoter.id)} className="hidden" />
                                    <button type="button"
                                        onClick={(e) => { e.stopPropagation(); document.getElementById(`detail-avatar-${detailVoter.id}`)?.click(); }}
                                        disabled={uploadingAvatarIds[detailVoter.id]}
                                        className="flex w-8 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:opacity-40"
                                        title="Muat naik gambar">
                                        {uploadingAvatarIds[detailVoter.id] ? (
                                            <span className="text-[10px] font-bold">...</span>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
                                        )}
                                    </button>
                                </>
                            )}
                            {extractNamaAyah(detailVoter.name) && (
                                <button type="button"
                                    onClick={() => { doSearchNamaAyah(extractNamaAyah(detailVoter.name)); closeDetail(); }}
                                    className="flex w-8 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-400 shadow-sm transition hover:border-green-300 hover:text-green-600"
                                    title={`Cari keluarga: ${extractNamaAyah(detailVoter.name)}`}>
                                    <UserGroupIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {!detailVoter.is_marked ? (
                                <>
                                    {culaSemulaIds.has(detailVoter.id) ? (
                                        <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setShowCulaModal(true); }}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-500">
                                            Siap Cula
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, detailVoter.id])); window.open(buildTelegramLink('kemascula', detailVoter.telegram_identity), '_blank'); }}
                                            className="flex-1 rounded bg-green-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-green-500">
                                            Cula
                                        </button>
                                    )}
                                    <a href={buildTelegramLink('kemastel', detailVoter.telegram_identity)}
                                        className="flex-1 inline-flex items-center justify-center rounded bg-amber-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-amber-500">
                                        Tel
                                    </a>
                                </>
                            ) : (
                                <>
                                    {culaSemulaIds.has(detailVoter.id) ? (
                                        <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setShowCulaModal(true); }}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-500">
                                            Siap Cula
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, detailVoter.id])); window.open(buildTelegramLink('kemascula', detailVoter.telegram_identity), '_blank'); }}
                                            className="flex-1 rounded bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-700">
                                            Tukar Cula
                                        </button>
                                    )}
                                    <a href={buildTelegramLink('kemastel', detailVoter.telegram_identity)}
                                        className="flex-1 inline-flex items-center justify-center rounded bg-amber-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-amber-500">
                                        Tel
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCulaModal && selectedVoterForCula && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCulaModal(false)} onKeyDown={(e) => { if (e.key === 'Escape') setShowCulaModal(false); }} role="presentation">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Siap Cula — {selectedVoterForCula.name}</h3>
                            <button type="button" onClick={() => setShowCulaModal(false)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50">
                                Tutup
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Pilih kod cula:</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {[...available_cula_codes].sort((a, b) => {
                                const na = parseInt(a.code, 10);
                                const nb = parseInt(b.code, 10);
                                return (na || 999) - (nb || 999) || a.code.localeCompare(b.code);
                            }).map((c) => {
                                const isSelected = c.code === (selectedVoterForCula.cula_code || '');
                                return (
                                    <button key={c.code} type="button" onClick={() => handleCulaSiap(c.code, c.label)}
                                        className={
                                            'rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md ' +
                                            (isSelected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700')
                                        }>
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
