import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';
import CropModal from '@/Components/CropModal';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const nf = new Intl.NumberFormat('ms-MY');
const hari = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
function fmtDate(d) { if (!d) return ''; const m = d.match(/^(\d{2})-(\d{2})-(\d{4})/); if (!m) return d; const dt = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(dt.getTime()) ? d : `${hari[dt.getDay()]}, ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
function fmt(v) { return nf.format(v ?? 0); }
function fmtP(v) { return `${fmt(v ?? 0)}%`; }
function fmtDiff(v, diff) {
    if (diff === undefined || diff === 0) return fmt(v);
    const isPos = diff > 0;
    if (!isPos) return fmt(v);
    return (
        <span className="inline-flex items-center gap-1 rounded px-1 py-0.5 bg-green-100 text-green-800">
            <span className="text-xs font-semibold">{fmt(v)}</span>
            <span className="text-[10px] font-bold opacity-80 inline-flex items-center">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>
                <span>{fmt(Math.abs(diff))}</span>
            </span>
        </span>
    );
}
function fmtCulaJadual(total, completed) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-xs font-semibold">{fmt(total)}</span>
            {completed > 0 && <span className="rounded bg-green-100 px-1 text-[10px] font-bold leading-tight text-green-700">+{completed}</span>}
        </span>
    );
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

function AddressDisplay({ voter, onRumahClick }) {
    const rum = voter.no_rumah && voter.no_rumah !== '-' && voter.no_rumah !== '' ? voter.no_rumah : '';
    const alm = (voter.alamat_kediaman && voter.alamat_kediaman !== '-' && voter.alamat_kediaman !== '')
        ? voter.alamat_kediaman
        : (voter.alamat_kp && voter.alamat_kp !== '-' && voter.alamat_kp !== '' ? voter.alamat_kp : (voter.address || ''));
    if (!rum && !alm) return '-';
    if (!rum) return alm;
    const cleanAlm = addressHasRum(alm, rum) ? stripRum(alm, rum) : alm;
    const hasRumahCount = voter.rumah_count >= 1;
    return (
        <>
            {hasRumahCount ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); onRumahClick?.(voter); }} title="Pemilih lain dengan rumah sama"
                    className="mr-1 inline-block rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700">
                    {rum}
                </button>
            ) : (
                <span className="mr-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{rum}</span>
            )}
            {cleanAlm || null}
        </>
    );
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

function HomeIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function HashIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
    );
}

const udmCulaGroups = { umno: new Set(['1', '1A', '1B', '1P']), pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']) };

function getBarColor(entry, i) {
    const c = entry?.code, l = entry?.display_label ?? '';
    if (c === '?' || l.includes('BELUM DICULA')) return '#475569';
    if (udmCulaGroups.umno.has(c)) return '#6366f1';
    if (udmCulaGroups.pas.has(c)) return '#10b981';
    if (c === '10') return '#ef4444';
    if (c === '5') return '#06b6d4';
    if (c === '9') return '#f97316';
    return ['#8b5cf6', '#f59e0b', '#64748b', '#14b8a6', '#e11d48', '#84cc16'][i % 6];
}

function StatCard({ label, value, detail, color = 'violet' }) {
    const colors = {
        violet: { card: 'border-slate-200 bg-white', icon: 'bg-green-100 text-green-700', value: 'text-slate-800', symbol: 'PE' },
        emerald: { card: 'border-lime-100 bg-white', icon: 'bg-lime-100 text-lime-700', value: 'text-emerald-700', symbol: 'OK' },
        amber: { card: 'border-amber-200 bg-white', icon: 'bg-amber-100 text-amber-700', value: 'text-orange-500', symbol: 'NO' },
        slate: { card: 'border-slate-200 bg-white', icon: 'bg-slate-100 text-slate-600', value: 'text-slate-800', symbol: 'DB' },
        cyan: { card: 'border-sky-100 bg-white', icon: 'bg-sky-100 text-sky-700', value: 'text-blue-700', symbol: '%' },
    };
    const theme = colors[color] ?? colors.violet;

    return (
        <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 shadow-sm ${theme.card}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${theme.icon}`}>{theme.symbol}</div>
            <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <p className={`mt-1 text-xl font-bold leading-none ${theme.value}`}>{fmt(value)}</p>
                {detail && <p className="mt-1 text-xs font-medium text-slate-600">{detail}</p>}
            </div>
        </div>
    );
}

function ChartPanel({ title, children, action, compact = false }) {
    return (
        <section className="card p-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">{title}</h3>
                {action}
            </div>
            <div className={`mt-2 w-full ${compact ? '' : 'h-[12rem] lg:h-[14rem]'}`}>{children}</div>
        </section>
    );
}

function TTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm">
            <p className="font-bold text-slate-800">{label}</p>
            {payload.map((item) => <p key={item.dataKey} className="mt-0.5 text-slate-600">{item.name}: {fmt(item.value)}</p>)}
        </div>
    );
}

function buildTelegramLink(command, identity) {
    const payload = identity ? `/${command} ${identity}` : `/${command}`;

    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(payload)}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function estimateExcelWidth(value) {
    const text = String(value ?? '').trim();

    if (text === '') {
        return 8;
    }

    return Array.from(text).reduce((total, character) => {
        if (/[A-Z0-9]/.test(character)) {
            return total + 1.15;
        }

        if (/[a-z]/.test(character)) {
            return total + 1;
        }

        if (character === ' ') {
            return total + 0.55;
        }

        return total + 1.05;
    }, 2);
}

function excelTextCell(value) {
    return {
        value: value ?? '-',
        type: 'String',
    };
}

function Pagination({ voters, onNavigate }) {
    if (!voters || voters.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {voters.from ?? 0} - {voters.to ?? 0} daripada {voters.total} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page - 1)}
                    disabled={!voters.prev_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Sebelum
                </button>
                {voters.links
                    ?.filter((link) => /^\d+$/.test(String(link.label)))
                    .map((link) => (
                        <button
                            key={link.label}
                            type="button"
                            onClick={() => onNavigate(Number(link.label))}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${link.active ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700'}`}
                        >
                            {link.label}
                        </button>
                    ))}
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page + 1)}
                    disabled={!voters.next_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Seterusnya
                </button>
            </div>
        </div>
    );
}

export default function CulaanIndex({ filters, summary, udms, localities, groups, voters, requires_udm, report, report_by_group = [], available_cula_codes = [], available_races = [], pemilih_report = null, data_error_count = 0 }) {
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];
    const canSenarai = allowedModules.includes('culaan.senarai');
    const canLaporan = allowedModules.includes('culaan.laporan');
    const canJadual = allowedModules.includes('culaan.jadual');
    const suggestionsAbort = useRef(null);
    const [tab, setTab] = useState(() => {
        if (filters.data_error) return 'data_error';
        if ((canJadual || canLaporan) && !canSenarai) return 'laporan';
        return 'senarai';
    });
    const isLaporanLike = tab === 'laporan' || tab === 'jadual';
    const isDataErrorTab = tab === 'data_error';
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [actionError, setActionError] = useState('');
    const [selectedVoterId, setSelectedVoterId] = useState(null);
    const [detailVoter, setDetailVoter] = useState(null);
    const closeDetail = () => {
        setDetailVoter(null);
        setShowAddressPopup(true);
        if (popupSourceRef.current === 'rumah_alamat' && lastRumahAlamatVoterRef.current) {
            loadRumahAlamatVoters(lastRumahAlamatVoterRef.current);
        } else if (popupSourceRef.current === 'rumah' && lastRumahVoterRef.current) {
            loadRumahVoters(lastRumahVoterRef.current);
        } else if (popupSourceRef.current === 'alamat' && lastAddressVoterRef.current) {
            loadAddressVoters(lastAddressVoterRef.current);
        }
    };
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [pendingIds, setPendingIds] = useState([]);
    const [addressVoters, setAddressVoters] = useState([]);
    const [showAddressPopup, setShowAddressPopup] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [addressPopupTitle, setAddressPopupTitle] = useState('Alamat Sama');
    const [localVoters, setLocalVoters] = useState(voters);
    const [localSummary, setLocalSummary] = useState(summary);
    const [cropFile, setCropFile] = useState(null);
    const [cropVoterId, setCropVoterId] = useState(null);
    const [uploadingAvatarIds, setUploadingAvatarIds] = useState({});
    const [avatarUpdates, setAvatarUpdates] = useState({});
    const [culaSemulaIds, setCulaSemulaIds] = useState(new Set());
    const [showCulaModal, setShowCulaModal] = useState(false);
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [isCulaFromDataError, setIsCulaFromDataError] = useState(false);
    const [batchProcessing, setBatchProcessing] = useState(false);
    const [jadualDiffMap, setJadualDiffMap] = useState({});
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('culaan_view_mode');
        if (saved) return saved;
        return auth.user?.preferences?.culaan_view_mode ?? 'table';
    });
    const [filterOpen, setFilterOpen] = useState(false);
    const jadualBaselineRef = useRef(null);
    const addressPopupVoterName = useRef('');
    const lastRumahVoterRef = useRef(null);
    const lastAddressVoterRef = useRef(null);
    const lastRumahAlamatVoterRef = useRef(null);
    const popupSourceRef = useRef('');

    const savePreference = (key, value) => {
        localStorage.setItem(key, value);
        fetch(route('preferences.save'), {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ key, value }),
        }).catch(() => {});
    };
    const jadualSessionKeyRef = useRef(null);
    const [formState, setFormState] = useState({
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: Boolean(filters.show_marked),
        data_error: Boolean(filters.data_error),
        group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
        cula_codes: filters.cula_codes ?? [],
        keturunan: filters.keturunan || 'M',
        jantina: filters.jantina ?? '',
        umur_dari: filters.umur_dari ?? '',
        umur_hingga: filters.umur_hingga ?? '',
        filter_rumah: Boolean(filters.filter_rumah),
        filter_alamat: Boolean(filters.filter_alamat),
        filter_rumah_alamat: Boolean(filters.filter_rumah_alamat ?? false),
        show_all: Boolean(filters.show_all),
    });

    useEffect(() => {
        setFormState({
            udm: filters.udm ?? '',
            locality: filters.locality ?? '',
            show_marked: Boolean(filters.show_marked),
            data_error: Boolean(filters.data_error),
            group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
            cula_codes: filters.cula_codes ?? [],
            keturunan: filters.keturunan || 'M',
            jantina: filters.jantina ?? '',
            umur_dari: filters.umur_dari ?? '',
            umur_hingga: filters.umur_hingga ?? '',
            filter_rumah: Boolean(filters.filter_rumah),
            filter_alamat: Boolean(filters.filter_alamat),
            filter_rumah_alamat: Boolean(filters.filter_rumah_alamat ?? false),
            show_all: Boolean(filters.show_all),
        });
    }, [filters.locality, filters.show_marked, filters.udm, filters.group_id, filters.custom_mode, filters.cula_codes, filters.keturunan, filters.jantina, filters.umur_dari, filters.umur_hingga, filters.data_error, filters.filter_rumah, filters.filter_alamat, filters.filter_rumah_alamat, filters.show_all]);

    const hasFilterValue = Boolean(formState.udm || formState.locality || formState.group_id === 'custom' || (formState.group_id && formState.group_id !== 'custom' && formState.group_id !== '') || formState.show_marked || formState.filter_rumah || formState.filter_alamat || formState.filter_rumah_alamat || formState.show_all || (formState.cula_codes?.length) || formState.keturunan || formState.jantina || formState.umur_dari || formState.umur_hingga || search.trim().length >= 2);

    useEffect(() => {
        if (filters.data_error) {
            setTab('data_error');
        }
    }, [filters.data_error]);

    useEffect(() => {
        setLocalVoters(voters);
        setLocalSummary(summary);
        setActionError('');
        setPendingIds([]);
    }, [summary, voters]);

    const rows = useMemo(() => {
        if (search.trim().length >= 2 && suggestions.length > 0) {
            return suggestions;
        }

        if (search.trim().length >= 2 && !searching) {
            return suggestions;
        }

        return localVoters.data ?? [];
    }, [localVoters.data, search, searching, suggestions]);

    const applyFilters = (nextState, options = {}) => {
        router.get(route('culaan.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            ...options,
        });
    };

    const refreshPage = () => {
        router.reload({
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page) => {
        applyFilters(
            {
                ...formState,
                page,
            },
            {
                onFinish: () => {
                    const el = document.getElementById('senarai-grid');
                    if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                },
            }
        );
    };

    const updateFilter = (key, value) => {
        const nextState = {
            ...formState,
            [key]: value,
        };

        if (key === 'udm' && value !== formState.udm) {
            nextState.locality = '';
        }

        setFormState(nextState);
        applyFilters(nextState);
    };

    const toggleCulaCode = (code) => {
        const current = formState.cula_codes ?? [];
        const next = current.includes(code)
            ? current.filter((c) => c !== code)
            : [...current, code];
        updateFilter('cula_codes', next);
    };

    const resetCustomFilters = () => {
        const nextState = {
            ...formState,
            keturunan: '',
            jantina: '',
            umur_dari: '',
            umur_hingga: '',
            cula_codes: [],
        };
        setFormState(nextState);
        applyFilters(nextState);
    };

    const handleFilterRumah = (checked) => {
        const nextState = { ...formState, filter_rumah: checked };
        if (checked && nextState.filter_rumah_alamat) nextState.filter_rumah_alamat = false;
        setFormState(nextState);
        applyFilters(nextState);
    };

    const handleFilterAlamat = (checked) => {
        const nextState = { ...formState, filter_alamat: checked };
        if (checked && nextState.filter_rumah_alamat) nextState.filter_rumah_alamat = false;
        setFormState(nextState);
        applyFilters(nextState);
    };

    const handleFilterRumahAlamat = (checked) => {
        const nextState = { ...formState, filter_rumah_alamat: checked };
        if (checked) {
            nextState.filter_rumah = false;
            nextState.filter_alamat = false;
        }
        setFormState(nextState);
        applyFilters(nextState);
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

        const params = new URLSearchParams({
            q: value,
            udm: formState.udm,
            locality: formState.locality,
            show_marked: formState.show_marked ? '1' : '0',
            group_id: formState.group_id || '',
            keturunan: formState.keturunan,
            jantina: formState.jantina,
            umur_dari: formState.umur_dari ?? '',
            umur_hingga: formState.umur_hingga ?? '',
            filter_rumah: formState.filter_rumah ? '1' : '0',
            filter_alamat: formState.filter_alamat ? '1' : '0',
            filter_rumah_alamat: formState.filter_rumah_alamat ? '1' : '0',
            show_all: formState.show_all ? '1' : '0',
        });
        (formState.cula_codes ?? []).forEach((code) => params.append('cula_codes[]', code));

        try {
            const response = await fetch(`${route('culaan.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
                setSearchError('Carian tidak berjaya dimuatkan.');
            }
        } finally {
            setSearching(false);
        }
    };

    const handleSearchChange = async (event) => {
        await doSearch(event.target.value);
    };

    const clearSearch = () => {
        suggestionsAbort.current?.abort();
        setSearch('');
        setSuggestions([]);
        setSearching(false);
        setSearchError('');
    };

    const loadAddressVoters = async (voter) => {
        if (!voter.address || voter.address === '-') return;
        lastAddressVoterRef.current = voter;
        popupSourceRef.current = 'alamat';
        setLoadingAddress(true);
        setShowAddressPopup(true);
        addressPopupVoterName.current = voter.name;
        setAddressPopupTitle('Alamat Sama');
        setDetailVoter(null);
        try {
            const res = await fetch(route('culaan.alamat', voter.id), {
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
        setDetailVoter(null);
        try {
            const res = await fetch(route('culaan.rumah', voter.id), {
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

    const loadRumahAlamatVoters = async (voter) => {
        if (!voter.no_rumah || voter.no_rumah === '-' || !voter.locality || !voter.address) return;
        lastRumahAlamatVoterRef.current = voter;
        popupSourceRef.current = 'rumah_alamat';
        setLoadingAddress(true);
        setShowAddressPopup(true);
        addressPopupVoterName.current = voter.name;
        setAddressPopupTitle(`No. Rumah & Alamat Sama`);
        setDetailVoter(null);
        try {
            const res = await fetch(route('culaan.rumah-alamat', voter.id), {
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

    const updateLocalCollections = (voter, marked) => {
        setSuggestions((current) => current.filter((item) => item.id !== voter.id));

        setLocalVoters((current) => {
            const nextData = (current.data ?? []).filter((item) => item.id !== voter.id);

            return {
                ...current,
                data: nextData,
                total: Math.max(0, (current.total ?? 0) + (marked ? -1 : -1)),
                to: nextData.length > 0 ? ((current.from ?? 1) + nextData.length - 1) : null,
            };
        });

        setLocalSummary((current) => ({
            ...current,
            total: Math.max(0, (current.total ?? 0) - 1),
        }));

        setCulaSemulaIds((prev) => {
            const next = new Set(prev);
            next.delete(voter.id);
            return next;
        });
    };

    const sendMarkRequest = async (voter, method) => {
        setActionError('');
        setPendingIds((current) => [...current, voter.id]);

        try {
            const response = await fetch(
                method === 'POST' ? route('culaan.mark.store', voter.id) : route('culaan.mark.destroy', voter.id),
                {
                    method,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Request failed');
            }

            await response.json();
            updateLocalCollections(voter, method === 'POST');
        } catch (error) {
            setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.');
        } finally {
            setPendingIds((current) => current.filter((id) => id !== voter.id));
        }
    };

    const markVoter = (voter) => sendMarkRequest(voter, 'POST');

    const unmarkVoter = (voter) => sendMarkRequest(voter, 'DELETE');

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
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: false }));
        }
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

    const handleApproveError = async (voter, action) => {
        setActionError('');
        setPendingIds((current) => [...current, voter.id]);

        try {
            const response = await fetch(route('culaan.approve-error', voter.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) throw new Error('Request failed');

            await response.json();
            updateLocalCollections(voter, true);
            refreshPage();
        } catch (error) {
            setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.');
        } finally {
            setPendingIds((current) => current.filter((id) => id !== voter.id));
        }
    };

    const handleCulaSiap = async (code, label) => {
        if (!selectedVoterForCula || !code) return;

        setActionError('');
        setShowCulaModal(false);
        try {
            const endpoint = isCulaFromDataError
                ? route('culaan.approve-error', selectedVoterForCula.id)
                : route('culaan.update-cula-mark', selectedVoterForCula.id);

            const body = isCulaFromDataError
                ? { action: 'update', cula_code: code, cula_display_label: label }
                : { cula_code: code, cula_display_label: label };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error('Request failed');

            await response.json();
            updateLocalCollections(selectedVoterForCula, true);
            setSelectedVoterForCula(null);
            refreshPage();
        } catch (error) {
            setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.');
        }
    };

    const handleCulaSama = () => {
        const newIds = new Set(culaSemulaIds);
        rows.forEach((voter) => {
            newIds.add(voter.id);
            window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank');
        });
        setCulaSemulaIds(newIds);
    };

    const handleSiapCulaSama = async () => {
        const idsToProcess = [...culaSemulaIds];
        if (idsToProcess.length === 0) return;

        setBatchProcessing(true);
        setActionError('');

        try {
            const response = await fetch(route('culaan.batch-approve-error'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    voter_ids: idsToProcess,
                    action: 'keep',
                }),
            });

            if (!response.ok) throw new Error('Request failed');

            setCulaSemulaIds(new Set());
            refreshPage();
        } catch (error) {
            setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.');
        } finally {
            setBatchProcessing(false);
        }
    };

    const visibleTotal = search.trim().length >= 2 ? rows.length : localSummary.total;
    const shouldPromptUdm = requires_udm && !formState.udm;
    const showLocalityColumn = formState.locality === '';
    const showUdmColumn = formState.udm === '';
    const selectedGroup = groups.find((g) => String(g.id) === String(formState.group_id));
    const groupSuffix = selectedGroup?.nama_group ? ` (${selectedGroup.nama_group})` : '';
    const headerTitle = isDataErrorTab ? `Data Error Culaan${groupSuffix}` : (isLaporanLike ? `Laporan Pemilih${groupSuffix}` : `Pemilih Belum Cula${groupSuffix}`);
    const headerDesc = isDataErrorTab
        ? 'Senarai pemilih yang mempunyai data culaan lama tetapi tiada kod cula dalam import terbaru.'
        : (isLaporanLike
            ? 'Statistik dan pecahan status culaan pemilih.'
            : 'Tapisan ikut UDM dan lokasi, kemudian kemas data atau tandakan rekod yang sudah diurus.');

    const tableColumns = useMemo(() => {
        if (report_by_group?.length > 0) {
            const seen = new Set();
            const ordered = [];
            const totals = {};
            report_by_group.forEach((rg) => {
                (rg.report.cula_breakdown ?? []).forEach((e) => {
                    totals[e.code] = (totals[e.code] ?? 0) + (e.total ?? 0);
                    if (!seen.has(e.code)) {
                        seen.add(e.code);
                        ordered.push(e.code);
                    }
                });
            });
            return ordered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        }
        if (selectedGroup) {
            return (report?.cula_breakdown ?? []).map((e) => e.code);
        }
        if (filters.custom_mode) {
            return (report?.cula_breakdown ?? []).map((e) => e.code);
        }
        return [];
    }, [report_by_group, selectedGroup, report, filters.custom_mode]);

    const codeLabels = useMemo(() => {
        const map = {};
        const groups = report_by_group?.length > 0 ? report_by_group : [];
        groups.forEach((rg) => {
            (rg.report.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        });
        if (groups.length === 0 && selectedGroup) {
            (report?.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        }
        if (groups.length === 0 && !selectedGroup && filters.custom_mode) {
            (report?.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        }
        return map;
    }, [report_by_group, selectedGroup, report, filters.custom_mode]);

    const tableRows = useMemo(() => {
        const groups = report_by_group?.length > 0 ? report_by_group : [];
        const sumBreakdown = (bm) => Object.values(bm).reduce((s, v) => s + v, 0);
        if (groups.length === 0 && selectedGroup) {
            const bm = {};
            const cm = {};
            (report?.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            (report?.completed_cula_breakdown ?? []).forEach((e) => { cm[e.code] = e.total; });
            return [{
                nama_group: selectedGroup.nama_group,
                umur_dari: selectedGroup.umur_dari,
                umur_akhir: selectedGroup.umur_akhir,
                breakdownMap: bm,
                completedMap: cm,
                jumlah: sumBreakdown(bm)
            }];
        }
        if (groups.length === 0 && filters.custom_mode) {
            const bm = {};
            const cm = {};
            (report?.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            (report?.completed_cula_breakdown ?? []).forEach((e) => { cm[e.code] = e.total; });
            return [{
                nama_group: 'Custom',
                umur_dari: filters.umur_dari,
                umur_akhir: filters.umur_hingga,
                breakdownMap: bm,
                completedMap: cm,
                jumlah: sumBreakdown(bm)
            }];
        }
        return groups.map((rg) => {
            const bm = {};
            const cm = {};
            (rg.report.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            (rg.report.completed_cula_breakdown ?? []).forEach((e) => { cm[e.code] = e.total; });
            return {
                nama_group: rg.group.nama_group,
                umur_dari: rg.group.umur_dari,
                umur_akhir: rg.group.umur_akhir,
                breakdownMap: bm,
                completedMap: cm,
                jumlah: sumBreakdown(bm)
            };
        });
    }, [report_by_group, selectedGroup, report, filters.custom_mode, filters.umur_dari, filters.umur_hingga]);

    const jadualSessionKey = useMemo(() => {
        const p = { udm: filters.udm, locality: filters.locality, group_id: filters.group_id, v: pemilih_report?.uploaded_at ?? '0' };
        return `cula_jadual_baseline_v3_${JSON.stringify(p)}`;
    }, [filters.udm, filters.locality, filters.group_id, pemilih_report?.uploaded_at]);

    useEffect(() => {
        if (!tableRows.length) return;
        if (jadualSessionKeyRef.current !== jadualSessionKey) {
            jadualBaselineRef.current = null;
            jadualSessionKeyRef.current = jadualSessionKey;
        }
        const baselineData = tableRows.map(r => ({
            nama_group: r.nama_group,
            breakdownMap: { ...r.breakdownMap },
            jumlah: r.jumlah,
        }));
        let prev = jadualBaselineRef.current;
        if (!prev) {
            try {
                const raw = sessionStorage.getItem(jadualSessionKey);
                if (raw) {
                    prev = JSON.parse(raw);
                    jadualBaselineRef.current = prev;
                }
            } catch {}
        }
        if (!prev) {
            jadualBaselineRef.current = baselineData;
            try { sessionStorage.setItem(jadualSessionKey, JSON.stringify(baselineData)); } catch {}
        }
        if (tab === 'jadual' && prev) {
            const diffs = {};
            for (const row of tableRows) {
                const p = prev.find(r => r.nama_group === row.nama_group);
                if (!p) continue;
                const rowDiffs = {};
                for (const code of tableColumns) {
                    const d = (row.breakdownMap[code] ?? 0) - (p.breakdownMap[code] ?? 0);
                    if (d !== 0) rowDiffs[code] = d;
                }
                const jd = (row.jumlah ?? 0) - (p.jumlah ?? 0);
                if (jd !== 0) rowDiffs.jumlah = jd;
                if (Object.keys(rowDiffs).length > 0) diffs[row.nama_group] = rowDiffs;
            }
            setJadualDiffMap(diffs);
        }
    }, [tableRows, tab, tableColumns, jadualSessionKey]);

    const exportToExcel = async () => {
        let exportRows = rows;

        if (search.trim().length < 2) {
            const params = new URLSearchParams({
                udm: formState.udm,
                locality: formState.locality,
                show_marked: formState.show_marked ? '1' : '0',
                group_id: formState.group_id || '',
                keturunan: formState.keturunan,
                jantina: formState.jantina,
                umur_dari: formState.umur_dari ?? '',
                umur_hingga: formState.umur_hingga ?? '',
            });
            (formState.cula_codes ?? []).forEach((code) => params.append('cula_codes[]', code));

            try {
                const resp = await fetch(`${route('culaan.export')}?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    exportRows = data.voters ?? [];
                }
            } catch (_) { /* fallback to paginated data */ }
        }

        const titleRows = [];
        const headers = ['No', 'No Kp', 'Nama', 'Alamat', 'Telefon', 'Cula'];
        const align = ['center', 'center', 'left', 'left', 'center', 'center'];
        const columnWidths = [37, 100, 278, 369, 90, 46];

        const dataRows = exportRows.map((voter, index) => {
            const cells = [
                { value: index + 1, type: 'Number', align: 'center' },
                { value: voter.no_kp || voter.old_ic || '-', type: 'String', align: 'center' },
                { value: voter.name || '-', type: 'String', align: 'left', wrap: true },
                { value: formatAddress(voter), type: 'String', align: 'left', wrap: true },
                { value: voter.phone_mobile || voter.phone_home || '-', type: 'String', align: 'center' },
                { value: '', type: 'String', align: 'center' },
            ];

            return cells;
        });

        const nowTitle = new Date();
        const dateStr = 'Tarikh : ' + String(nowTitle.getDate()).padStart(2, '0') + '-' + String(nowTitle.getMonth() + 1).padStart(2, '0') + '-' + nowTitle.getFullYear();

        if (formState.udm) {
            titleRows.push({
                value: formState.udm,
                styleId: 'titleMain',
            });
            titleRows.push({
                value: dateStr,
                styleId: 'titleDate',
            });
        }

        if (formState.locality) {
            titleRows.push({
                value: formState.locality,
                styleId: 'titleSub',
            });
        }

        if (selectedGroup?.nama_group) {
            titleRows.push({
                value: `Pengundi ${selectedGroup.nama_group}`,
                styleId: 'titleSub',
            });
        }

        const columnXml = columnWidths
            .map((w) => `<Column ss:AutoFitWidth="1" ss:Width="${w}"/>`)
            .join('');

        const titleRowXml = titleRows
            .map((title) => `
                <Row>
                    <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="${title.styleId}">
                        <Data ss:Type="String">${escapeXml(title.value)}</Data>
                    </Cell>
                </Row>
            `)
            .join('');

        const headerRowXml = `
            <Row>
                ${headers.map((header, i) => {
                    const hStyle = align[i] === 'center' ? 'headerCenter' : 'header';
                    return `<Cell ss:StyleID="${hStyle}">
                        <Data ss:Type="String">${escapeXml(header)}</Data>
                    </Cell>`;
                }).join('')}
            </Row>
        `;

        const bodyRowsXml = dataRows
            .map((cells) => `
                <Row>
                    ${cells.map((cell) => {
                        let styleId = cell.align === 'center' ? 'cellCenter' : 'cell';
                        if (cell.wrap) styleId += 'Wrap';
                        return `<Cell ss:StyleID="${styleId}">
                            <Data ss:Type="${cell.type}">${escapeXml(cell.value)}</Data>
                        </Cell>`;
                    }).join('')}
                </Row>
            `)
            .join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
            <Alignment ss:Vertical="Center"/>
            <Borders/>
            <Font ss:FontName="Calibri" ss:Size="11"/>
            <Interior/>
            <NumberFormat/>
            <Protection/>
        </Style>
        <Style ss:ID="titleMain">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="26" ss:Bold="1"/>
            <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="titleSub">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1"/>
            <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="titleDate">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="0"/>
            <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="header">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
            <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="headerCenter">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
            <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="cell">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
        <Style ss:ID="cellCenter">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
        <Style ss:ID="cellWrap">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
        <Style ss:ID="cellCenterWrap">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
    </Styles>
    <Worksheet ss:Name="Culaan">
        <Table>
            ${columnXml}
            ${titleRowXml}
            <Row></Row>
            ${headerRowXml}
            ${bodyRowsXml}
        </Table>
    </Worksheet>
</Workbook>`;

        const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        link.download = `CULA_${formState.udm || 'semua'}_${dd}-${mm}-${yyyy}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AuthenticatedLayout
            variant="light"
            header={
                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Culaan</p>
                        {formState.udm && <p className="mt-0.5 text-xl font-black uppercase tracking-[0.15em] text-slate-800">{formState.udm}</p>}
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">{headerTitle}</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">{headerDesc}</p>
                    </div>
                    {(tab === 'senarai' || tab === 'data_error') && formState.udm && (
                        <button
                            type="button"
                            onClick={exportToExcel}
                            className="hidden shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700 sm:inline-flex"
                        >
                            <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-black text-white">X</span>
                            Export Excel
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Culaan" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                {pemilih_report?.name && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <path d="M8 13h2"/>
                            <path d="M10 13v4"/>
                            <path d="M14 13h2"/>
                            <path d="M16 13v4"/>
                        </svg>
                        {pemilih_report?.uploaded_by && <span className="text-slate-500">Data terbaru dimuat naik oleh: <span className="font-bold text-slate-700">{pemilih_report.uploaded_by}</span></span>}
                        {pemilih_report?.uploaded_at && <span className="text-slate-500">Pada: <span className="font-bold text-slate-700">{fmtDate(pemilih_report.uploaded_at)}</span></span>}
                    </div>
                )}
                <section className={`grid gap-3 xl:items-stretch ${isLaporanLike ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_14rem]'}`}>
                    <div className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
                        <button type="button" onClick={() => setFilterOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left xl:hidden">
                            <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 text-green-600 transition-transform duration-200 xl:hidden ${filterOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Carian</span>
                                {!filterOpen && hasFilterValue && (
                                    <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-green-600 xl:hidden" />
                                )}
                            </div>
                            {!filterOpen && hasFilterValue && (
                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 xl:hidden">
                                    {formState.udm && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">{formState.udm}</span>}
                                    {formState.locality && <span>{formState.locality}</span>}
                                    {formState.group_id === 'custom' && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">Custom</span>}
                                    {formState.show_marked && <span className="rounded bg-green-100 px-1 py-0.5 text-green-700">Siap Cula</span>}
                                    {formState.filter_rumah && <span className="rounded bg-blue-100 px-1 py-0.5 text-blue-700">Rumah</span>}
                                    {formState.filter_alamat && <span className="rounded bg-amber-100 px-1 py-0.5 text-amber-700">Alamat</span>}
                                    {formState.show_all && <span className="rounded bg-slate-200 px-1 py-0.5 text-slate-700">Semua</span>}
                                </div>
                            )}
                        </button>
                        <div className={`${filterOpen ? 'block' : 'hidden'} xl:block border-t border-green-100 p-4 xl:border-0 xl:p-4`}>
                        <div className="grid gap-3 sm:grid-cols-2 xl:items-end xl:grid-cols-[12rem_12rem_10rem_minmax(0,1fr)]">
                            <div>
                                <label htmlFor="culaan-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                                <select
                                    id="culaan-udm"
                                    value={formState.udm}
                                    onChange={(event) => updateFilter('udm', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua UDM</option>
                                    {udms.map((udm) => (
                                        <option key={udm} value={udm}>{udm}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="culaan-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                                <select
                                    id="culaan-locality"
                                    value={formState.locality}
                                    onChange={(event) => updateFilter('locality', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Lokaliti</option>
                                    {localities.map((locality) => (
                                        <option key={locality} value={locality}>{locality}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="culaan-group" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Group Pemilih</label>
                                <select
                                    id="culaan-group"
                                    value={formState.group_id}
                                    onChange={(event) => updateFilter('group_id', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Group</option>
                                    <option value="custom">Custom</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>{g.nama_group}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="culaan-search" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Cari Pemilih</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="culaan-search"
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="input-field pr-10"
                                        placeholder="Nama, No Kp, telefon..."
                                    />
                                    {search ? (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100"
                                        >
                                            <span className="text-sm leading-none">×</span>
                                        </button>
                                    ) : (
                                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-green-600">⌕</span>
                                    )}
                                </div>
                                {searchError && <InputError className="mt-1" message={searchError} />}
                                {actionError && <InputError className="mt-1" message={actionError} />}

                            </div>
                        </div>

                        {tab === 'senarai' && !isDataErrorTab && (
                            <div className="mt-3 flex flex-wrap items-center gap-4">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formState.show_marked}
                                        onChange={(e) => updateFilter('show_marked', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500" />
                                    <span className="text-xs font-bold text-slate-600">Siap Cula</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formState.filter_rumah}
                                        onChange={(e) => handleFilterRumah(e.target.checked)}
                                        disabled={formState.filter_rumah_alamat}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500 disabled:opacity-40" />
                                    <span className="text-xs font-bold text-slate-600">Sama No. Rumah</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formState.filter_alamat}
                                        onChange={(e) => handleFilterAlamat(e.target.checked)}
                                        disabled={formState.filter_rumah_alamat}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500 disabled:opacity-40" />
                                    <span className="text-xs font-bold text-slate-600">Sama Alamat</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formState.filter_rumah_alamat}
                                        onChange={(e) => handleFilterRumahAlamat(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500" />
                                    <span className="text-xs font-bold text-slate-600">Sama No & Alamat</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formState.show_all}
                                        onChange={(e) => updateFilter('show_all', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500" />
                                    <span className="text-xs font-bold text-slate-600">Semua Pemilih</span>
                                </label>
                            </div>
                        )}

                        {formState.group_id === 'custom' && (
                            <><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:items-end">
                                <div>
                                    <label htmlFor="culaan-keturunan" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Keturunan</label>
                                    <select id="culaan-keturunan" value={formState.keturunan} onChange={(e) => updateFilter('keturunan', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        {available_races.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="culaan-jantina" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Jantina</label>
                                    <select id="culaan-jantina" value={formState.jantina} onChange={(e) => updateFilter('jantina', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        <option value="L">Lelaki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="culaan-umur-dari" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Dari</label>
                                    <input id="culaan-umur-dari" type="number" min="0" max="150" value={formState.umur_dari} onChange={(e) => updateFilter('umur_dari', e.target.value)} className="input-field mt-1.5" placeholder="cth: 21" />
                                </div>
                                <div>
                                    <label htmlFor="culaan-umur-hingga" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Hingga</label>
                                    <input id="culaan-umur-hingga" type="number" min="0" max="150" value={formState.umur_hingga} onChange={(e) => updateFilter('umur_hingga', e.target.value)} className="input-field mt-1.5" placeholder="cth: 60" />
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={resetCustomFilters}
                                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        </>)}
                        </div>
                    </div>

                    {tab === 'senarai' && !isDataErrorTab && (
                        <div className="flex items-center gap-3 rounded-xl border border-green-600 bg-white px-4 py-3 shadow-sm shadow-green-600/20 overflow-hidden">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg text-green-700">●●</div>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-green-700">Jumlah Paparan</p>
                                <p className="mt-0.5 text-2xl font-black leading-none text-slate-800">{visibleTotal}</p>
                            </div>
                        </div>
                    )}
                    {tab === 'data_error' && (
                        <div className="flex items-center gap-3 rounded-xl border border-amber-400 bg-white px-4 py-3 shadow-sm shadow-amber-400/20 overflow-hidden">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-600">!!</div>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600">Data Error</p>
                                <p className="mt-0.5 text-2xl font-black leading-none text-slate-800">{visibleTotal}</p>
                            </div>
                        </div>
                    )}
                </section>

                {(() => {
                    const tabs = [];
                    if (canSenarai) tabs.push({ k: 'senarai', l: 'Senarai Pemilih' });
                    if (canSenarai && data_error_count > 0) tabs.push({ k: 'data_error', l: `Data Error (${data_error_count})` });
                    if (canLaporan) tabs.push({ k: 'laporan', l: 'Laporan (Graf)' });
                    if (canJadual) tabs.push({ k: 'jadual', l: 'Laporan (Jadual)' });
                    if (tabs.length < 2) return null;
                    return (
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            <div className="flex gap-1">
                                {tabs.map((t) => (
                                    <button key={t.k} type="button" onClick={() => {
                                        setTab(t.k);
                                        if (t.k === 'data_error' || t.k === 'senarai') {
                                            updateFilter('data_error', t.k === 'data_error');
                                        }
                                    }}
                                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === t.k ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                                    {t.l}
                                </button>
                                ))}
                            </div>
                            {tab === 'senarai' && canSenarai && (
                                <div className="ml-auto flex gap-1">
                                    <button type="button" onClick={() => { setViewMode('card'); savePreference('culaan_view_mode', 'card'); }} className={`rounded-md p-1.5 transition ${viewMode === 'card' ? 'bg-green-600 text-white shadow-sm' : 'text-black hover:bg-green-50 hover:text-green-700'}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                                    </button>
                                    <button type="button" onClick={() => { setViewMode('table'); savePreference('culaan_view_mode', 'table'); }} className={`rounded-md p-1.5 transition ${viewMode === 'table' ? 'bg-green-600 text-white shadow-sm' : 'text-black hover:bg-green-50 hover:text-green-700'}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {tab === 'senarai' && (
                    <section>
                        {rows.length === 0 ? (
                            <p className="rounded-xl border border-green-600 bg-white py-6 text-center text-xs font-medium text-slate-500 shadow-sm shadow-green-600/20 overflow-hidden">
                                {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk memaparkan senarai culaan.' : 'Tiada pemilih untuk paparan ini.'}
                            </p>
                        ) : viewMode === 'card' ? (
                            <div id="senarai-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {rows.map((voter, index) => (
                                    <div
                                        key={voter.id}
                                        onClick={() => setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id); } }}
                                        role="button"
                                        tabIndex={0}
                                        className={`rounded-xl border bg-white p-3 shadow-sm overflow-hidden cursor-default transition-colors duration-300 ease-in-out hover:shadow-md ${voter.id === selectedVoterId ? 'border-black' : 'border-green-600'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-500 text-xs font-black text-white shadow-sm">
                                                {search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1.5 text-sm font-bold leading-5 text-slate-800">
                                                    {voter.name}
                                                    {(() => {
                                                        const namaAyah = extractNamaAyah(voter.name);
                                                        if (!namaAyah) return null;
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    doSearch(namaAyah);
                                                                    const el = document.getElementById('culaan-search');
                                                                    if (el) {
                                                                        el.focus();
                                                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }
                                                                }}
                                                                className="inline-flex shrink-0 items-center justify-center rounded-md border border-white bg-white px-1 py-0.5 text-slate-400 transition hover:border-slate-200 hover:text-green-600"
                                                                title={`Cari keluarga: ${namaAyah}`}
                                                            >
                                                                <UserGroupIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        );
                                                    })()}
                                                </p>
                                                {((voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA')) || (voter.cula_code && voter.cula_code !== '0' && voter.cula_code !== '?' && voter.cula_code !== '')) && (
                                                    <p className="mt-0.5">
                                                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                            Cula: {voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA') ? voter.cula_display_label : voter.cula_code}
                                                        </span>
                                                    </p>
                                                )}
                                                <p className="mt-0.5 text-xs font-medium uppercase leading-4 tracking-[0.03em] text-slate-500"><AddressDisplay voter={voter} onRumahClick={loadRumahVoters} /></p>
                                            </div>

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
                                                    {(() => {
                                                        const phone = voter.phone_mobile || voter.phone_home;
                                                        if (!phone) return <p className="mt-0.5 font-bold text-slate-800">-</p>;
                                                        return (
                                                            <a href={`tel:${phone}`} className="mt-0.5 inline-block font-bold text-slate-800 hover:text-green-700 hover:underline " onClick={(e) => e.stopPropagation()}>
                                                                {phone}
                                                            </a>
                                                        );
                                                    })()}
                                                </div>
                                                {!showLocalityColumn && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">Umur</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {showLocalityColumn && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className={voter.is_marked && voter.marked_by_name && voter.marked_by_id !== auth.user.id ? 'col-span-1' : 'col-span-2'}>
                                                        <span className="font-semibold text-green-700">Lokaliti</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.locality || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-green-700">Umur</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                    </div>
                                                    {voter.is_marked && voter.marked_by_name && voter.marked_by_id !== auth.user.id && (
                                                        <div className="flex items-end">
                                                            <span className="rounded bg-lime-100 px-2 py-0.5 text-xs font-bold text-lime-700">
                                                                {voter.marked_by_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {!voter.is_manual && <>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    id={`avatar-upload-${voter.id}`}
                                                    onChange={(e) => handleFileSelect(e, voter.id)}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); document.getElementById(`avatar-upload-${voter.id}`)?.click(); }}
                                                    disabled={uploadingAvatarIds[voter.id]}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:opacity-40"
                                                    title="Muat naik gambar"
                                                >
                                                    {uploadingAvatarIds[voter.id] ? (
                                                        <span className="text-xs font-bold">...</span>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
                                                    )}
                                                </button>
                                                {voter.address && voter.address !== '-' && voter.address_count >= 2 && voter.address_count <= 10 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); formState.filter_rumah_alamat && voter.no_rumah && voter.no_rumah !== '-' ? loadRumahAlamatVoters(voter) : loadAddressVoters(voter); }}
                                                        className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                        title={formState.filter_rumah_alamat ? `No & Alamat sama` : `Alamat sama: ${formatAddress(voter)}`}
                                                    >
                                                        <HomeIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                {!formState.show_marked && (culaSemulaIds.has(voter.id) ? (
                                                    <>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVoterForCula(voter);
                                                            setIsCulaFromDataError(false);
                                                            setShowCulaModal(true);
                                                        }}
                                                        className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
                                                    >
                                                        Siap Cula
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCulaSemulaIds((prev) => {
                                                                const next = new Set(prev);
                                                                next.delete(voter.id);
                                                                return next;
                                                            });
                                                        }}
                                                        className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                        title="Kembali ke asal"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                    </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCulaSemulaIds((prev) => new Set([...prev, voter.id]));
                                                            window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank');
                                                        }}
                                                        className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                    >
                                                    Cula
                                                </button>
                                                ))}
                                                <a
                                                    href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                >
                                                    Tukar Tel
                                                </a>
                                            </>}
                                            {voter.is_marked && (
                                                <button
                                                    type="button"
                                                    onClick={() => unmarkVoter(voter)}
                                                    disabled={pendingIds.includes(voter.id)}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md bg-rose-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {pendingIds.includes(voter.id) ? '...' : 'Buka'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div id="senarai-grid" className="w-full overflow-x-auto rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-green-50 text-left text-xs font-bold uppercase tracking-[0.05em] text-green-700">
                                            <th className="w-10 px-2 py-2.5 text-center">#</th>
                                            <th className="sticky left-0 z-20 bg-green-50 px-2 py-2.5">Nama</th>
                                            <th className="px-2 py-2.5">No KP</th>
                                            <th className="px-2 py-2.5">Telefon</th>
                                            {showUdmColumn && <th className="px-2 py-2.5">UDM</th>}
                                            {showLocalityColumn && <th className="px-2 py-2.5">Lokaliti</th>}
                                            <th className="w-12 px-2 py-2.5 text-center">Umur</th>
                                            <th className="w-48 px-2 py-2.5 text-center">Tindakan</th>
                                        </tr>
                                    </thead>
                                    {showUdmColumn ? (
                                        Object.entries(
                                            rows.reduce((acc, v) => {
                                                const raw = (v.dm || '').trim().replace(/\s+/g, ' ');
                                                const k = raw || 'Tanpa UDM';
                                                if (!acc[k]) acc[k] = [];
                                                acc[k].push(v);
                                                return acc;
                                            }, {})
                                        ).sort((a, b) => a[0].localeCompare(b[0]))
                                        .map(([udm, udmVoters]) => (
                                            <tbody key={udm}>
                                                <tr className="border-t border-slate-200 bg-slate-100">
                                                    <td colSpan={5 + (showLocalityColumn ? 1 : 0) + (showUdmColumn ? 1 : 0) + 2} className="px-3 py-2 text-sm font-black uppercase tracking-wider text-slate-700">
                                                        {udm}
                                                    </td>
                                                </tr>
                                                {[...udmVoters].sort((a, b) => {
                                                    const icA = (a.no_kp || a.old_ic || '').padStart(20, '0');
                                                    const icB = (b.no_kp || b.old_ic || '').padStart(20, '0');
                                                    return icA.localeCompare(icB);
                                                }).map((voter, i) => {
                                                    const globalIdx = search.trim().length >= 2 ? i + 1 : (localVoters.from ?? 0) + i;
                                                    return (
                                                        <tr key={voter.id} className="group border-t border-slate-100 hover:bg-slate-50">
                                                            <td className="px-2 py-2 text-center font-bold text-slate-500">{globalIdx}</td>
                                                              <td className="sticky left-0 z-10 bg-white px-2 py-2 group-hover:bg-slate-50">
                                                                  <div className="flex items-center gap-1.5">
                                                                      {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                                                          <img src={avatarUpdates[voter.id] || voter.avatar_url} alt="" className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url)} />
                                                                      )}
                                                                      <div className="min-w-0">
                                                                           <span className="font-semibold text-slate-800">{voter.name}</span>
                                                                           {((voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA')) || (voter.cula_code && voter.cula_code !== '0' && voter.cula_code !== '?' && voter.cula_code !== '')) && (
                                                                               <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-green-700">
                                                                                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                                                   Cula: {voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA') ? voter.cula_display_label : voter.cula_code}
                                                                               </span>
                                                                           )}
                                                                           {(() => { const a = formatAddress(voter); return a && a !== '-' ? <p className="text-[10px] font-medium text-slate-500 truncate">{a}</p> : null; })()}
                                                                      </div>
                                                                 </div>
                                                             </td>
                                                            <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-700">{voter.no_kp || voter.old_ic || '-'}</td>
                                                            <td className="whitespace-nowrap px-2 py-2">
                                                                {(() => {
                                                                    const phone = voter.phone_mobile || voter.phone_home;
                                                                    return phone ? <a href={`tel:${phone}`} className="font-mono text-slate-700 hover:text-green-700 hover:underline">{phone}</a> : '-';
                                                                })()}
                                                            </td>
                                                            {showUdmColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.dm || '-'}</td>}
                                                            {showLocalityColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.locality || '-'}</td>}
                                                            <td className="px-2 py-2 text-center font-bold text-slate-600">{voter.age ?? '-'}</td>
                                                            <td className="whitespace-nowrap px-2 py-2">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {!voter.is_manual && (
                                                                        <>
                                                                         <label className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600" title="Muat naik avatar">
                                                                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, voter.id)} disabled={uploadingAvatarIds[voter.id]} />
                                                                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                                                           </label>
                                                                            {voter.address && voter.address !== '-' && voter.address_count >= 2 && voter.address_count <= 10 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => { e.stopPropagation(); formState.filter_rumah_alamat && voter.no_rumah && voter.no_rumah !== '-' ? loadRumahAlamatVoters(voter) : loadAddressVoters(voter); }}
                                                                                    className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600"
                                                                                    title={formState.filter_rumah_alamat ? `No & Alamat sama` : `Alamat sama: ${formatAddress(voter)}`}
                                                                                >
                                                                                    <HomeIcon className="h-3 w-3" />
                                                                                </button>
                                                                            )}
                                                                            {voter.no_rumah && voter.no_rumah !== '-' && voter.rumah_count >= 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => { e.stopPropagation(); loadRumahVoters(voter); }}
                                                                                    className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-amber-300 hover:text-amber-600"
                                                                                    title={`Rumah sama: ${voter.no_rumah}`}
                                                                                >
                                                                                    <HashIcon className="h-3 w-3" />
                                                                                </button>
                                                                            )}
                                                                                {(() => {
                                                                                    const namaAyah = extractNamaAyah(voter.name);
                                                                                  if (!namaAyah) return null;
                                                                                  return (
                                                                                      <button
                                                                                          type="button"
                                                                                          onClick={(e) => {
                                                                                              e.stopPropagation();
                                                                                              doSearch(namaAyah);
                                                                                              const el = document.getElementById('culaan-search');
                                                                                              if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                                                                                          }}
                                                                                          className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600"
                                                                                          title={`Cari keluarga: ${namaAyah}`}
                                                                                      >
                                                                                          <UserGroupIcon className="h-3 w-3" />
                                                                                      </button>
                                                                                  );
                                                                              })()}
                                                                               {!formState.show_marked && (culaSemulaIds.has(voter.id) ? (
                                                                                 <>
<button
                                                                                      type="button"
                                                                                      onClick={() => { setSelectedVoterForCula(voter); setIsCulaFromDataError(false); setShowCulaModal(true); }}
                                                                                      className="rounded bg-blue-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-blue-500"
                                                                                  >
                                                                                      Siap
                                                                                  </button>
                                                                                  <button
                                                                                      type="button"
                                                                                      onClick={() => {
                                                                                          setCulaSemulaIds((prev) => {
                                                                                              const next = new Set(prev);
                                                                                              next.delete(voter.id);
                                                                                              return next;
                                                                                          });
                                                                                      }}
                                                                                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs font-bold text-slate-500 hover:border-red-300 hover:text-red-600"
                                                                                      title="Kembali ke asal"
                                                                                  >
                                                                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                                                  </button>
                                                                                 </>
                                                                             ) : (
                                                                                 <button
                                                                                     type="button"
                                                                                     onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, voter.id])); window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); }}
                                                                                     className="rounded bg-green-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-green-500"
                                                                                 >
                                                                                     Cula
                                                                                 </button>
                                                                             ))}
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => { window.open(buildTelegramLink('kemastel', voter.telegram_identity), '_blank'); }}
                                                                                 className="rounded bg-amber-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-amber-500"
                                                                             >
                                                                                 Tel
                                                                             </button>
                                                                        </>
                                                                    )}
                                                                 </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        ))
                                    ) : (
                                        <tbody>
                                            {rows.map((voter, index) => {
                                                const globalIdx = search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index;
                                                return (
                                                    <tr key={voter.id} className="group border-t border-slate-100 hover:bg-slate-50">
                                                        <td className="px-2 py-2 text-center font-bold text-slate-500">{globalIdx}</td>
                                                        <td className="sticky left-0 z-10 bg-white px-2 py-2 group-hover:bg-slate-50">
                                                            <div className="min-w-0">
                                                                <span className="font-semibold text-slate-800">{voter.name}</span>
                                                                {((voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA')) || (voter.cula_code && voter.cula_code !== '0' && voter.cula_code !== '?' && voter.cula_code !== '')) && (
                                                                    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-green-700">
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                                        Cula: {voter.cula_display_label && !voter.cula_display_label.includes('BELUM DICULA') ? voter.cula_display_label : voter.cula_code}
                                                                    </span>
                                                                )}
                                                                {(() => { const a = formatAddress(voter); return a && a !== '-' ? <p className="text-[10px] font-medium text-slate-500 truncate">{a}</p> : null; })()}
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-700">{voter.no_kp || voter.old_ic || '-'}</td>
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            {(() => {
                                                                const phone = voter.phone_mobile || voter.phone_home;
                                                                return phone ? <a href={`tel:${phone}`} className="font-mono text-slate-700 hover:text-green-700 hover:underline">{phone}</a> : '-';
                                                            })()}
                                                        </td>
                                                        {showUdmColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.dm || '-'}</td>}
                                                        {showLocalityColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.locality || '-'}</td>}
                                                        <td className="px-2 py-2 text-center font-bold text-slate-600">{voter.age ?? '-'}</td>
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {!voter.is_manual && (
                                                                    <>
                                                                        <label className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600" title="Muat naik avatar">
                                                                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, voter.id)} disabled={uploadingAvatarIds[voter.id]} />
                                                                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                                                          </label>
                                                                            {voter.address && voter.address !== '-' && voter.address_count >= 2 && voter.address_count <= 10 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => { e.stopPropagation(); formState.filter_rumah_alamat && voter.no_rumah && voter.no_rumah !== '-' ? loadRumahAlamatVoters(voter) : loadAddressVoters(voter); }}
                                                                                    className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600"
                                                                                    title={formState.filter_rumah_alamat ? `No & Alamat sama` : `Alamat sama: ${formatAddress(voter)}`}
                                                                                >
                                                                                    <HomeIcon className="h-3 w-3" />
                                                                                </button>
                                                                            )}
                                                                            {voter.no_rumah && voter.no_rumah !== '-' && voter.rumah_count >= 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => { e.stopPropagation(); loadRumahVoters(voter); }}
                                                                                    className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-amber-300 hover:text-amber-600"
                                                                                    title={`Rumah sama: ${voter.no_rumah}`}
                                                                                >
                                                                                     <HashIcon className="h-3 w-3" />
                                                                                </button>
                                                                            )}
                                                                            {(() => {
                                                                                const namaAyah = extractNamaAyah(voter.name);
                                                                                if (!namaAyah) return null;
                                                                               return (
                                                                                   <button
                                                                                       type="button"
                                                                                       onClick={(e) => {
                                                                                           e.stopPropagation();
                                                                                           doSearch(namaAyah);
                                                                                           const el = document.getElementById('culaan-search');
                                                                                           if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                                                                                       }}
                                                                                       className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600"
                                                                                       title={`Cari keluarga: ${namaAyah}`}
                                                                                   >
                                                                                       <UserGroupIcon className="h-3 w-3" />
                                                                                   </button>
                                                                               );
                                                                           })()}
                                                                            {!formState.show_marked && (culaSemulaIds.has(voter.id) ? (
                                                                               <>
                                                                               <button
                                                                                  type="button"
                                                                                  onClick={() => { setSelectedVoterForCula(voter); setIsCulaFromDataError(false); setShowCulaModal(true); }}
                                                                                  className="rounded bg-blue-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-blue-500"
                                                                              >
                                                                                  Siap
                                                                              </button>
                                                                              <button
                                                                                  type="button"
                                                                                  onClick={() => {
                                                                                      setCulaSemulaIds((prev) => {
                                                                                          const next = new Set(prev);
                                                                                          next.delete(voter.id);
                                                                                          return next;
                                                                                      });
                                                                                  }}
                                                                                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs font-bold text-slate-500 hover:border-red-300 hover:text-red-600"
                                                                                  title="Kembali ke asal"
                                                                              >
                                                                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                                              </button>
                                                                              </>
                                                                          ) : (
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => { setCulaSemulaIds((prev) => new Set([...prev, voter.id])); window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); }}
                                                                                 className="rounded bg-green-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-green-500"
                                                                             >
                                                                                 Cula
                                                                             </button>
                                                                         ))}
                                                                         <button
                                                                             type="button"
                                                                             onClick={() => { window.open(buildTelegramLink('kemastel', voter.telegram_identity), '_blank'); }}
                                                                             className="rounded bg-amber-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-amber-500"
                                                                         >
                                                                             Tel
                                                                         </button>
                                                                    </>
                                                                )}
                                                             </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    )}
                                </table>
                            </div>
                        )}
                        {!shouldPromptUdm && search.trim().length < 2 && (
                            <Pagination voters={localVoters} onNavigate={goToPage} />
                        )}
                    </section>
                )}

                {tab === 'data_error' && (
                    <section>
                        {rows.length === 0 ? (
                            <p className="rounded-xl border border-green-600 bg-white py-6 text-center text-xs font-medium text-slate-500 shadow-sm shadow-green-600/20 overflow-hidden">
                                {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk memaparkan senarai data error.' : 'Tiada data error untuk paparan ini.'}
                            </p>
                        ) : (
                            <>
                            {!shouldPromptUdm && (
                                <div className="mb-3 flex items-center gap-2">
                                    {culaSemulaIds.size === 0 ? (
                                        <button
                                            type="button"
                                            onClick={handleCulaSama}
                                            className="inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-600"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                            Cula Sama
                                        </button>
                                    ) : (
                                        <>
                                        <button
                                            type="button"
                                            onClick={handleSiapCulaSama}
                                            disabled={batchProcessing}
                                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="20 6 9 17 4 12"/></svg>
                                            {batchProcessing ? 'Memproses...' : 'Siap Cula Sama'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCulaSemulaIds(new Set())}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                        >
                                            Batal
                                        </button>
                                        <span className="text-xs text-slate-500">{culaSemulaIds.size} pemilih dipilih</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <div id="senarai-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {rows.map((voter, index) => (
                                    <div
                                        key={voter.id}
                                        onClick={() => setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id); } }}
                                        role="button"
                                        tabIndex={0}
                                        className={`rounded-xl border bg-white p-3 shadow-sm overflow-hidden cursor-default transition-colors duration-300 ease-in-out hover:shadow-md ${voter.id === selectedVoterId ? 'border-black' : 'border-amber-400'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-orange-400 text-xs font-black text-white shadow-sm">
                                                {search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1.5 text-sm font-bold leading-5 text-slate-800">
                                                    {voter.name}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium uppercase leading-4 tracking-[0.03em] text-slate-500"><AddressDisplay voter={voter} onRumahClick={loadRumahVoters} /></p>
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2 text-xs">
                                            <div className="grid gap-2" style={{gridTemplateColumns: 'auto 1fr'}}>
                                                <div>
                                                    <span className="font-semibold text-amber-600">No Kp</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{voter.no_kp || voter.old_ic || '-'}</p>
                                                </div>
                                            </div>
                                            {showLocalityColumn && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="font-semibold text-amber-600">Lokaliti</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.locality || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-amber-600">Umur</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                                                <div>
                                                    <span className="font-semibold text-amber-700">Cula Lama</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{voter.cula_display_label || voter.cula_code || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-amber-700">Cula Baru (Import)</span>
                                                    <p className="mt-0.5 font-bold text-slate-600 italic">Tiada</p>
                                                </div>
                                            </div>
                                            {voter.cula_remark && (
                                                <div className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                    {voter.cula_remark}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            {culaSemulaIds.has(voter.id) ? (
                                                <>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVoterForCula(voter);
                                                        setIsCulaFromDataError(true);
                                                        setShowCulaModal(true);
                                                    }}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
                                                >
                                                    Siap Cula
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCulaSemulaIds((prev) => {
                                                            const next = new Set(prev);
                                                            next.delete(voter.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                                    title="Kembali ke asal"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCulaSemulaIds((prev) => new Set([...prev, voter.id]));
                                                        window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank');
                                                    }}
                                                    className="inline-flex flex-1 items-center justify-center rounded-md bg-green-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-500"
                                                >
                                                    Cula Semula
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleApproveError(voter, 'clear'); }}
                                                disabled={pendingIds.includes(voter.id)}
                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-slate-500 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {pendingIds.includes(voter.id) ? '...' : 'Tiada Cula'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            </>
                        )}
                        {!shouldPromptUdm && search.trim().length < 2 && (
                            <Pagination voters={localVoters} onNavigate={goToPage} />
                        )}
                    </section>
                )}

                {tab === 'laporan' && (
                    <section className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Jumlah Pemilih" value={report?.total ?? 0} color="violet" />
                            <StatCard label="Sudah Dicula" value={report?.sudah_dicula ?? 0} detail="Ada status culaan" color="emerald" />
                            <StatCard label="Belum Dicula" value={report?.belum_dicula ?? 0} color="amber" />
                            <StatCard label="Peratus Siap" value={report?.peratus_siap ?? 0} detail="Daripada jumlah pemilih" color="cyan" />
                        </div>
                        {report_by_group?.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {(() => {
                                    const globalMax = report_by_group.reduce((m, r) => {
                                        const g = r.report.cula_breakdown?.reduce((gm, e) => Math.max(gm, e.total ?? 0), 0) ?? 0;
                                        return Math.max(m, g);
                                    }, 0);
                                    return report_by_group.map((rg) => (
                                        <ChartPanel key={`grp-chart-${rg.group.id}`} title={`Status Culaan — ${rg.group.nama_group} ${rg.group.umur_dari !== null && rg.group.umur_dari !== undefined && rg.group.umur_akhir !== null && rg.group.umur_akhir !== undefined ? `(umur ${rg.group.umur_dari}-${rg.group.umur_akhir})` : ''}`}>
                                            <div className="w-full" style={{ height: '12rem' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={rg.report.cula_breakdown ?? []} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                                        <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                                        <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} domain={[0, globalMax]} />
                                                        <Tooltip content={<TTip />} />
                                                        <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                            {(rg.report.cula_breakdown ?? []).map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </ChartPanel>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <ChartPanel title="Status Culaan" key={`cula-chart-${formState.udm}-${formState.group_id}`}>
                                <div className="w-full" style={{ height: '12rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={report?.cula_breakdown ?? []} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                            <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                {(report?.cula_breakdown ?? []).map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartPanel>
                        )}
                    </section>
                )}
                {tab === 'jadual' && canJadual && (
                    <section className="space-y-3">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="jadual-sticky-th whitespace-nowrap px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-slate-600">Nama Group</th>
                                        {tableColumns.map((code) => (
                                            <th key={code} title={codeLabels[code] ?? code} className={`whitespace-nowrap px-2 py-2 text-center font-bold uppercase tracking-[0.08em] text-amber-900 bg-amber-100`}>{code}</th>
                                        ))}
                                        <th className="whitespace-nowrap px-3 py-2 text-center font-bold uppercase tracking-[0.08em] text-violet-900 bg-violet-100">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={tableColumns.length + 2} className="px-3 py-6 text-center text-slate-500">Tiada data untuk paparan ini.</td>
                                        </tr>
                                    ) : tableRows.map((row, i) => (
                                        <tr key={i} className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 1 ? 'bg-slate-50/70' : ''} hover:bg-slate-50`}>
                                        <td className="jadual-sticky-td whitespace-nowrap px-3 py-2 font-bold text-slate-800">
                                            {row.nama_group}
                                            {row.umur_dari !== null && row.umur_dari !== undefined && row.umur_akhir !== null && row.umur_akhir !== undefined && (
                                                <span className="hidden sm:inline ml-1 text-slate-400 text-[10px] font-normal">(umur {row.umur_dari}-{row.umur_akhir})</span>
                                            )}
                                        </td>
                                            {tableColumns.map((code) => (
                                                <td key={code} className={`whitespace-nowrap px-2 py-2 text-center font-bold text-slate-800 bg-amber-50/40`}>{fmtCulaJadual(row.breakdownMap[code] ?? 0, row.completedMap?.[code] ?? 0)}</td>
                                            ))}
                                            <td className={`whitespace-nowrap px-3 py-2 text-center font-bold text-slate-800 bg-violet-50/40`}>{fmt(row.jumlah)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
            {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

            {detailVoter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeDetail} onKeyDown={(e) => { if (e.key === 'Escape') closeDetail(); }} role="presentation">
                    <div className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {(avatarUpdates[detailVoter.id] || detailVoter.avatar_url) && (
                                    <img src={avatarUpdates[detailVoter.id] || detailVoter.avatar_url} alt=""
                                        className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover border border-slate-200"
                                        onClick={() => setLightboxSrc(avatarUpdates[detailVoter.id] || detailVoter.avatar_url)} />
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
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Kp</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.no_kp || detailVoter.old_ic || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">UDM</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.dm || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lokaliti</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.locality || '-'}</p>
                            </div>
                            {(() => {
                                const rum = detailVoter.no_rumah && detailVoter.no_rumah !== '-' && detailVoter.no_rumah !== '' ? detailVoter.no_rumah : '';
                                const alm = (detailVoter.alamat_kediaman && detailVoter.alamat_kediaman !== '-' && detailVoter.alamat_kediaman !== '')
                                    ? detailVoter.alamat_kediaman
                                    : (detailVoter.alamat_kp && detailVoter.alamat_kp !== '-' && detailVoter.alamat_kp !== '' ? detailVoter.alamat_kp : detailVoter.address);
                                const alamat = combineAddress(rum, alm);
                                return alamat !== '-' ? (
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alamat</p>
                                        <p className="mt-0.5 font-semibold text-slate-700">{alamat}</p>
                                    </div>
                                ) : null;
                            })()}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No. Siri</p>
                                <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.no_siri || '-'}</p>
                            </div>
                            {detailVoter.catatan && (
                                <div className="col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan</p>
                                    <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.catatan}</p>
                                </div>
                            )}
                            {((detailVoter.cula_display_label && !detailVoter.cula_display_label.includes('BELUM DICULA')) || (detailVoter.cula_code && detailVoter.cula_code !== '0' && detailVoter.cula_code !== '?')) && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cula</p>
                                    <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.cula_display_label && !detailVoter.cula_display_label.includes('BELUM DICULA') ? detailVoter.cula_display_label : detailVoter.cula_code}</p>
                                </div>
                            )}
                            {detailVoter.marked_by_name && (
                                <div className="col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dikemas oleh</p>
                                    <p className="mt-0.5 font-semibold text-slate-700">{detailVoter.marked_by_name}</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            {!detailVoter.is_manual && (
                                <>
                                    <input type="file" accept="image/*" id={`detail-avatar-${detailVoter.id}`}
                                        onChange={(e) => handleFileSelect(e, detailVoter.id)} className="hidden" />
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
                            {(() => {
                                const namaAyah = extractNamaAyah(detailVoter.name);
                                if (!namaAyah) return null;
                                return (
                                    <button type="button"
                                        onClick={() => { doSearch(namaAyah); setDetailVoter(null); setShowAddressPopup(false); const el = document.getElementById('culaan-search'); if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}
                                        className="flex w-8 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-400 shadow-sm transition hover:border-green-300 hover:text-green-600"
                                        title={`Cari keluarga: ${namaAyah}`}>
                                        <UserGroupIcon className="h-3.5 w-3.5" />
                                    </button>
                                );
                            })()}
                            {detailVoter.no_rumah && detailVoter.no_rumah !== '-' && detailVoter.address && (
                                <button type="button"
                                    onClick={() => { loadRumahAlamatVoters(detailVoter); }}
                                    className="flex w-8 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-400 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
                                    title="Sama No & Alamat">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                                </button>
                            )}
                            {!detailVoter.is_marked ? (
                                <>
                                    {culaSemulaIds.has(detailVoter.id) ? (
                                        <>
                                        <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setIsCulaFromDataError(false); setShowCulaModal(true); }}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-500">
                                            Siap Cula
                                        </button>
                                        <button type="button" onClick={() => {
                                            setCulaSemulaIds((prev) => {
                                                const next = new Set(prev);
                                                next.delete(detailVoter.id);
                                                return next;
                                            });
                                        }}
                                            className="inline-flex w-7 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                            title="Kembali ke asal">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                        </button>
                                        </>
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
                                        <>
                                        <button type="button" onClick={() => { setSelectedVoterForCula(detailVoter); setIsCulaFromDataError(false); setShowCulaModal(true); }}
                                            className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-500">
                                            Siap Cula
                                        </button>
                                        <button type="button" onClick={() => {
                                            setCulaSemulaIds((prev) => {
                                                const next = new Set(prev);
                                                next.delete(detailVoter.id);
                                                return next;
                                            });
                                        }}
                                            className="inline-flex w-7 items-center justify-center rounded border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600"
                                            title="Kembali ke asal">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                        </button>
                                        </>
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

            {showAddressPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowAddressPopup(false); setAddressVoters([]); }} onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddressPopup(false); setAddressVoters([]); } }} role="presentation">
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                {addressPopupVoterName.current && (
                                    <p className="text-xs font-bold text-green-700 truncate">{addressPopupVoterName.current}</p>
                                )}
                                <h3 className="text-xs font-bold text-slate-800">{addressPopupTitle}</h3>
                            </div>
                            <button type="button" onClick={() => { setShowAddressPopup(false); setAddressVoters([]); }}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50">
                                Tutup
                            </button>
                        </div>
                        <div className="mt-3 max-h-80 overflow-y-auto">
                            {loadingAddress ? (
                                <p className="py-4 text-center text-xs font-medium text-slate-500">Mencari...</p>
                            ) : addressVoters.length === 0 ? (
                                <p className="py-4 text-center text-xs font-medium text-slate-500">Tiada pemilih lain dengan alamat yang sama.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {[...addressVoters].sort((a, b) => (a.age ?? 999) - (b.age ?? 999)).map((v) => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => {
                                                setDetailVoter(v);
                                                setShowAddressPopup(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-sm transition hover:border-green-300 hover:bg-green-50"
                                        >
                                            {(avatarUpdates[v.id] || v.avatar_url) && (
                                                <img src={avatarUpdates[v.id] || v.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800">
                                                    {v.name}
                                                    {v.cula_code && v.cula_code !== '0' && v.cula_code !== '?' && (
                                                        <span className="ml-1 text-[10px] font-semibold text-slate-500">{v.cula_display_label || v.cula_code}</span>
                                                    )}
                                                </p>
                                                <p className="text-[10px] font-medium text-slate-500 truncate">{formatAddress(v)}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="font-bold text-slate-700">{v.age ?? '-'}</p>
                                                <p className="text-[10px] text-slate-400">thn</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCulaModal(false)}>
                    <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Siap Cula — {selectedVoterForCula.name}</h3>
                            <button
                                type="button"
                                onClick={() => setShowCulaModal(false)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50"
                            >
                                Tutup
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Pilih kod cula untuk dikemaskini:</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {[...available_cula_codes].sort((a, b) => {
                                const na = parseInt(a.code, 10);
                                const nb = parseInt(b.code, 10);
                                return (na || 999) - (nb || 999) || a.code.localeCompare(b.code);
                            }).map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => handleCulaSiap(c.code, c.label)}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md ${c.code === (selectedVoterForCula.cula_code || '') ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}
                                >
                                    {c.label}
                                </button>
                            ))}
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
