import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';
import CropModal from '@/Components/CropModal';
import Modal from '@/Components/Modal';
import { calculateAgeFromNoKp, familyMemberTone, sortFamilyMembers } from '@/Utils/familyMemberOrder';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function Icon({ name, className = 'h-4 w-4' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
        pin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        check: <path d="M20 6 9 17l-5-5" />,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
        close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
        chevronDown: <path d="m6 9 6 6 6-6" />,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function StatCard({ label, value, icon }) {
    return (
        <div className="card flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700"><Icon name={icon} /></span>
            <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-0.5 text-lg font-black text-slate-900">{Number(value || 0).toLocaleString('ms-MY')}</p></div>
        </div>
    );
}

function CulaActions({ voter, pending, saving, onStart, onComplete, onKemasTel }) {
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
            {pending ? (
                <button type="button" onClick={() => onComplete(voter)} disabled={saving} className="rounded-md bg-blue-600 px-2 py-1 text-[9px] font-bold text-white transition hover:bg-blue-500 disabled:opacity-50">Siap</button>
            ) : (
                <button type="button" onClick={() => onStart(voter)} disabled={saving || !(voter.no_kp || voter.old_ic)} title={voter.no_kp || voter.old_ic ? 'Buka culaan di Telegram' : 'No. KP tiada'} className="rounded-md bg-green-700 px-2 py-1 text-[9px] font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50">Cula</button>
            )}
            <button type="button" onClick={() => onKemasTel(voter)} disabled={saving || !(voter.no_kp || voter.old_ic)} title={voter.no_kp || voter.old_ic ? 'Tukar nombor telefon melalui Telegram' : 'No. KP tiada'} className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50">Tukar Tel</button>
        </div>
    );
}

function VoterAvatar({ voter, src, sizeClass = 'h-8 w-8', busy, onOpen, onUpload }) {
    if (src) {
        return (
            <button type="button" onClick={() => onOpen(voter)} aria-label={`Lihat avatar ${voter.name || 'pemilih'}`} title="Lihat avatar" className={`${sizeClass} shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500`}>
                <img src={src} alt="" className={`${sizeClass} rounded-full border border-slate-200 object-cover`} />
            </button>
        );
    }

    return (
        <button type="button" onClick={() => onUpload(voter)} disabled={busy} aria-label={`Muat naik avatar untuk ${voter.name || 'pemilih'}`} title="Klik untuk muat naik dan potong avatar" className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:opacity-60`}>
            {busy ? '…' : <Icon name="user" className="h-4 w-4" />}
        </button>
    );
}

function locationLabel(voter) {
    return [voter.dm, voter.locality].filter(Boolean).join(' / ');
}

const GREEN_CULA_CODES = new Set(['2']);
const FAMILY_MEMBER_TONES = {
    pink: { row: 'bg-pink-50/70', name: 'text-pink-900', age: 'bg-pink-100 text-pink-800' },
    green: { row: 'bg-green-50/70', name: 'text-green-900', age: 'bg-green-100 text-green-800' },
    neutral: { row: '', name: 'text-slate-800', age: 'bg-sky-50 text-sky-700' },
};

function culaCodeClass(code) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const colorClass = GREEN_CULA_CODES.has(normalizedCode) || normalizedCode.startsWith('3')
        ? 'bg-green-100 text-green-800'
        : 'bg-slate-100 text-slate-700';

    return `rounded px-1.5 py-0.5 font-bold ${colorClass}`;
}

function shouldShowCulaStatus(voter) {
    const code = String(voter.cula_code || '').trim().toUpperCase();
    const label = String(voter.cula_display_label || '').trim().toUpperCase();

    return code !== '8' && label !== 'MATI' && !/^8\s*[-–]\s*MATI$/.test(label);
}

function isBintiName(name) {
    return /\b(?:BINTI|BT)\b/i.test(String(name || ''));
}

function binBintiParentName(name) {
    const normalized = String(name || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase();
    return normalized.match(/\b(?:BIN(?:TI)?|BT)\s+(.+)$/)?.[1]?.trim() || '';
}

function personNameBeforeBinBinti(name) {
    const normalized = String(name || '').trim().replace(/\s+/g, ' ');
    const markerIndex = normalized.search(/\b(?:BIN(?:TI)?|BT)\b/i);
    return markerIndex < 0 ? '' : normalized.slice(0, markerIndex).trim();
}

function canMarkAsFather(voter, members) {
    const name = String(voter.name || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase();
    const parentName = binBintiParentName(name);
    return /\bBIN\s+/i.test(name)
        && !isBintiName(name)
        && Boolean(parentName)
        && !members.some((member) => member.id !== voter.id && binBintiParentName(member.name) === parentName);
}

function paginationText(label) {
    return String(label).replace(/&laquo;/g, '‹').replace(/&raquo;/g, '›');
}

function fatherDetails(family, overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, family.id)) {
        return overrides[family.id];
    }

    return {
        father_id: family.father_id,
        father_name: family.father_name,
        family_name: family.name,
        members: family.members,
        member_count: family.member_count,
    };
}

function sharedBinBintiAnchor(members = []) {
    const counts = new Map();

    members.forEach((member) => {
        const parentName = binBintiParentName(member.name);
        if (parentName) counts.set(parentName, (counts.get(parentName) || 0) + 1);
    });

    const sharedParent = [...counts.entries()]
        .filter(([, count]) => count > 1)
        .sort((left, right) => right[1] - left[1])[0]?.[0];
    if (!sharedParent) return null;

    return {
        parentName: sharedParent,
        voter: members.find((member) => binBintiParentName(member.name) === sharedParent),
    };
}

function groupUnassignedVoters(voters = []) {
    const groups = new Map();

    voters.forEach((voter) => {
        const parentName = String(voter.parent_name || binBintiParentName(voter.name)).trim();
        const key = parentName ? `parent:${parentName}` : `voter:${voter.id}`;
        if (!groups.has(key)) groups.set(key, { key, parentName, voters: [] });
        groups.get(key).voters.push(voter);
    });

    return [...groups.values()];
}

export default function KeluargaPemilihIndex({ families, unassignedVoters, stats, allStats, filters, familyTabCounts = { families: 0, reviewed: 0 }, udmSummaries, localities }) {
    const { errors = {}, available_cula_codes: availableCulaCodes = [], auth } = usePage().props;
    const isMasterAdmin = Boolean(auth?.user?.role?.is_master_admin);
    const isUdmUser = auth?.user?.access_level === 'udm';
    const allUdmLabel = isUdmUser ? 'Semua Lokaliti' : 'Semua UDM';
    const selectedCulaCodes = useMemo(() => (
        Array.isArray(filters.cula_codes)
            ? filters.cula_codes
            : (filters.cula_code ? [filters.cula_code] : [])
    ), [filters.cula_codes, filters.cula_code]);
    const [culaCodeDraft, setCulaCodeDraft] = useState(selectedCulaCodes);
    const [mode, setMode] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [familySearch, setFamilySearch] = useState(filters.q || '');
    const familySearchRef = useRef(filters.q || '');
    const familySearchDirty = useRef(false);
    const familySearchRequest = useRef(null);
    const familySearchRequestId = useRef(0);
    const [results, setResults] = useState([]);
    const [selectedVoters, setSelectedVoters] = useState([]);
    const [familyName, setFamilyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [autoProcessing, setAutoProcessing] = useState(false);
    const [autoFatherProcessing, setAutoFatherProcessing] = useState(false);
    const [renamingFamilyId, setRenamingFamilyId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameProcessing, setRenameProcessing] = useState(false);
    const [fatherProcessingId, setFatherProcessingId] = useState(null);
    const [fatherOverrides, setFatherOverrides] = useState({});
    const [fatherErrors, setFatherErrors] = useState({});
    const [updatedFamilyId, setUpdatedFamilyId] = useState(null);
    const [reviewFamilyProcessingId, setReviewFamilyProcessingId] = useState(null);
    const [expandedReviewedFamilyIds, setExpandedReviewedFamilyIds] = useState(new Set());
    const [removedFamilyIds, setRemovedFamilyIds] = useState(new Set());
    const [removingVoterIds, setRemovingVoterIds] = useState(new Set());
    const [removingFamilyIds, setRemovingFamilyIds] = useState(new Set());
    const [removeErrors, setRemoveErrors] = useState({});
    const [removeStatsDelta, setRemoveStatsDelta] = useState({ families: 0, activeVoters: 0 });
    const [lightbox, setLightbox] = useState(null);
    const [avatarOverrides, setAvatarOverrides] = useState({});
    const [avatarUploadTarget, setAvatarUploadTarget] = useState(null);
    const [cropTarget, setCropTarget] = useState(null);
    const [avatarUploadingId, setAvatarUploadingId] = useState(null);
    const [avatarErrors, setAvatarErrors] = useState({});
    const avatarInputRef = useRef(null);
    const avatarUploadTargetRef = useRef(null);
    const skipFamilySearchDebounce = useRef(false);
    const [culaOverrides, setCulaOverrides] = useState({});
    const [culaPendingIds, setCulaPendingIds] = useState(new Set());
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [savingCula, setSavingCula] = useState(false);
    const [culaError, setCulaError] = useState('');
    const [culaErrors, setCulaErrors] = useState({});

    useEffect(() => {
        setCulaCodeDraft(selectedCulaCodes);
    }, [selectedCulaCodes]);

    useEffect(() => {
        setFatherOverrides(Object.fromEntries(families.data.map((family) => [family.id, {
            father_id: family.father_id,
            father_name: family.father_name,
            family_name: family.name,
            members: family.members,
            member_count: family.member_count,
        }])));
        setExpandedReviewedFamilyIds(new Set());
        setFatherErrors({});
        setRemovedFamilyIds(new Set());
        setRemovingVoterIds(new Set());
        setRemovingFamilyIds(new Set());
        setRemoveErrors({});
        setRemoveStatsDelta({ families: 0, activeVoters: 0 });
        setCulaOverrides({});
        setCulaPendingIds(new Set());
        setCulaErrors({});
        setCulaError('');
        setAvatarOverrides({});
        setAvatarErrors({});
    }, [families.data]);

    useEffect(() => {
        const serverQuery = filters.q || '';
        if (familySearchDirty.current && serverQuery !== familySearchRef.current.trim()) return;

        familySearchDirty.current = false;
        familySearchRef.current = serverQuery;
        setFamilySearch(serverQuery);
    }, [filters.q]);

    useEffect(() => {
        if (skipFamilySearchDebounce.current) {
            skipFamilySearchDebounce.current = false;
            return undefined;
        }

        const query = familySearch.trim();
        const activeRequest = familySearchRequest.current;
        if (query === (filters.q || '') && (!activeRequest || activeRequest.query === query)) return undefined;

        const timer = window.setTimeout(() => {
            if (familySearchRef.current.trim() !== query) return;

            const requestId = ++familySearchRequestId.current;
            familySearchRequest.current = { id: requestId, query };
            router.get(route('keluarga-pemilih.index'), {
                ...(filters.udm ? { udm: filters.udm } : {}),
                ...(filters.locality ? { locality: filters.locality } : {}),
                ...(query ? { q: query } : {}),
                ...(filters.tab === 'unassigned' && selectedCulaCodes.length ? { cula_codes: selectedCulaCodes } : {}),
                ...(filters.udm && filters.tab ? { tab: filters.tab } : {}),
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => {
                    if (familySearchRequest.current?.id === requestId) familySearchRequest.current = null;
                },
            });
        }, 300);

        return () => window.clearTimeout(timer);
    }, [familySearch, filters.locality, filters.q, filters.tab, filters.udm, selectedCulaCodes]);

    const updateFamilySearch = (value) => {
        familySearchRef.current = value;
        familySearchDirty.current = value.trim() !== (filters.q || '') || Boolean(familySearchRequest.current);
        setFamilySearch(value);
    };

    const targetFamily = useMemo(
        () => mode?.type === 'add' ? families.data.find((family) => family.id === mode.familyId) : null,
        [families.data, mode],
    );
    const targetFather = targetFamily ? fatherDetails(targetFamily, fatherOverrides) : null;
    const sharedParentAnchor = mode?.type === 'add' && !targetFather?.father_id
        ? sharedBinBintiAnchor(targetFather?.members || targetFamily?.members || [])
        : null;
    const anchorIsFather = mode?.type === 'add' && Boolean(targetFather?.father_id);
    const anchorId = mode?.type === 'add'
        ? targetFather?.father_id || sharedParentAnchor?.voter?.id || targetFather?.members?.[0]?.id
        : selectedVoters[0]?.id;

    useEffect(() => {
        if (!mode) {
            setResults([]);
            return undefined;
        }

        const query = searchText.trim();
        if (query.length < 2 && !anchorId) {
            setResults([]);
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (anchorId) params.set('anchor_id', anchorId);
            if (anchorIsFather) params.set('anchor_as_father', '1');
            if (filters.udm) params.set('udm', filters.udm);
            if (filters.locality) params.set('locality', filters.locality);
            setLoading(true);

            fetch(`${route('keluarga-pemilih.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                signal: controller.signal,
            })
                .then((response) => {
                    if (!response.ok) throw new Error('Carian pemilih tidak berjaya.');
                    return response.json();
                })
                .then((payload) => setResults(payload.voters || []))
                .catch((error) => {
                    if (error.name !== 'AbortError') setResults([]);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [anchorId, anchorIsFather, filters.locality, filters.udm, mode, searchText]);

    const closeManual = () => {
        setMode(null);
        setSearchText('');
        setSelectedVoters([]);
        setFamilyName('');
    };

    const currentRouteFilters = () => ({
        udm: filters.udm || null,
        locality: filters.locality || null,
        q: filters.q || null,
        cula_codes: filters.tab === 'unassigned' ? selectedCulaCodes : [],
        tab: filters.tab || 'families',
        page: filters.tab === 'unassigned' ? unassignedVoters.current_page : families.current_page,
    });

    const selectUdm = (udm) => {
        closeManual();
        setRenamingFamilyId(null);
        setFatherOverrides({});
        setFatherErrors({});
        setUpdatedFamilyId(null);
        const nextTab = udm ? (filters.udm ? filters.tab : 'families') : '';
        router.get(route('keluarga-pemilih.index'), {
                ...(udm ? { udm } : {}),
                ...(familySearch.trim() ? { q: familySearch.trim() } : {}),
                ...(nextTab ? { tab: nextTab } : {}),
                ...(nextTab === 'unassigned' && selectedCulaCodes.length ? { cula_codes: selectedCulaCodes } : {}),
            }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const selectLocality = (locality) => {
        closeManual();
        setRenamingFamilyId(null);
        setFatherOverrides({});
        setFatherErrors({});
        setUpdatedFamilyId(null);
        router.get(route('keluarga-pemilih.index'), {
            udm: filters.udm,
            ...(locality ? { locality } : {}),
            ...(familySearch.trim() ? { q: familySearch.trim() } : {}),
            tab: filters.tab,
            ...(filters.tab === 'unassigned' && selectedCulaCodes.length ? { cula_codes: selectedCulaCodes } : {}),
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const selectTab = (tab) => {
        const resetUnassignedSearch = filters.tab === 'unassigned' && tab !== 'unassigned';
        closeManual();
        if (resetUnassignedSearch) {
            skipFamilySearchDebounce.current = Boolean(filters.q);
            familySearchRequestId.current += 1;
            familySearchRequest.current = null;
            familySearchRef.current = '';
            familySearchDirty.current = Boolean(filters.q);
            setFamilySearch('');
        }
        router.get(route('keluarga-pemilih.index'), {
            udm: filters.udm,
            ...(filters.locality ? { locality: filters.locality } : {}),
            ...(!resetUnassignedSearch && familySearch.trim() ? { q: familySearch.trim() } : {}),
            tab,
            ...(tab === 'unassigned' && selectedCulaCodes.length ? { cula_codes: selectedCulaCodes } : {}),
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const selectCulaCodes = (culaCodes) => {
        closeManual();
        router.get(route('keluarga-pemilih.index'), {
            udm: filters.udm,
            ...(filters.locality ? { locality: filters.locality } : {}),
            ...(familySearch.trim() ? { q: familySearch.trim() } : {}),
            tab: 'unassigned',
            ...(culaCodes.length ? { cula_codes: culaCodes } : {}),
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const toggleCulaCodeDraft = (code) => {
        setCulaCodeDraft((current) => current.includes(code)
            ? current.filter((selected) => selected !== code)
            : [...current, code]);
    };

    const startNewFamily = (voter = null) => {
        setMode({ type: 'new', modal: Boolean(voter) });
        setSearchText('');
        setSelectedVoters(voter ? [voter] : []);
        setFamilyName(voter ? `Keluarga ${voter.name || 'Pemilih'}` : '');
    };

    const startAddingToFamily = (family) => {
        const details = fatherDetails(family, fatherOverrides);
        const members = details.members || family.members || [];
        const father = members.find((member) => Number(member.id) === Number(details.father_id));
        const defaultSearch = details.father_id
            ? personNameBeforeBinBinti(father?.name || details.father_name)
            : sharedBinBintiAnchor(members)?.parentName || '';

        setMode({ type: 'add', familyId: family.id });
        setSearchText(defaultSearch);
        setSelectedVoters([]);
    };

    const toggleVoter = (voter) => {
        const alreadySelected = selectedVoters.some((selected) => selected.id === voter.id);
        if (alreadySelected) {
            setSelectedVoters((current) => current.filter((selected) => selected.id !== voter.id));
            return;
        }

        setSelectedVoters((current) => [...current, voter]);
        if (mode?.type === 'new' && selectedVoters.length === 0) {
            setFamilyName(`Keluarga ${voter.name || 'Pemilih'}`);
            setSearchText('');
        }
    };

    const submitManual = (event) => {
        event.preventDefault();
        if (!selectedVoters.length || processing) return;

        const url = mode.type === 'add'
            ? route('keluarga-pemilih.members.store', mode.familyId)
            : route('keluarga-pemilih.store');
        const payload = {
            pemilih_ids: selectedVoters.map((voter) => voter.id),
            ...currentRouteFilters(),
            ...(mode.type === 'new' ? { name: familyName } : {}),
        };

        router.post(url, payload, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                if (mode.type === 'add') setUpdatedFamilyId(mode.familyId);
                closeManual();
            },
        });
    };

    const runAuto = () => {
        if (!window.confirm('Auto hanya membentuk keluarga apabila no. rumah, alamat kediaman, lokaliti dan UDM sepadan tepat. Teruskan?')) return;

        router.post(route('keluarga-pemilih.auto'), currentRouteFilters(), {
            preserveScroll: true,
            onStart: () => setAutoProcessing(true),
            onFinish: () => setAutoProcessing(false),
        });
    };

    const runAutoFather = () => {
        if (!window.confirm('Auto Add Ayah akan memilih calon ayah berdasarkan jantina dan padanan Bin/Binti, kemudian menjalankan auto-tambah ahli. Teruskan?')) return;

        router.post(route('keluarga-pemilih.auto-father'), currentRouteFilters(), {
            preserveScroll: true,
            onStart: () => setAutoFatherProcessing(true),
            onFinish: () => setAutoFatherProcessing(false),
        });
    };

    const updateFamilyReview = (family, reviewed) => {
        router.put(route('keluarga-pemilih.review', family.id), {
            ...currentRouteFilters(),
            reviewed,
            tab: reviewed ? 'reviewed' : 'families',
            page: 1,
        }, {
            preserveScroll: true,
            onStart: () => setReviewFamilyProcessingId(family.id),
            onFinish: () => setReviewFamilyProcessingId(null),
        });
    };

    const removeMember = async (family, voter) => {
        if (!window.confirm(`Keluarkan ${voter.name || 'pemilih ini'} daripada ${family.name}?`)) return;
        const voterId = Number(voter.id);
        const familyId = Number(family.id);
        if (removingFamilyIds.has(familyId)) return;

        setRemovingVoterIds((current) => new Set([...current, voterId]));
        setRemovingFamilyIds((current) => new Set([...current, familyId]));
        setRemoveErrors((current) => ({ ...current, [family.id]: null }));

        try {
            const response = await fetch(route('keluarga-pemilih.members.destroy', { pemilihFamily: family.id, pemilihRecord: voter.id }), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const validationError = Object.values(payload.errors || {}).flat()[0];
                throw new Error(validationError || payload.message || 'Pemilih gagal dikeluarkan daripada keluarga.');
            }

            const removedIds = new Set((payload.removed_member_ids || [voter.id]).map(Number));
            const removedActiveCount = Number(payload.removed_active_count ?? removedIds.size);
            const existing = fatherDetails(family, fatherOverrides);
            const members = (existing.members || family.members || [])
                .filter((member) => !removedIds.has(Number(member.id)));
            const familyIsRemoved = payload.family_deleted || members.length === 0;
            setRemoveStatsDelta((current) => ({
                families: current.families + (familyIsRemoved ? 1 : 0),
                activeVoters: current.activeVoters + removedActiveCount,
            }));

            if (familyIsRemoved) {
                setRemovedFamilyIds((current) => new Set([...current, familyId]));
            } else {
                setFatherOverrides((current) => {
                    const father = members.find((member) => Number(member.id) === Number(payload.father_id));

                    return {
                        ...current,
                        [familyId]: {
                            ...existing,
                            father_id: payload.father_id,
                            father_name: father?.name || (payload.father_id ? existing.father_name : null),
                            members,
                            member_count: members.length,
                        },
                    };
                });
            }
        } catch (error) {
            setRemoveErrors((current) => ({
                ...current,
                [family.id]: error.message || 'Pemilih gagal dikeluarkan daripada keluarga.',
            }));
        } finally {
            setRemovingVoterIds((current) => {
                const next = new Set(current);
                next.delete(voterId);
                return next;
            });
            setRemovingFamilyIds((current) => {
                const next = new Set(current);
                next.delete(familyId);
                return next;
            });
        }
    };

    const openAvatar = (voter) => {
        const src = avatarOverrides[voter.id] || voter.avatar_url;
        if (src) setLightbox({ src, alt: voter.name || 'Avatar pemilih' });
    };

    const openAvatarUpload = (voter) => {
        avatarUploadTargetRef.current = voter;
        setAvatarUploadTarget(voter);
        setAvatarErrors((current) => ({ ...current, [voter.id]: null }));
        avatarInputRef.current?.click();
    };

    const handleAvatarFileSelected = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !avatarUploadTargetRef.current) return;
        setCropTarget(file);
    };

    const closeAvatarCrop = () => {
        setCropTarget(null);
        setAvatarUploadTarget(null);
        avatarUploadTargetRef.current = null;
    };

    const uploadCroppedAvatar = async (file) => {
        const voter = avatarUploadTargetRef.current || avatarUploadTarget;
        if (!file || !voter || avatarUploadingId === voter.id) return;

        setAvatarUploadingId(voter.id);
        setAvatarErrors((current) => ({ ...current, [voter.id]: null }));

        try {
            const form = new FormData();
            form.append('avatar', file);
            const response = await fetch(route('pemilih.avatar.upload', voter.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: form,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.success) {
                const validationError = Object.values(payload.errors || {}).flat()[0];
                throw new Error(validationError || payload.message || 'Gambar gagal dimuat naik.');
            }

            const cacheBustedUrl = `${payload.avatar_url}${payload.avatar_url.includes('?') ? '&' : '?'}v=${Date.now()}`;
            setAvatarOverrides((current) => ({ ...current, [voter.id]: cacheBustedUrl }));
            closeAvatarCrop();
        } catch (error) {
            setAvatarErrors((current) => ({ ...current, [voter.id]: error.message || 'Gambar gagal dimuat naik.' }));
            closeAvatarCrop();
        } finally {
            setAvatarUploadingId(null);
        }
    };

    const openTelegramCommand = (voter, command, onOpened = null) => {
        const identity = voter.no_kp || voter.old_ic;
        if (!identity) {
            setCulaErrors((current) => ({ ...current, [voter.id]: 'No. KP tiada untuk membuka Telegram.' }));
            return;
        }

        const telegramWindow = window.open('about:blank', '_blank');
        if (!telegramWindow) {
            setCulaErrors((current) => ({ ...current, [voter.id]: 'Pelayar menyekat popup Telegram.' }));
            return;
        }

        try {
            telegramWindow.location.replace(`tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(`/${command} ${identity}`)}`);
            onOpened?.();
            setCulaErrors((current) => ({ ...current, [voter.id]: null }));
        } catch {
            telegramWindow.close();
            setCulaErrors((current) => ({ ...current, [voter.id]: 'Telegram gagal dibuka.' }));
        }
    };

    const startCula = (voter) => openTelegramCommand(voter, 'kemascula', () => {
        setCulaPendingIds((current) => new Set([...current, voter.id]));
    });

    const startKemasTel = (voter) => openTelegramCommand(voter, 'kemastel');

    const openCulaEditor = (voter) => {
        setSelectedVoterForCula({ ...voter, ...(culaOverrides[voter.id] || {}) });
        setCulaError('');
    };

    const saveCula = async (option) => {
        if (!selectedVoterForCula || savingCula) return;
        setSavingCula(true);
        setCulaError('');

        try {
            const response = await fetch(route('keluarga-pemilih.cula.update', selectedVoterForCula.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ cula_code: option.code }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Kod cula tidak berjaya disimpan.');

            setCulaOverrides((current) => ({
                ...current,
                [selectedVoterForCula.id]: {
                    cula_code: payload.cula_code,
                    cula_display_label: payload.cula_display_label,
                },
            }));
            setCulaPendingIds((current) => {
                const next = new Set(current);
                next.delete(selectedVoterForCula.id);
                return next;
            });
            setSelectedVoterForCula(null);
        } catch (error) {
            setCulaError(error.message || 'Kod cula tidak berjaya disimpan.');
        } finally {
            setSavingCula(false);
        }
    };

    const startRename = (family) => {
        setRenamingFamilyId(family.id);
        setRenameValue(family.name);
    };

    const cancelRename = () => {
        setRenamingFamilyId(null);
        setRenameValue('');
    };

    const saveRename = (event, familyId) => {
        event.preventDefault();
        if (!renameValue.trim() || renameProcessing) return;

        router.put(route('keluarga-pemilih.update', familyId), { name: renameValue, ...currentRouteFilters() }, {
            preserveScroll: true,
            onStart: () => setRenameProcessing(true),
            onFinish: () => setRenameProcessing(false),
            onSuccess: cancelRename,
        });
    };

    const toggleFather = async (family, voter) => {
        if (fatherProcessingId === family.id) return;
        const currentFather = fatherDetails(family, fatherOverrides);
        const isCurrentFather = Number(currentFather.father_id) === Number(voter.id);
        setFatherProcessingId(family.id);
        setFatherErrors((current) => ({ ...current, [family.id]: null }));

        try {
            const response = await fetch(route('keluarga-pemilih.father.update', family.id), {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ father_id: isCurrentFather ? null : voter.id }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Tanda ayah tidak berjaya dikemaskini.');

            setFatherOverrides((current) => {
                const existing = fatherDetails(family, current);
                const membersById = new Map((existing.members || family.members).map((member) => [member.id, member]));
                (payload.added_members || []).forEach((member) => {
                    membersById.set(member.id, member);
                });

                return {
                    ...current,
                    [family.id]: {
                        father_id: payload.father_id,
                        father_name: payload.father_name,
                        family_name: payload.family_name,
                        members: [...membersById.values()].sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''))),
                        member_count: payload.member_count ?? existing.member_count ?? family.member_count,
                    },
                };
            });
            if (payload.added_count > 0) setUpdatedFamilyId(family.id);
        } catch (error) {
            setFatherErrors((current) => ({ ...current, [family.id]: error.message }));
        } finally {
            setFatherProcessingId(null);
        }
    };

    const selectedIds = new Set(selectedVoters.map((voter) => voter.id));
    const visibleFamilies = families.data.filter((family) => !removedFamilyIds.has(Number(family.id)));
    const allReviewedFamiliesExpanded = visibleFamilies.length > 0
        && visibleFamilies.every((family) => expandedReviewedFamilyIds.has(Number(family.id)));
    const visibleFamilyTotal = Math.max(0, families.total - removeStatsDelta.families);
    const visibleStats = {
        ...stats,
        families: Math.max(0, stats.families - removeStatsDelta.families),
        assigned: Math.max(0, stats.assigned - removeStatsDelta.activeVoters),
        unassigned: stats.unassigned + removeStatsDelta.activeVoters,
    };
    const visibleFamilyTabCounts = {
        families: Math.max(0, familyTabCounts.families - (filters.tab === 'families' ? removeStatsDelta.families : 0)),
        reviewed: Math.max(0, familyTabCounts.reviewed - (filters.tab === 'reviewed' ? removeStatsDelta.families : 0)),
    };
    const visibleUnassignedCount = filters.tab === 'unassigned' ? unassignedVoters.total : visibleStats.unassigned;
    const manualPanel = mode && (
        <section className={`card border-green-200 ${mode.type === 'add' || mode.modal ? 'max-h-[88vh] overflow-y-auto' : 'overflow-hidden'}`}>
            <div className="flex items-start justify-between gap-3 border-b border-green-100 bg-green-50/70 px-3 py-3 sm:px-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-green-700">{mode.type === 'new' ? 'Keluarga baharu' : 'Tambah ahli keluarga'}</p>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-900">{mode.type === 'new' ? 'Pilih pemilih untuk disatukan' : `Tambah pemilih ke ${targetFather?.family_name || targetFamily?.name || 'keluarga'}`}</h3>
                    <p className="mt-1 text-xs text-slate-600">Cadangan disusun mengikut kesamaan rumah, alamat, bin/binti dan lokaliti. Pilih sendiri ahli yang betul.</p>
                </div>
                <button type="button" onClick={closeManual} aria-label="Tutup borang keluarga" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-900"><Icon name="close" /></button>
            </div>

            <form onSubmit={submitManual} className="space-y-3 p-3 sm:p-4">
                {mode.type === 'new' && (
                    <label className="block max-w-xl">
                        <span className="text-xs font-bold text-slate-700">Nama keluarga <span className="font-normal text-slate-400">(boleh dikemaskini)</span></span>
                        <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} maxLength={255} placeholder="Contoh: Keluarga Ahmad" className="input-field mt-1 w-full" />
                    </label>
                )}

                <div>
                    <label htmlFor="voter-family-search" className="text-xs font-bold text-slate-700">Cari pemilih</label>
                    <div className="relative mt-1">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input id="voter-family-search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Nama, no. KP, no. rumah, alamat atau lokaliti…" className="input-field w-full pl-9" />
                    </div>
                    {anchorId && !searchText && (
                        <p className="mt-1.5 text-[11px] text-slate-500">
                        {anchorIsFather
                            ? `Cadangan bin/binti ditanda hanya jika sepadan dengan ayah keluarga: ${targetFather.father_name}.`
                            : sharedParentAnchor
                                ? `Cadangan bin/binti diutamakan dengan nama yang sama: ${sharedParentAnchor.parentName}.`
                                : `Cadangan di bawah dibandingkan dengan pemilih pertama yang dipilih${mode.type === 'add' ? ' dalam keluarga ini' : ''}.`}
                        </p>
                    )}
                </div>

                {selectedVoters.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50/60 p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-green-800">Dipilih · {selectedVoters.length}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selectedVoters.map((voter) => (
                                <button key={voter.id} type="button" onClick={() => toggleVoter(voter)} className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-green-900 hover:bg-green-100">
                                    {voter.name || 'Nama tiada'} <span aria-hidden="true" className="text-green-600">×</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {errors.pemilih_ids && <p role="alert" className="text-xs font-semibold text-rose-700">{errors.pemilih_ids}</p>}

                {(loading || results.length > 0 || searchText.trim().length >= 2 || anchorId) && (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        {loading ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-500">Sedang mencari pemilih…</p>
                        ) : results.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-500">Tiada pemilih belum berkeluarga yang sepadan.</p>
                        ) : (
                            <div className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
                                {results.map((voter) => {
                                    const checked = selectedIds.has(voter.id);
                                    const checkboxId = `family-voter-${voter.id}`;
                                    return (
                                        <div key={voter.id} className={`flex items-start gap-2.5 px-3 py-2.5 transition hover:bg-green-50/70 ${checked ? 'bg-green-50' : 'bg-white'}`}>
                                            <input id={checkboxId} type="checkbox" checked={checked} onChange={() => toggleVoter(voter)} className="mt-1 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                            {voter.avatar_url && (
                                                <button type="button" onClick={() => openAvatar(voter)} aria-label={`Lihat avatar ${voter.name || 'pemilih'}`} className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500">
                                                    <img src={voter.avatar_url} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
                                                </button>
                                            )}
                                            <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer">
                                                <span className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-900">{voter.name || 'Nama tiada'}</span>
                                                    {voter.no_kp && <span className="text-[10px] text-slate-500">{voter.no_kp}</span>}
                                                </span>
                                                <span className="mt-1 flex flex-wrap gap-1">
                                                    {voter.no_rumah && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">Rumah {voter.no_rumah}</span>}
                                                    {voter.match_reasons.map((reason) => <span key={reason} className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-800">{reason}</span>)}
                                                </span>
                                                <span className="mt-1 block truncate text-[10px] text-slate-500">{[locationLabel(voter), voter.address].filter(Boolean).join(' · ') || 'Alamat tiada'}</span>
                                            </label>
                                            {voter.match_score >= 80 && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black text-green-800">Padanan kuat</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={closeManual} className="btn-ghost">Batal</button>
                    <button type="submit" disabled={!selectedVoters.length || processing} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                        {processing ? 'Menyimpan…' : mode.type === 'new' ? `Jadikan Keluarga (${selectedVoters.length})` : `Tambah Ahli (${selectedVoters.length})`}
                    </button>
                </div>
            </form>
        </section>
    );

    return (
        <AuthenticatedLayout header={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="label-section">Operasi · Pengurusan Pemilih</p><h2 className="mt-0.5 heading-lg">Keluarga Pemilih</h2><p className="mt-1 max-w-2xl text-xs text-slate-500">Satukan pemilih yang tinggal serumah. Semak padanan cadangan dahulu atau biarkan sistem mengumpulkan rekod yang mempunyai bukti kediaman sepadan tepat.</p></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={startNewFamily} className="btn-primary inline-flex items-center gap-1.5"><Icon name="plus" />Tambah Manual</button>
                    {isMasterAdmin && (
                        <>
                            <button type="button" onClick={runAuto} disabled={autoProcessing || visibleStats.unassigned === 0} className="btn-ghost inline-flex items-center gap-1.5 border-green-200 text-green-800 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="sparkles" />{autoProcessing ? 'Memproses…' : 'Auto Keluarga'}</button>
                            <button type="button" onClick={runAutoFather} disabled={autoFatherProcessing} className="btn-ghost inline-flex items-center gap-1.5 border-indigo-200 text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="users" />{autoFatherProcessing ? 'Memproses…' : 'Auto Add Ayah'}</button>
                        </>
                    )}
                </div>
            </div>
        }>
            <Head title="Keluarga Pemilih" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileSelected} className="hidden" />
                <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Jumlah Keluarga" value={visibleStats.families} icon="home" />
                    <StatCard label="Pemilih Aktif" value={stats.voters} icon="users" />
                    <StatCard label="Sudah Berkeluarga" value={visibleStats.assigned} icon="users" />
                    <StatCard label="Belum Berkeluarga" value={visibleStats.unassigned} icon="plus" />
                </section>

                <section className="space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="label-section">Ringkasan UDM</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{filters.udm ? 'UDM dipilih' : 'Klik kad untuk tapis keluarga'}</h3></div>
                        <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
                            {filters.udm && <p className="text-xs font-semibold text-green-800">{[filters.udm, filters.locality].filter(Boolean).join(' · ')}</p>}
                            <div className="flex w-full gap-2 sm:w-auto">
                                {!isUdmUser && (
                                    <>
                                        <label htmlFor="keluarga-udm-filter" className="sr-only">Tapis keluarga mengikut UDM</label>
                                        <select id="keluarga-udm-filter" value={filters.udm} onChange={(event) => selectUdm(event.target.value)} className="input-field min-w-0 flex-1 text-xs sm:w-56 sm:flex-none">
                                            <option value="">{allUdmLabel}</option>
                                            {udmSummaries.map((summary) => <option key={summary.udm} value={summary.udm}>{summary.udm}</option>)}
                                        </select>
                                    </>
                                )}
                                {filters.udm && (
                                    <>
                                        <label htmlFor="keluarga-locality-filter" className="sr-only">Tapis keluarga mengikut lokaliti</label>
                                        <select id="keluarga-locality-filter" value={filters.locality || ''} onChange={(event) => selectLocality(event.target.value)} className="input-field min-w-0 flex-1 text-xs sm:w-56 sm:flex-none">
                                            <option value="">Semua Lokaliti</option>
                                            {localities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                                        </select>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {!filters.udm && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <button type="button" onClick={() => selectUdm('')} aria-pressed="true" className="card w-full cursor-pointer border-green-500 bg-green-50 p-3 text-left ring-1 ring-green-200 transition hover:border-green-300">
                            <span className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-900">{allUdmLabel}</span><span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold text-slate-500">{udmSummaries.length} UDM</span></span>
                            <span className="mt-2 grid grid-cols-2 gap-2">
                                <span><span className="block text-lg font-black text-green-800">{allStats.families.toLocaleString('ms-MY')}</span><span className="block text-[10px] font-semibold text-slate-500">Jumlah keluarga</span></span>
                                <span><span className="block text-lg font-black text-amber-700">{allStats.unassigned.toLocaleString('ms-MY')}</span><span className="block text-[10px] font-semibold text-slate-500">Belum berkeluarga</span></span>
                            </span>
                            <span className="mt-2 block border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-500">{allStats.voters.toLocaleString('ms-MY')} pemilih aktif</span>
                        </button>
                        {udmSummaries.map((summary) => (
                            <button key={summary.udm} type="button" onClick={() => selectUdm(summary.udm)} aria-pressed={filters.udm === summary.udm} className={`card w-full cursor-pointer p-3 text-left transition hover:border-green-300 ${filters.udm === summary.udm ? 'border-green-500 bg-green-50 ring-1 ring-green-200' : ''}`}>
                                <span className="block truncate text-xs font-black text-slate-900">{summary.udm}</span>
                                <span className="mt-2 grid grid-cols-2 gap-2">
                                    <span><span className="block text-lg font-black text-green-800">{summary.families.toLocaleString('ms-MY')}</span><span className="block text-[10px] font-semibold text-slate-500">Jumlah keluarga</span></span>
                                    <span><span className="block text-lg font-black text-amber-700">{summary.unassigned.toLocaleString('ms-MY')}</span><span className="block text-[10px] font-semibold text-slate-500">Belum berkeluarga</span></span>
                                </span>
                                <span className="mt-2 block border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-500">{summary.voters.toLocaleString('ms-MY')} pemilih aktif</span>
                            </button>
                        ))}
                    </div>}
                </section>

                {mode?.type === 'new' && !mode.modal && manualPanel}
                {mode?.type === 'new' && mode.modal && (
                    <Modal show onClose={closeManual} maxWidth="3xl" title="Jadikan keluarga">
                        {manualPanel}
                    </Modal>
                )}
                {mode?.type === 'add' && (
                    <Modal show onClose={closeManual} maxWidth="3xl" title={`Tambah ahli keluarga ${targetFather?.family_name || ''}`}>
                        {manualPanel}
                    </Modal>
                )}

                {filters.udm && (
                    <nav aria-label="Senarai keluarga dan pemilih" className="flex gap-1 overflow-x-auto rounded-xl border border-green-200 bg-white p-1.5 shadow-sm">
                        <button type="button" onClick={() => selectTab('families')} aria-current={filters.tab === 'families' ? 'page' : undefined} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${filters.tab === 'families' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:bg-green-50 hover:text-green-800'}`}>
                            Senarai Keluarga <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${filters.tab === 'families' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{visibleFamilyTabCounts.families.toLocaleString('ms-MY')}</span>
                        </button>
                        <button type="button" onClick={() => selectTab('reviewed')} aria-current={filters.tab === 'reviewed' ? 'page' : undefined} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${filters.tab === 'reviewed' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:bg-green-50 hover:text-green-800'}`}>
                            Keluarga Telah disemak <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${filters.tab === 'reviewed' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{visibleFamilyTabCounts.reviewed.toLocaleString('ms-MY')}</span>
                        </button>
                        <button type="button" onClick={() => selectTab('unassigned')} aria-current={filters.tab === 'unassigned' ? 'page' : undefined} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${filters.tab === 'unassigned' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:bg-green-50 hover:text-green-800'}`}>
                            Pemilih Belum Berkeluarga <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{visibleUnassignedCount}</span>
                        </button>
                    </nav>
                )}

                {filters.udm && filters.tab !== 'unassigned' && <section className="space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="label-section">{filters.tab === 'reviewed' ? 'Keluarga Telah disemak' : 'Senarai Keluarga'}</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{visibleFamilyTotal.toLocaleString('ms-MY')} keluarga{filters.udm ? ` · ${[filters.udm, filters.locality].filter(Boolean).join(' · ')}` : ` · ${allUdmLabel}`}</h3></div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <div className="relative w-full sm:max-w-sm">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <label htmlFor="family-member-search" className="sr-only">Cari pemilih dalam keluarga</label>
                                <input id="family-member-search" type="search" value={familySearch} onChange={(event) => updateFamilySearch(event.target.value)} placeholder="Cari nama, No. KP, no. rumah atau alamat pemilih…" className="input-field w-full pl-9 text-xs" />
                            </div>
                            {filters.tab === 'reviewed' && visibleFamilies.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setExpandedReviewedFamilyIds(allReviewedFamiliesExpanded
                                        ? new Set()
                                        : new Set(visibleFamilies.map((family) => Number(family.id))))}
                                    aria-expanded={allReviewedFamiliesExpanded}
                                    className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 border-slate-200 text-slate-700"
                                >
                                    {allReviewedFamiliesExpanded ? 'Tutup semua kad' : 'Buka semua kad'}
                                    <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${allReviewedFamiliesExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                        </div>
                        {visibleStats.unassigned > 0 && <p className="text-left text-[11px] text-slate-500 sm:text-right">{visibleStats.unassigned.toLocaleString('ms-MY')} pemilih belum dikelompokkan</p>}
                    </div>

                    {visibleFamilies.length === 0 ? (
                        <div className="card-dashed px-4 py-10 text-center">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Icon name="home" className="h-5 w-5" /></span>
                            <h4 className="mt-3 text-sm font-bold text-slate-800">{filters.q ? 'Tiada keluarga sepadan dengan carian' : filters.tab === 'reviewed' ? 'Belum ada keluarga disemak' : 'Belum ada keluarga pemilih'}</h4>
                            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{filters.q ? 'Cuba nama, nombor KP, no. rumah atau alamat yang lain.' : filters.tab === 'reviewed' ? 'Keluarga yang disahkan akan dipaparkan di sini.' : 'Tambah keluarga secara manual atau jalankan auto untuk mengumpulkan rekod dengan maklumat kediaman yang sama tepat.'}</p>
                            {!filters.q && filters.tab === 'families' && <button type="button" onClick={startNewFamily} className="btn-primary mt-4">Mula Tambah Manual</button>}
                        </div>
                    ) : (
                        <div className="grid gap-2.5 xl:grid-cols-2">
                            {visibleFamilies.map((family) => {
                                const father = fatherDetails(family, fatherOverrides);
                                const members = father.members || family.members;
                                const fatherMember = members.find((member) => Number(member.id) === Number(father.father_id));
                                const fatherAvatar = fatherMember && (avatarOverrides[fatherMember.id] || fatherMember.avatar_url);
                                // Ayah diutamakan, kemudian ahli lain disusun berdasarkan YYMMDD dalam no_kp.
                                const displayMembers = sortFamilyMembers(members, father.father_id);
                                const memberCount = father.member_count ?? family.member_count;
                                const locations = [...new Set(members.map(locationLabel).filter(Boolean))];
                                const familyName = father.family_name || family.name;
                                const isUpdated = updatedFamilyId === family.id;
                                const isReviewedTab = filters.tab === 'reviewed';
                                const isFamilyExpanded = !isReviewedTab || expandedReviewedFamilyIds.has(Number(family.id));
                                return (
                                    <article key={family.id} className={`card overflow-hidden transition-all duration-300 ${isUpdated ? 'border-yellow-400 bg-yellow-50/70 ring-2 ring-yellow-300 shadow-md' : ''}`}>
                                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {father.father_id && fatherAvatar && (
                                                        <VoterAvatar
                                                            voter={fatherMember}
                                                            src={fatherAvatar}
                                                            sizeClass="h-8 w-8"
                                                            busy={avatarUploadingId === fatherMember.id}
                                                            onOpen={openAvatar}
                                                            onUpload={openAvatarUpload}
                                                        />
                                                    )}
                                                    {renamingFamilyId === family.id ? (
                                                        <form onSubmit={(event) => saveRename(event, family.id)} className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={`Tukar nama ${familyName}`}>
                                                            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={255} aria-label="Nama keluarga" className="input-field min-w-0 flex-1 py-1 text-xs" />
                                                            <button type="submit" disabled={!renameValue.trim() || renameProcessing} aria-label="Simpan nama keluarga" title="Simpan nama" className="rounded-md p-1.5 text-green-700 transition hover:bg-green-50 disabled:opacity-50"><Icon name="check" /></button>
                                                            <button type="button" onClick={cancelRename} aria-label="Batal menukar nama" title="Batal" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Icon name="close" /></button>
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <h4 className="truncate text-sm font-black text-slate-900">{familyName}</h4>
                                                            <button type="button" onClick={() => startRename({ ...family, name: familyName })} aria-label={`Tukar nama ${familyName}`} title="Tukar nama keluarga" className="rounded-md p-1 text-slate-400 transition hover:bg-green-50 hover:text-green-700"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                                                        </>
                                                    )}
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">{memberCount} ahli</span>
                                                     {isUpdated && <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[9px] font-black text-yellow-950">Dikemas kini</span>}
                                                </div>
                                                {renamingFamilyId === family.id && errors.name && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-700">{errors.name}</p>}
                                                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Icon name="pin" className="h-3 w-3 shrink-0" />{locations.join(' · ') || 'Lokaliti tidak dinyatakan'}</p>
                                            </div>
                                            <button type="button" onClick={() => startAddingToFamily({ ...family, name: familyName, members })} className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 border-green-200 text-green-800"><Icon name="plus" />Tambah Ahli</button>
                                            {isReviewedTab && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedReviewedFamilyIds((current) => {
                                                        const next = new Set(current);
                                                        const familyId = Number(family.id);
                                                        if (next.has(familyId)) next.delete(familyId);
                                                        else next.add(familyId);
                                                        return next;
                                                    })}
                                                    aria-expanded={isFamilyExpanded}
                                                    aria-controls={`family-members-${family.id}`}
                                                    className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 border-slate-200 text-slate-700"
                                                >
                                                    {isFamilyExpanded ? 'Tutup ahli' : 'Lihat ahli'}
                                                    <Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${isFamilyExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                            <button type="button" onClick={() => updateFamilyReview(family, filters.tab !== 'reviewed')} disabled={reviewFamilyProcessingId === family.id} className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 border-indigo-200 text-indigo-800 disabled:cursor-wait disabled:opacity-50">
                                                {reviewFamilyProcessingId === family.id ? 'Memproses…' : filters.tab === 'reviewed' ? 'Batalkan semakan' : 'Sahkan keluarga'}
                                            </button>
                                        </div>
                                        <div id={`family-members-${family.id}`} className={isFamilyExpanded ? '' : 'hidden'}>
                                            {fatherErrors[family.id] && <p role="alert" className="px-3 pt-2 text-[10px] font-semibold text-rose-700">{fatherErrors[family.id]}</p>}
                                            {removeErrors[family.id] && <p role="alert" className="px-3 pt-2 text-[10px] font-semibold text-rose-700">{removeErrors[family.id]}</p>}
                                            <div className="divide-y divide-slate-100">
                                            {displayMembers.map((voter) => {
                                                const culaVoter = { ...voter, ...(culaOverrides[voter.id] || {}) };
                                                const isFather = Number(father.father_id) === Number(voter.id);
                                                const tone = FAMILY_MEMBER_TONES[familyMemberTone(culaVoter)];
                                                const age = calculateAgeFromNoKp(voter.no_kp);
                                                const showCulaStatus = shouldShowCulaStatus(culaVoter);
                                                return (
                                                <div key={voter.id} className={`flex flex-wrap items-start gap-3 px-3 py-2.5 ${tone.row}`}>
                                                     <VoterAvatar
                                                         voter={voter}
                                                         src={avatarOverrides[voter.id] || voter.avatar_url}
                                                         sizeClass="h-8 w-8"
                                                         busy={avatarUploadingId === voter.id}
                                                         onOpen={openAvatar}
                                                         onUpload={openAvatarUpload}
                                                     />
                                                     <div className="min-w-0 flex-1">
                                                          <p className={`flex flex-wrap items-center gap-1.5 text-xs font-bold ${tone.name}`}><span className="truncate">{voter.name || 'Nama tiada'}</span>{isFather && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-green-800">Ayah</span>}{age !== null && <span title="Umur berdasarkan No. KP" className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tone.age}`}>{age} tahun</span>}</p>
                                                          <p className="mt-0.5 text-[10px] text-slate-500">{[voter.no_kp, voter.no_rumah ? `Rumah ${voter.no_rumah}` : null, locationLabel(voter)].filter(Boolean).join(' · ') || 'Maklumat alamat tiada'}</p>
                                                          {voter.address && <p className="mt-0.5 truncate text-[10px] text-slate-500">{voter.address}</p>}
                                                          {voter.catatan && <p className="mt-1 break-words rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800"><span className="font-bold">Catatan:</span> {voter.catatan}</p>}
                                                          {avatarErrors[voter.id] && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-700">{avatarErrors[voter.id]}</p>}
                                                         {showCulaStatus && <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-600"><span className="font-bold">Kod Cula:</span><span className={culaCodeClass(culaVoter.cula_code)}>{culaVoter.cula_code || '-'}</span>{culaVoter.cula_display_label && <span>{culaVoter.cula_display_label}</span>}</p>}
                                                        {culaErrors[voter.id] && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-700">{culaErrors[voter.id]}</p>}
                                                    </div>
                                                    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
                                                        <CulaActions voter={culaVoter} pending={culaPendingIds.has(voter.id)} saving={savingCula} onStart={startCula} onComplete={openCulaEditor} onKemasTel={startKemasTel} />
                                                        {(isFather || canMarkAsFather(voter, members)) && (
                                                            <button type="button" onClick={() => toggleFather(family, voter)} disabled={fatherProcessingId === family.id} aria-pressed={isFather} className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold transition disabled:opacity-50 ${isFather ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-700'}`}>
                                                                {fatherProcessingId === family.id ? '...' : isFather ? 'Ayah · Nyah tanda' : 'Tandakan ayah'}
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={() => removeMember({ ...family, name: familyName }, voter)} disabled={removingFamilyIds.has(Number(family.id))} aria-label={`Keluarkan ${voter.name || 'pemilih'} daripada keluarga`} title="Keluarkan daripada keluarga" className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50">{removingVoterIds.has(Number(voter.id)) ? '…' : <Icon name="trash" />}</button>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {families.last_page > 1 && (
                        <nav aria-label="Halaman keluarga pemilih" className="flex flex-wrap justify-center gap-1.5 pt-2">
                            {families.links.map((link) => (
                                link.url
                                    ? <Link key={link.url} href={link.url} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${link.active ? 'bg-green-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700'}`}>{paginationText(link.label)}</Link>
                                    : <span key={`disabled-${link.label}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400">{paginationText(link.label)}</span>
                            ))}
                        </nav>
                    )}
                </section>}

                {filters.udm && filters.tab === 'unassigned' && <section className="space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="label-section">Pemilih Belum Berkeluarga</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{unassignedVoters.total.toLocaleString('ms-MY')} pemilih · {[filters.udm, filters.locality].filter(Boolean).join(' · ')}</h3></div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
                            <div className="relative w-full sm:w-72">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <label htmlFor="unassigned-voter-search" className="sr-only">Cari pemilih belum berkeluarga</label>
                                <input id="unassigned-voter-search" type="search" value={familySearch} onChange={(event) => updateFamilySearch(event.target.value)} placeholder="Cari nama, No. KP, no. rumah atau alamat…" className="input-field w-full pl-9 text-xs" />
                            </div>
                            <details className="group relative w-full sm:w-60">
                                <summary aria-label="Tapis pemilih mengikut Kod Cula" className="input-field flex cursor-pointer list-none items-center justify-between gap-2 text-xs">
                                    <span className="truncate">{culaCodeDraft.length ? `${culaCodeDraft.length} Kod Cula dipilih` : 'Semua Kod Cula'}</span>
                                    <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">⌄</span>
                                </summary>
                                <div className="absolute right-0 z-20 mt-1 w-full min-w-[17rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:w-72">
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-1 pb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pilih satu atau lebih</span>
                                        <button type="button" onClick={() => setCulaCodeDraft([])} className="text-[10px] font-bold text-green-700 hover:text-green-900">Kosongkan</button>
                                    </div>
                                    <div className="mt-1 max-h-64 space-y-0.5 overflow-y-auto">
                                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-green-50">
                                            <input type="checkbox" checked={culaCodeDraft.includes('belum_dicula')} onChange={() => toggleCulaCodeDraft('belum_dicula')} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                            Belum Dicula
                                        </label>
                                        {availableCulaCodes.map((option) => (
                                            <label key={option.code} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-green-50">
                                                <input type="checkbox" checked={culaCodeDraft.includes(option.code)} onChange={() => toggleCulaCodeDraft(option.code)} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                                {option.label}
                                            </label>
                                        ))}
                                    </div>
                                    <button type="button" onClick={(event) => {
                                        selectCulaCodes(culaCodeDraft);
                                        const filterDetails = event.currentTarget.closest('details');
                                        if (filterDetails) filterDetails.open = false;
                                    }} className="btn-primary mt-2 w-full justify-center py-2 text-xs">Tapis pemilih</button>
                                </div>
                            </details>
                        </div>
                    </div>

                    {unassignedVoters.data.length === 0 ? (
                        <div className="card-dashed px-4 py-8 text-center">
                            <p className="text-sm font-bold text-slate-800">{filters.q ? 'Tiada pemilih sepadan dengan carian' : selectedCulaCodes.length ? 'Tiada pemilih dengan Kod Cula dipilih' : 'Semua pemilih dalam tapisan ini sudah berkeluarga'}</p>
                            {(filters.q || selectedCulaCodes.length > 0) && <p className="mt-1 text-xs text-slate-500">{filters.q ? 'Cuba nama, nombor KP, no. rumah atau alamat yang lain.' : 'Pilih Kod Cula yang lain atau paparkan semua kod.'}</p>}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {groupUnassignedVoters(unassignedVoters.data).map((group) => (
                                <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    {group.parentName && (
                                        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-green-100 bg-green-50 px-3 py-2">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-green-900">Bin / Binti / BT · {group.parentName}</p>
                                            <span className="text-[10px] font-semibold text-green-800">{group.voters.length} pemilih</span>
                                        </div>
                                    )}
                                    <div className="divide-y divide-slate-100">
                                        {group.voters.map((voter) => {
                                            const culaVoter = { ...voter, ...(culaOverrides[voter.id] || {}) };
                                            const age = calculateAgeFromNoKp(voter.no_kp);
                                            const showCulaStatus = shouldShowCulaStatus(culaVoter);
                                return (
                                <div key={voter.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                         <VoterAvatar
                                             voter={voter}
                                             src={avatarOverrides[voter.id] || voter.avatar_url}
                                             sizeClass="h-9 w-9"
                                             busy={avatarUploadingId === voter.id}
                                             onOpen={openAvatar}
                                             onUpload={openAvatarUpload}
                                         />
                                         <div className="min-w-0">
                                             <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900"><span className="truncate">{voter.name || 'Nama tiada'}</span>{age !== null && <span title="Umur berdasarkan No. KP" className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">{age} tahun</span>}</p>
                                              <p className="mt-0.5 text-[10px] text-slate-500">{[voter.no_kp, voter.no_rumah ? `Rumah ${voter.no_rumah}` : null, locationLabel(voter)].filter(Boolean).join(' · ') || 'Maklumat alamat tiada'}</p>
                                              {voter.address && <p className="truncate text-[10px] text-slate-500">{voter.address}</p>}
                                              {voter.catatan && <p className="mt-1 break-words rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800"><span className="font-bold">Catatan:</span> {voter.catatan}</p>}
                                              {avatarErrors[voter.id] && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-700">{avatarErrors[voter.id]}</p>}
                                             {showCulaStatus && <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-600"><span className="font-bold">Kod Cula:</span><span className={culaCodeClass(culaVoter.cula_code)}>{culaVoter.cula_code || '-'}</span>{culaVoter.cula_display_label && <span>{culaVoter.cula_display_label}</span>}</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                                        <CulaActions voter={culaVoter} pending={culaPendingIds.has(voter.id)} saving={savingCula} onStart={startCula} onComplete={openCulaEditor} onKemasTel={startKemasTel} />
                                        <button type="button" onClick={() => startNewFamily(voter)} className="btn-ghost inline-flex items-center gap-1.5 border-green-200 text-green-800"><Icon name="plus" />Jadikan Keluarga</button>
                                    </div>
                                    {culaErrors[voter.id] && <p role="alert" className="text-[10px] font-semibold text-rose-700">{culaErrors[voter.id]}</p>}
                                </div>
                                );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {unassignedVoters.last_page > 1 && (
                        <nav aria-label="Halaman pemilih belum berkeluarga" className="flex flex-wrap justify-center gap-1.5 pt-2">
                            {unassignedVoters.links.map((link) => (
                                link.url
                                    ? <Link key={link.url} href={link.url} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${link.active ? 'bg-green-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700'}`}>{paginationText(link.label)}</Link>
                                    : <span key={`unassigned-${link.label}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400">{paginationText(link.label)}</span>
                            ))}
                        </nav>
                    )}
                </section>}
                {selectedVoterForCula && (
                    <Modal show onClose={() => !savingCula && setSelectedVoterForCula(null)} maxWidth="md" title={`Kemas Cula — ${selectedVoterForCula.name || 'Pemilih'}`}>
                        <div className="space-y-3 rounded-xl bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="label-section">Kemas Cula</p>
                                    <h3 className="mt-0.5 text-sm font-bold text-slate-900">{selectedVoterForCula.name || 'Pemilih'}</h3>
                                    <p className="mt-1 text-[10px] text-slate-500">Pilih kod culaan yang betul.</p>
                                </div>
                                <button type="button" onClick={() => setSelectedVoterForCula(null)} disabled={savingCula} className="btn-ghost px-2 py-1 text-xs">Tutup</button>
                            </div>
                            {culaError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{culaError}</p>}
                            <div className="flex max-h-[50vh] flex-wrap gap-1.5 overflow-y-auto">
                                {availableCulaCodes.map((option) => (
                                    <button key={option.code} type="button" onClick={() => saveCula(option)} disabled={savingCula} className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${option.code === selectedVoterForCula.cula_code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}>
                                        {option.label}
                                    </button>
                                ))}
                                {availableCulaCodes.length === 0 && <p className="text-xs text-slate-500">Tiada kod culaan tersedia.</p>}
                            </div>
                        </div>
                    </Modal>
                )}
                {cropTarget && <CropModal file={cropTarget} onCrop={uploadCroppedAvatar} onClose={closeAvatarCrop} />}
                {lightbox && <AvatarLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
            </div>
        </AuthenticatedLayout>
    );
}
