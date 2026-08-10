import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import CropModal from '@/Components/CropModal';
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

function addressHasRum(alm, rum) {
    if (!alm || !rum) return false;
    const a = alm.replace(/\s+/g, '');
    const r = rum.replace(/\s+/g, '');
    return a === r || a.startsWith(r + ',') || a.startsWith(r);
}

function stripRum(alm, rum) {
    let ri = 0, ai = 0;
    const r = rum.replace(/\s+/g, '');
    while (ri < r.length && ai < alm.length) {
        if (/\s/.test(alm[ai])) { ai++; continue; }
        if (alm[ai].toLowerCase() === r[ri].toLowerCase()) { ri++; ai++; }
        else break;
    }
    if (ri < r.length) return alm;
    while (ai < alm.length && /[,.\s]/.test(alm[ai])) ai++;
    return alm.slice(ai);
}

function combineAddress(rum, alm) {
    if (!rum && !alm) return '-';
    if (rum && alm) {
        if (addressHasRum(alm, rum)) {
            const s = stripRum(alm, rum);
            return s ? `${rum}, ${s}` : rum;
        }
        return `${rum}, ${alm}`;
    }
    return rum || alm;
}

function formatAddress(voter) {
    const rum = voter.no_rumah && voter.no_rumah !== '-' && voter.no_rumah !== '' ? voter.no_rumah : '';
    const alm = (voter.alamat_kediaman && voter.alamat_kediaman !== '-' && voter.alamat_kediaman !== '')
        ? voter.alamat_kediaman
        : (voter.alamat_kp && voter.alamat_kp !== '-' && voter.alamat_kp !== '' ? voter.alamat_kp : (voter.address || ''));
    return combineAddress(rum, alm);
}

function RumahBadge({ voter, onRumahClick }) {
    const rum = voter.no_rumah && voter.no_rumah !== '-' && voter.no_rumah !== '' ? voter.no_rumah : '';
    if (!rum) return null;
    if (voter.rumah_count >= 1) {
        return (
            <button type="button" onClick={(e) => { e.stopPropagation(); onRumahClick?.(voter); }} title="Pemilih lain dengan rumah sama"
                className="inline-block rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700">
                {rum}
            </button>
        );
    }
    return (
        <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{rum}</span>
    );
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

function HomeIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <polyline points="9 22 9 12 15 12 15 22" />
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

function InfoField({ label, value, mono, accent }) {
    return (
        <div className={`min-w-0 ${accent ? 'rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-2 ring-1 ring-emerald-200' : ''}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${accent ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</p>
            <p className={`mt-0.5 truncate text-xs font-bold ${mono ? 'font-mono' : ''} ${accent ? 'text-emerald-900' : 'text-slate-800'}`}>{value}</p>
        </div>
    );
}

function InfoTile({ label, value, suffix, accent, className = '' }) {
    return (
        <div className={`rounded-2xl border p-2.5 text-center ${accent ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-slate-200 bg-white'} ${className}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${accent ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</p>
            <p className={`mt-0.5 truncate text-base font-black ${accent ? 'text-emerald-900' : 'text-slate-800'}`}>{value}{suffix && <span className="ml-0.5 text-[10px] font-bold opacity-70">{suffix}</span>}</p>
        </div>
    );
}

function ToggleTile({ label, icon, iconColor, active, onToggle, disabled }) {
    const colorMap = {
        emerald: { active: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-emerald-500/30', idle: 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/60' },
        blue: { active: 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-blue-500 shadow-blue-500/30', idle: 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/60' },
        amber: { active: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-500 shadow-amber-500/30', idle: 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/60' },
        slate: { active: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border-slate-700 shadow-slate-700/30', idle: 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50' },
        rose: { active: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-500 shadow-rose-500/30', idle: 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50/60' },
    };
    const cls = colorMap[iconColor] || colorMap.emerald;
    const iconPath = ({ check: <polyline points="20 6 9 17 4 12" />, home: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 22 9 12 15 12 15 22"/></>, map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>, list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>, target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> })[icon];
    return (
        <button type="button" onClick={onToggle} disabled={disabled}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-xs font-bold shadow-sm transition active:scale-[0.97] ${disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60' : active ? cls.active + ' shadow-md' : cls.idle}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{iconPath}</svg>
            </span>
            <span className="flex-1 truncate">{label}</span>
            {active && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/30 text-xs">✓</span>}
        </button>
    );
}

export default function CulaanBotIndex({ filters, summary, udms, localities, voters, available_cula_codes = [], available_hashtags = [] }) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [actionError, setActionError] = useState('');
    const [showMarked, setShowMarked] = useState(Boolean(filters.show_marked));
    const [filterRumah, setFilterRumah] = useState(Boolean(filters.filter_rumah));
    const [filterAlamat, setFilterAlamat] = useState(Boolean(filters.filter_alamat));
    const [filterRumahAlamat, setFilterRumahAlamat] = useState(Boolean(filters.filter_rumah_alamat));
    const [showAll, setShowAll] = useState(Boolean(filters.show_all));
    const [culaCodes, setCulaCodes] = useState(filters.cula_codes ?? []);
    const [hashtags, setHashtags] = useState(Array.isArray(filters.hashtags) ? filters.hashtags : []);
    const [ageFrom, setAgeFrom] = useState(filters.age_from ?? '');
    const [ageTo, setAgeTo] = useState(filters.age_to ?? '');
    const [pendingIds, setPendingIds] = useState([]);
    const [culaSemulaIds, setCulaSemulaIds] = useState(new Set());
    const [showCulaModal, setShowCulaModal] = useState(false);
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [localVoters, setLocalVoters] = useState(voters);
    const [localSummary, setLocalSummary] = useState(summary);
    const [cropFile, setCropFile] = useState(null);
    const [cropVoterId, setCropVoterId] = useState(null);
    const [uploadingAvatarIds, setUploadingAvatarIds] = useState({});
    const [avatarUpdates, setAvatarUpdates] = useState({});
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [detailVoter, setDetailVoter] = useState(null);
    const [addressVoters, setAddressVoters] = useState([]);
    const [showAddressPopup, setShowAddressPopup] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [addressPopupTitle, setAddressPopupTitle] = useState('Alamat Sama');
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('culaBotViewMode') || 'card');
    const persistViewMode = (mode) => { setViewMode(mode); localStorage.setItem('culaBotViewMode', mode); };
    const [activeVoterId, setActiveVoterId] = useState(null);
    const markActive = (id) => setActiveVoterId(id);
    const clearActive = () => setActiveVoterId(null);
    const fromAddressPopup = useRef(false);
    const previousDetailVoter = useRef(null);
    const addressPopupVoterName = useRef('');
    const lastRumahVoterRef = useRef(null);
    const lastAddressVoterRef = useRef(null);
    const popupSourceRef = useRef('');
    const closeDetail = () => {
        setDetailVoter(null);
        if (fromAddressPopup.current) {
            fromAddressPopup.current = false;
            const src = popupSourceRef.current;
            const isRumah = src === 'rumah' && lastRumahVoterRef.current;
            const isAlamat = src === 'alamat' && lastAddressVoterRef.current;
            const isRumahAlamat = src === 'rumah_alamat' && lastRumahVoterRef.current;
            if (isRumah || isAlamat || isRumahAlamat) {
                setShowAddressPopup(true);
                if (isRumahAlamat) loadRumahAlamat(lastRumahVoterRef.current);
                else if (isRumah) loadRumahVoters(lastRumahVoterRef.current);
                else loadAddressVoters(lastAddressVoterRef.current);
            }
        }
    };
    const suggestionsAbort = useRef(null);

    useEffect(() => {
        setLocalVoters(voters);
        setLocalSummary(summary);
        setActionError('');
        setPendingIds([]);
        setActiveVoterId(null);
    }, [summary, voters]);

    const rows = search.trim().length >= 2 ? suggestions : localVoters.data ?? [];

    const formState = {
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: showMarked,
        filter_rumah: filterRumah,
        filter_alamat: filterAlamat,
        filter_rumah_alamat: filterRumahAlamat,
        show_all: showAll,
        cula_codes: culaCodes,
        hashtags,
        age_from: ageFrom,
        age_to: ageTo,
    };

    const applyFilters = (nextState) => {
        router.get(route('culaan-bot.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const goToPage = (page) => {
        router.get(route('culaan-bot.index'), { ...formState, page }, {
            preserveState: true,
            preserveScroll: false,
            replace: true,
            onSuccess: () => {
                const el = document.getElementById('card-carian');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
        });
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

    const toggleFilterRumah = () => {
        if (filterRumahAlamat) return;
        const next = !filterRumah;
        setFilterRumah(next);
        applyFilters({ ...formState, filter_rumah: next });
    };

    const toggleFilterAlamat = () => {
        if (filterRumahAlamat) return;
        const next = !filterAlamat;
        setFilterAlamat(next);
        applyFilters({ ...formState, filter_alamat: next });
    };

    const toggleFilterRumahAlamat = () => {
        const next = !filterRumahAlamat;
        setFilterRumahAlamat(next);
        setFilterRumah(false);
        setFilterAlamat(false);
        applyFilters({ ...formState, filter_rumah_alamat: next, filter_rumah: false, filter_alamat: false });
    };

    const toggleShowAll = () => {
        const next = !showAll;
        setShowAll(next);
        if (!next) {
            setCulaCodes([]);
        }
        applyFilters({ ...formState, show_all: next, cula_codes: next ? culaCodes : [] });
    };

    const toggleCulaCode = (code) => {
        const next = culaCodes.includes(code)
            ? culaCodes.filter((c) => c !== code)
            : [...culaCodes, code];
        setCulaCodes(next);
        applyFilters({ ...formState, cula_codes: next });
    };

    const toggleHashtag = (hashtag) => {
        const next = hashtags.includes(hashtag)
            ? hashtags.filter((item) => item !== hashtag)
            : [...hashtags, hashtag];
        setHashtags(next);
        applyFilters({ ...formState, hashtags: next });
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
            const params = new URLSearchParams({ q: value, udm: formState.udm, locality: formState.locality, age_from: formState.age_from, age_to: formState.age_to, filter_rumah: formState.filter_rumah, filter_alamat: formState.filter_alamat, filter_rumah_alamat: formState.filter_rumah_alamat, show_all: formState.show_all ? '1' : '0' });
            (formState.cula_codes ?? []).forEach((code) => params.append('cula_codes[]', code));
            (formState.hashtags ?? []).forEach((hashtag) => {
                params.append('hashtags[]', hashtag);
            });
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

    const loadAddressVoters = async (voter) => {
        if (!voter.address || voter.address === '-') return;
        lastAddressVoterRef.current = voter;
        popupSourceRef.current = 'alamat';
        setLoadingAddress(true);
        setShowAddressPopup(true);
        addressPopupVoterName.current = voter.name;
        setAddressPopupTitle('Alamat Sama');
        try {
            const res = await fetch(route('culaan-bot.alamat', voter.id), {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Gagal');
            const data = await res.json();
            setAddressVoters(data.voters ?? []);
        } catch {
            setAddressVoters([]);
        } finally {
            setLoadingAddress(false);
        }
    };

    const loadRumahVoters = async (voter) => {
        if (!voter.no_rumah || voter.no_rumah === '-' || !voter.locality) return;
        lastRumahVoterRef.current = voter;
        popupSourceRef.current = 'rumah';
        setLoadingAddress(true);
        setShowAddressPopup(true);
        addressPopupVoterName.current = voter.name;
        setAddressPopupTitle(`Alamat: ${formatAddress(voter)}`);
        try {
            const res = await fetch(route('culaan-bot.rumah', voter.id), {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Gagal');
            const data = await res.json();
            setAddressVoters(data.voters ?? []);
        } catch {
            setAddressVoters([]);
        } finally {
            setLoadingAddress(false);
        }
    };

    const loadRumahAlamat = async (voter) => {
        if (!voter.no_rumah || voter.no_rumah === '-' || !voter.locality) return;
        lastRumahVoterRef.current = voter;
        popupSourceRef.current = 'rumah_alamat';
        setLoadingAddress(true);
        setShowAddressPopup(true);
        addressPopupVoterName.current = voter.name;
        setAddressPopupTitle(`No Rumah & Alamat Sama: ${voter.no_rumah}`);
        try {
            const res = await fetch(route('culaan-bot.rumah-alamat', voter.id), {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Gagal');
            const data = await res.json();
            setAddressVoters(data.voters ?? []);
        } catch {
            setAddressVoters([]);
        } finally {
            setLoadingAddress(false);
        }
    };

    const updateLocalCollections = (voter) => {
        setSuggestions((current) => current.filter((item) => item.id !== voter.id));
        setLocalVoters((current) => {
            const nextData = (current.data ?? []).filter((item) => item.id !== voter.id);
            return { ...current, data: nextData, total: Math.max(0, (current.total ?? 0) - 1) };
        });
        setLocalSummary((current) => ({ ...current, total: Math.max(0, (current.total ?? 0) - 1) }));
        setCulaSemulaIds((prev) => { const next = new Set(prev); next.delete(voter.id); return next; });
    };

    const handleAvatarUpload = async (file, voterId) => {
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
        finally { setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: false })); }
    };

    const handleFileSelect = (e, voterId) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setCropVoterId(voterId);
        setCropFile(file);
    };

    const handleCropUpload = (croppedFile) => {
        handleAvatarUpload(croppedFile, cropVoterId);
        setCropFile(null);
        setCropVoterId(null);
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
            updateLocalCollections({ ...selectedVoterForCula, cula_code: code, cula_display_label: label });
            if (detailVoter?.id === selectedVoterForCula.id) closeDetail();
            setSelectedVoterForCula(null);
            setActiveVoterId(null);
        } catch { setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.'); }
    };

    const [filterOpen, setFilterOpen] = useState(() => Boolean(filters.locality || showMarked || filterRumah || filterAlamat || filterRumahAlamat || ageFrom || ageTo || showAll || hashtags.length));
    const [culaFilterOpen, setCulaFilterOpen] = useState(false);
    const [hashtagFilterOpen, setHashtagFilterOpen] = useState(true);
    const orderedHashtags = [...available_hashtags].sort((a, b) => {
        const aIsXaktif = String(a.name).trim().toLowerCase() === '#xaktif';
        const bIsXaktif = String(b.name).trim().toLowerCase() === '#xaktif';
        return Number(aIsXaktif) - Number(bIsXaktif);
    });
    const visibleHashtags = orderedHashtags.filter((hashtag) => Number(hashtag.count ?? 0) > 0);
    const hasFilterValue = filters.udm || filters.locality || showMarked || filterRumah || filterAlamat || filterRumahAlamat || ageFrom || ageTo || showAll || hashtags.length > 0;
    const shouldPromptUdm = !filters.udm && !filters.locality;

    const clearAllFilters = () => {
        setShowMarked(false);
        setFilterRumah(false);
        setFilterAlamat(false);
        setFilterRumahAlamat(false);
        setShowAll(false);
        setCulaCodes([]);
        setHashtags([]);
        setAgeFrom('');
        setAgeTo('');
        setSearch('');
        setSuggestions([]);
        applyFilters({
            udm: formState.udm,
            locality: formState.locality,
            show_marked: false,
            filter_rumah: false,
            filter_alamat: false,
            filter_rumah_alamat: false,
            show_all: false,
            cula_codes: [],
            hashtags: [],
            age_from: '',
            age_to: '',
        });
    };

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

            <div className="mx-auto max-w-2xl space-y-3 px-2 sm:px-4">
                <section id="card-carian" className="sticky top-0 z-20 -mx-2 space-y-2 bg-slate-50/90 px-2 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/60 shadow-sm shadow-emerald-900/5">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                        <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-emerald-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            </span>
                            <input id="bot-search" value={search}
                                onChange={(e) => doSearch(e.target.value)}
                                className="w-full border-0 bg-transparent py-4 pl-12 pr-24 text-sm font-semibold text-slate-800 placeholder:text-sm placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0"
                                placeholder="Cari nama, no KP, telefon..."
                            />
                            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                                {search && (
                                    <button type="button" onClick={clearSearch}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-500 transition hover:bg-red-100 hover:text-red-600">
                                        ×
                                    </button>
                                )}
                                <button type="button" onClick={() => setFilterOpen((v) => !v)}
                                    title="Tapis"
                                    className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition ${filterOpen ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                    <span>{hasFilterValue ? '✓' : 'Tapis'}</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    {filterOpen && (
                        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 px-4 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Tapis Lanjutan</p>
                            </div>
                            <div className="grid gap-3 p-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="bot-udm" className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">UDM</label>
                                        <select id="bot-udm" value={formState.udm}
                                            onChange={(e) => updateFilter('udm', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                            <option value="">Semua UDM</option>
                                            {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="bot-locality" className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Lokaliti</label>
                                        <select id="bot-locality" value={formState.locality}
                                            onChange={(e) => updateFilter('locality', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                            <option value="">Semua Lokaliti</option>
                                            {localities.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="bot-age-from" className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Umur Dari</label>
                                        <input id="bot-age-from" type="number" min="0" max="150" value={ageFrom}
                                            onChange={(e) => setAgeFrom(e.target.value)}
                                            onBlur={(e) => updateFilter('age_from', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            placeholder="cth: 18"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="bot-age-to" className="mb-1 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Hingga</label>
                                        <input id="bot-age-to" type="number" min="0" max="150" value={ageTo}
                                            onChange={(e) => setAgeTo(e.target.value)}
                                            onBlur={(e) => updateFilter('age_to', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            placeholder="cth: 60"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Pilihan Pantas</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ToggleTile label="Siap Cula" icon="check" iconColor="emerald" active={showMarked} onToggle={toggleShowMarked} />
                                        <ToggleTile label="Sama No Rumah" icon="home" iconColor="blue" active={filterRumah} onToggle={toggleFilterRumah} disabled={filterRumahAlamat} />
                                        <ToggleTile label="Sama Alamat" icon="map" iconColor="amber" active={filterAlamat} onToggle={toggleFilterAlamat} disabled={filterRumahAlamat} />
                                        <ToggleTile label="Sama No & Alamat" icon="target" iconColor="rose" active={filterRumahAlamat} onToggle={toggleFilterRumahAlamat} />
                                        <ToggleTile label="Semua Pemilih" icon="list" iconColor="slate" active={showAll} onToggle={toggleShowAll} />
                                    </div>
                                </div>
                                {visibleHashtags.length > 0 && (
                                    <div>
                                        <button type="button" onClick={() => setHashtagFilterOpen((value) => !value)}
                                            aria-expanded={hashtagFilterOpen}
                                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 hover:text-slate-800">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                className={`h-3 w-3 transition-transform duration-200 ${hashtagFilterOpen ? 'rotate-90' : ''}`}>
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                            Hashtag Pemilih
                                            {hashtags.length > 0 && (
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                                    {hashtags.length} dipilih
                                                </span>
                                            )}
                                        </button>
                                        {hashtagFilterOpen && (
                                            <div className="mt-1.5 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                                                {visibleHashtags.map((hashtag) => {
                                                    const count = Number(hashtag.count ?? 0);
                                                    const selected = hashtags.includes(hashtag.name);
                                                    return (
                                                        <button
                                                            key={hashtag.name}
                                                            type="button"
                                                            onClick={() => toggleHashtag(hashtag.name)}
                                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${selected ? 'border-green-500 bg-green-600 text-white shadow-sm' : 'border-green-200 bg-white text-green-700 hover:border-green-400 hover:bg-green-50'}`}
                                                        >
                                                            {hashtag.name} - {count}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {showAll && available_cula_codes.length > 0 && (
                                    <div>
                                        <button type="button" onClick={() => setCulaFilterOpen((v) => !v)}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:text-slate-700">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                className={`h-3 w-3 transition-transform duration-200 ${culaFilterOpen ? 'rotate-90' : ''}`}>
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                            Tapisan Kod Cula
                                            {culaCodes.length > 0 && (
                                                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{culaCodes.length}</span>
                                            )}
                                        </button>
                                        {culaFilterOpen && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                 {available_cula_codes.map((c) => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => toggleCulaCode(c.code)}
                                                        className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md ${
                                                            culaCodes.includes(c.code)
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700'
                                                        }`}
                                                    >
                                                        {c.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {hasFilterValue && (
                                    <button type="button" onClick={clearAllFilters}
                                        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                        Reset Semua Tapis
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {(actionError || searchError) && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            {actionError || searchError}
                        </div>
                    )}
                </section>

                <div id="voter-count" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5">
                        <button type="button" onClick={() => persistViewMode('list')}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            Senarai
                        </button>
                        <button type="button" onClick={() => persistViewMode('card')}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${viewMode === 'card' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            Penuh
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Jumlah</span>
                        <span className="text-base font-black text-emerald-800">{search.trim().length >= 2 ? rows.length : fmt(localSummary.total)}</span>
                    </div>
                </div>

                <section id="voter-list">
                        {viewMode === 'list' ? (
                        <div className="grid gap-2">
                            {rows.map((voter, index) => {
                                const namaAyah = extractNamaAyah(voter.name);
                                const isSearchResult = search.trim().length >= 2;
                                const active = activeVoterId === voter.id;
                                const done = voter.is_marked;
                                const cardClass = active
                                    ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 ring-2 ring-emerald-400/40 shadow-md shadow-emerald-500/20'
                                    : (done ? 'border-slate-200 bg-slate-50/80' : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10');
                                const nameColor = done ? 'text-slate-400 line-through' : (active ? 'text-emerald-900' : 'text-slate-800');
                                const avatarWrapClass = done ? 'opacity-60 grayscale' : '';
                                return (
                                    <button key={voter.id} id={`voter-${voter.id}`} type="button" onClick={() => { markActive(voter.id); setDetailVoter(voter); }}
                                        style={{ scrollMarginTop: '12rem' }}
                                        className={`group relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl border p-2.5 text-left transition active:scale-[0.98] ${cardClass}`}>
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black shadow-sm ${done ? 'bg-slate-300 text-white' : (active ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white' : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700')}`}>
                                            {isSearchResult ? index + 1 : (localVoters.from ?? 0) + index}
                                        </span>
                                        {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                            <img src={avatarUpdates[voter.id] || voter.avatar_url} alt=""
                                                className={`h-9 w-9 shrink-0 rounded-xl object-cover border border-slate-200 ${avatarWrapClass}`}
                                                onClick={(e) => { e.stopPropagation(); setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url); }} />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-bold leading-5 ${nameColor}`}>
                                                {voter.name}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500">
                                                {voter.no_kp && <span>{voter.no_kp}</span>}
                                                {voter.locality && <span className="truncate">· {voter.locality}</span>}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <span className={`flex h-6 min-w-[2rem] items-center justify-center rounded-lg px-1.5 text-[10px] font-black ${done ? 'bg-slate-200 text-slate-500' : (active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700')}`}>
                                                {voter.age ?? '-'} thn
                                            </span>
                                            {(voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA')) || (voter.cula_code && voter.cula_code !== '0' && voter.cula_code !== '?' && voter.cula_code !== '') ? (
                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                                                    {voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA') ? voter.cula_display_label : voter.cula_code}
                                                </span>
                                            ) : null}
                                        </div>
                                        {done && (
                                            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        ) : (
                        <div id="senarai-grid" className="grid gap-3 sm:grid-cols-2">
                            {rows.map((voter, index) => {
                                const isSearchResult = search.trim().length >= 2;
                                const phone = voter.phone_mobile || voter.phone_home;
                                const namaAyah = extractNamaAyah(voter.name);
                                const active = activeVoterId === voter.id;
                                const done = voter.is_marked;
                                return (
                                    <div key={voter.id}
                                        onClick={() => markActive(voter.id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markActive(voter.id); } }}
                                        className={`rounded-xl border bg-white p-3 shadow-sm overflow-hidden cursor-default transition-colors duration-300 ease-in-out hover:shadow-md ${active ? 'border-black' : done ? 'border-slate-300 bg-slate-50/60' : 'border-green-600'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-500 text-xs font-black text-white shadow-sm">
                                                {isSearchResult ? index + 1 : (localVoters.from ?? 0) + index}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold leading-5 text-slate-800">
                                                    {voter.name}
                                                </p>
                                                {((voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA')) || (voter.cula_code && voter.cula_code !== '0' && voter.cula_code !== '?' && voter.cula_code !== '')) && (
                                                    <p className="mt-0.5">
                                                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                            Cula: {voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA') ? voter.cula_display_label : voter.cula_code}
                                                        </span>
                                                    </p>
                                                )}
                                                <p className="mt-0.5 text-xs font-medium uppercase leading-4 tracking-[0.03em] text-slate-500">
                                                    {(() => {
                                                        const rum = voter.no_rumah && voter.no_rumah !== '-' && voter.no_rumah !== '' ? voter.no_rumah : '';
                                                        const alm = (voter.alamat_kediaman && voter.alamat_kediaman !== '-' && voter.alamat_kediaman !== '')
                                                            ? voter.alamat_kediaman
                                                            : (voter.alamat_kp && voter.alamat_kp !== '-' && voter.alamat_kp !== '' ? voter.alamat_kp : (voter.address || ''));
                                                        if (!rum && !alm) return null;
                                                        const cleanAlm = addressHasRum(alm, rum) ? stripRum(alm, rum) : alm;
                                                        return (
                                                            <>
                                                                {rum && <RumahBadge voter={voter} onRumahClick={loadRumahVoters} />}
                                                                {cleanAlm || '-'}
                                                            </>
                                                        );
                                                    })()}
                                                </p>
                                            </div>
                                            {done && (
                                                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 space-y-2 text-xs">
                                            <div className="grid gap-2" style={{gridTemplateColumns: 'auto auto 1fr'}}>
                                                <div className="flex items-center gap-2">
                                                    {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                                        <div className="shrink-0">
                                                            <img src={avatarUpdates[voter.id] || voter.avatar_url} alt="" className="h-7 w-7 cursor-pointer rounded-full object-cover border border-slate-200" onClick={(e) => { e.stopPropagation(); setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url); }} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-green-700">No Kp</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.no_kp || voter.old_ic || '-'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Telefon </span>
                                                    {phone ? <a href={`tel:${phone}`} className="mt-0.5 inline-block font-bold text-slate-800 hover:text-green-700 hover:underline" onClick={(e) => e.stopPropagation()}>{phone}</a> : <p className="mt-0.5 font-bold text-slate-800">-</p>}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Umur</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="font-semibold text-green-700">UDM</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{voter.dm || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Lokaliti</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{voter.locality || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {!voter.is_manual && (
                                                <>
                                                    <input type="file" accept="image/*" id={`card-avatar-${voter.id}`}
                                                        onChange={(e) => handleFileSelect(e, voter.id)} className="hidden" />
                                                    <button type="button"
                                                        onClick={(e) => { e.stopPropagation(); document.getElementById(`card-avatar-${voter.id}`)?.click(); }}
                                                        disabled={uploadingAvatarIds[voter.id]}
                                                        className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:opacity-40"
                                                        title="Muat naik gambar">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
                                                    </button>
                                                    {voter.address && voter.address !== '-' && voter.address_count >= 2 && voter.address_count <= 10 && (
                                                        <button type="button"
                                                            onClick={(e) => { e.stopPropagation(); filterRumahAlamat && voter.no_rumah && voter.no_rumah !== '-' ? loadRumahAlamat(voter) : loadAddressVoters(voter); }}
                                                            className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                            title={filterRumahAlamat ? 'No & Alamat sama' : `Alamat sama: ${voter.address}`}>
                                                            <HomeIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {namaAyah && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); doSearchNamaAyah(namaAyah); setFilterOpen(true); }}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                    title={`Cari keluarga: ${namaAyah}`}>
                                                    <UserGroupIcon className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {!voter.is_marked ? (
                                                <>
                                                    {culaSemulaIds.has(voter.id) ? (
                                                        <>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedVoterForCula(voter); setShowCulaModal(true); }}
                                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500">
                                                                Siap Cula
                                                            </button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setCulaSemulaIds((prev) => { const next = new Set(prev); next.delete(voter.id); return next; }); }}
                                                                className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                                title="Kembali ke asal">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setCulaSemulaIds((prev) => new Set([...prev, voter.id])); window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); }}
                                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                                            Cula
                                                        </button>
                                                    )}
                                                    <a href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                                        className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                                        Tukar Tel
                                                    </a>
                                                </>
                                            ) : (
                                                <>
                                                    {culaSemulaIds.has(voter.id) ? (
                                                        <>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedVoterForCula(voter); setShowCulaModal(true); }}
                                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500">
                                                                Siap Cula
                                                            </button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setCulaSemulaIds((prev) => { const next = new Set(prev); next.delete(voter.id); return next; }); }}
                                                                className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                                title="Kembali ke asal">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setCulaSemulaIds((prev) => new Set([...prev, voter.id])); window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); }}
                                                            className="inline-flex flex-1 items-center justify-center rounded-md bg-rose-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500">
                                                            Buka
                                                        </button>
                                                    )}
                                                    <a href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                                        className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                                        Tukar Tel
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {search.trim().length < 2 && (
                        <Pagination voters={localVoters} onNavigate={goToPage} />
                    )}
                </section>
            </div>

            {lightboxSrc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3" onClick={() => setLightboxSrc(null)} onKeyDown={(e) => { if (e.key === 'Escape') setLightboxSrc(null); }} role="presentation">
                    <img src={lightboxSrc} alt="Avatar" className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
                    <button type="button" onClick={() => setLightboxSrc(null)}
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}

            {detailVoter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3" onClick={closeDetail} onKeyDown={(e) => { if (e.key === 'Escape') closeDetail(); }} role="presentation">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/30" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500" />
                        <button type="button" onClick={closeDetail}
                            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                        <div className="relative px-5 pt-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative shrink-0 h-14 w-14">
                                    {(avatarUpdates[detailVoter.id] || detailVoter.avatar_url) ? (
                                        <img src={avatarUpdates[detailVoter.id] || detailVoter.avatar_url} alt=""
                                            className="h-14 w-14 cursor-pointer rounded-2xl object-cover ring-4 ring-white shadow-lg"
                                            onClick={() => setLightboxSrc(avatarUpdates[detailVoter.id] || detailVoter.avatar_url)} />
                                    ) : (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-white/60 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
                                            title="Tambah gambar">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 opacity-80">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                        </div>
                                    )}
                                    {detailVoter.is_marked && (
                                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-lg font-black leading-tight text-white drop-shadow-sm">{detailVoter.name}</h3>
                                    <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-black text-slate-800 shadow-sm">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-emerald-700"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>
                                        <span className="truncate">{detailVoter.no_kp || detailVoter.old_ic || '-'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="relative space-y-3 px-5 pb-5 pt-2">
                            <div className="grid grid-cols-[auto_1fr] gap-2">
                                <InfoTile label="Umur" value={detailVoter.age ?? '-'} suffix="thn" accent className="min-w-[4.5rem]" />
                                {!formState.udm && <InfoTile label="UDM" value={detailVoter.dm || '-'} />}
                                {!formState.locality && <InfoTile label="Lokaliti" value={detailVoter.locality || '-'} />}
                            </div>
                            {(() => {
                                const dv = detailVoter;
                                const rum = dv.no_rumah && dv.no_rumah !== '-' && dv.no_rumah !== '' ? dv.no_rumah : '';
                                const alm = (dv.alamat_kediaman && dv.alamat_kediaman !== '-' && dv.alamat_kediaman !== '')
                                    ? dv.alamat_kediaman
                                    : (dv.alamat_kp && dv.alamat_kp !== '-' && dv.alamat_kp !== '' ? dv.alamat_kp : dv.address);
                                if (!alm && !rum) return null;
                                const cleanAlm = addressHasRum(alm, rum) ? stripRum(alm, rum) : alm;
                                return (
                                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
                                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Alamat</p>
                                        <p className="flex items-start gap-1.5 text-sm font-semibold text-slate-800">
                                            {rum && <RumahBadge voter={dv} onRumahClick={loadRumahVoters} />}
                                            <span>{cleanAlm || '-'}</span>
                                        </p>
                                    </div>
                                );
                            })()}
                            {((detailVoter.cula_display_label && !detailVoter.cula_display_label.includes('BELUM DICULA')) || (detailVoter.cula_code && detailVoter.cula_code !== '0' && detailVoter.cula_code !== '?')) && (
                                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Status Cula</p>
                                        <p className="mt-0.5 text-base font-black text-emerald-900">{detailVoter.cula_display_label && !detailVoter.cula_display_label.includes('BELUM DICULA') ? detailVoter.cula_display_label : detailVoter.cula_code}</p>
                                    </div>
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                </div>
                            )}
                            {detailVoter.marked_by_name && (
                                <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                                    <span className="font-bold text-slate-700">Dikemas oleh:</span> {detailVoter.marked_by_name}
                                </div>
                            )}
                            {!detailVoter.is_manual && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <input type="file" accept="image/*" id={`detail-avatar-${detailVoter.id}`}
                                        onChange={(e) => handleFileSelect(e, detailVoter.id)} className="hidden" />
                                    <button type="button"
                                        onClick={(e) => { e.stopPropagation(); document.getElementById(`detail-avatar-${detailVoter.id}`)?.click(); }}
                                        disabled={uploadingAvatarIds[detailVoter.id]}
                                        className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:opacity-40"
                                        title="Muat naik gambar">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
                                    </button>
                                    {!fromAddressPopup.current && detailVoter.address && detailVoter.address !== '-' && detailVoter.address_count >= 2 && detailVoter.address_count <= 10 && (
                                        <button type="button"
                                            onClick={() => { previousDetailVoter.current = detailVoter; setDetailVoter(null); filterRumahAlamat && detailVoter.no_rumah && detailVoter.no_rumah !== '-' ? loadRumahAlamat(detailVoter) : loadAddressVoters(detailVoter); }}
                                            className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                            title={filterRumahAlamat ? 'No & Alamat sama' : `Alamat sama: ${detailVoter.address}`}>
                                            <HomeIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {(() => { const namaAyah = extractNamaAyah(detailVoter.name); return namaAyah ? (
                                        <button type="button"
                                            onClick={() => { setDetailVoter(null); setFilterOpen(true); doSearchNamaAyah(namaAyah); }}
                                            className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                            title={`Cari keluarga: ${namaAyah}`}>
                                            <UserGroupIcon className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null; })()}
                                </div>
                            )}
                            <div className="flex gap-2 border-t border-slate-200 pt-3">
                                {!detailVoter.is_marked ? (
                                    <>
                                        {culaSemulaIds.has(detailVoter.id) ? (
                                            <>
                                                <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setShowCulaModal(true); }}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500">
                                                    Siap Cula
                                                </button>
                                                <button type="button" onClick={() => {
                                                    setCulaSemulaIds((prev) => {
                                                        const next = new Set(prev);
                                                        next.delete(detailVoter.id);
                                                        return next;
                                                    });
                                                }}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                    title="Kembali ke asal">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                </button>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, detailVoter.id])); window.open(buildTelegramLink('kemascula', detailVoter.telegram_identity), '_blank'); }}
                                                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                                Cula
                                            </button>
                                        )}
                                        <a href={buildTelegramLink('kemastel', detailVoter.telegram_identity)}
                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                            Tukar Tel
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        {culaSemulaIds.has(detailVoter.id) ? (
                                            <>
                                                <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setShowCulaModal(true); }}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500">
                                                    Siap Cula
                                                </button>
                                                <button type="button" onClick={() => {
                                                    setCulaSemulaIds((prev) => {
                                                        const next = new Set(prev);
                                                        next.delete(detailVoter.id);
                                                        return next;
                                                    });
                                                }}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                    title="Kembali ke asal">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                </button>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, detailVoter.id])); window.open(buildTelegramLink('kemascula', detailVoter.telegram_identity), '_blank'); }}
                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-rose-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500">
                                                Buka
                                            </button>
                                        )}
                                        <a href={buildTelegramLink('kemastel', detailVoter.telegram_identity)}
                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                            Tukar Tel
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddressPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3" onClick={() => { const prev = previousDetailVoter.current; previousDetailVoter.current = null; if (prev) { setDetailVoter(prev); } setShowAddressPopup(false); setAddressVoters([]); }} onKeyDown={(e) => { if (e.key === 'Escape') { const prev = previousDetailVoter.current; previousDetailVoter.current = null; if (prev) { setDetailVoter(prev); } setShowAddressPopup(false); setAddressVoters([]); } }} role="presentation">
                    <div className="relative flex w-full max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/30" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 px-5 pb-5 pt-4">
                            <button type="button" onClick={() => { const prev = previousDetailVoter.current; previousDetailVoter.current = null; if (prev) { setDetailVoter(prev); } setShowAddressPopup(false); setAddressVoters([]); }}
                                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                            <div className="flex items-center gap-3 text-white pr-12">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    {addressPopupVoterName.current && (
                                        <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/80">{addressPopupVoterName.current}</p>
                                    )}
                                    <h3 className="truncate text-base font-black text-white drop-shadow-sm">{addressPopupTitle}</h3>
                                </div>
                                {!loadingAddress && addressVoters.length > 0 && (
                                    <span className="shrink-0 rounded-full bg-white/25 px-2.5 py-1 text-xs font-black text-white backdrop-blur">{addressVoters.length}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            {loadingAddress ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                                    <p className="mt-3 text-xs font-medium text-slate-500">Mencari...</p>
                                </div>
                            ) : addressVoters.length === 0 ? (
                                <p className="py-10 text-center text-xs font-medium text-slate-500">Tiada pemilih lain dengan alamat yang sama.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {[...addressVoters].sort((a, b) => (a.age ?? 999) - (b.age ?? 999)).map((v) => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => {
                                                fromAddressPopup.current = true;
                                                previousDetailVoter.current = null;
                                                markActive(v.id);
                                                setDetailVoter(v);
                                                setShowAddressPopup(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition active:scale-[0.98] hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-violet-50"
                                        >
                                            {(avatarUpdates[v.id] || v.avatar_url) ? (
                                                <img src={avatarUpdates[v.id] || v.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover border border-slate-200" />
                                            ) : (
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                        <circle cx="12" cy="7" r="4"/>
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">{v.name}</p>
                                                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{formatAddress(v)}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-0.5">
                                                <span className="flex h-6 min-w-[1.8rem] items-center justify-center rounded-lg bg-slate-100 px-1.5 text-[10px] font-black text-slate-700">{v.age ?? '-'}</span>
                                                {v.cula_code && v.cula_code !== '0' && v.cula_code !== '?' && (
                                                    <span className="rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                                                        {v.cula_display_label || v.cula_code}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
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
                             {available_cula_codes.map((c) => {
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

            {cropFile && (
                <CropModal file={cropFile} onCrop={handleCropUpload} onClose={() => { setCropFile(null); setCropVoterId(null); }} />
            )}
        </AuthenticatedLayout>
    );
}
