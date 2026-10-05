import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

function Icon({ name, className = 'h-4 w-4' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
        pin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        check: <path d="M20 6 9 17l-5-5" />,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
        close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
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

function locationLabel(voter) {
    return [voter.dm, voter.locality].filter(Boolean).join(' / ');
}

function paginationText(label) {
    return String(label).replace(/&laquo;/g, '‹').replace(/&raquo;/g, '›');
}

function fatherDetails(family, overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, family.id)) {
        return overrides[family.id];
    }

    return { father_id: family.father_id, father_name: family.father_name };
}

export default function KeluargaPemilihIndex({ families, stats, allStats, filters, udmSummaries }) {
    const { errors = {} } = usePage().props;
    const [mode, setMode] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState([]);
    const [selectedVoters, setSelectedVoters] = useState([]);
    const [familyName, setFamilyName] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [autoProcessing, setAutoProcessing] = useState(false);
    const [renamingFamilyId, setRenamingFamilyId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameProcessing, setRenameProcessing] = useState(false);
    const [fatherProcessingId, setFatherProcessingId] = useState(null);
    const [fatherOverrides, setFatherOverrides] = useState({});
    const [fatherErrors, setFatherErrors] = useState({});

    useEffect(() => {
        setFatherOverrides(Object.fromEntries(families.data.map((family) => [family.id, {
            father_id: family.father_id,
            father_name: family.father_name,
        }])));
        setFatherErrors({});
    }, [families.data]);

    const targetFamily = useMemo(
        () => mode?.type === 'add' ? families.data.find((family) => family.id === mode.familyId) : null,
        [families.data, mode],
    );
    const targetFather = targetFamily ? fatherDetails(targetFamily, fatherOverrides) : null;
    const anchorIsFather = mode?.type === 'add' && Boolean(targetFather?.father_id);
    const anchorId = mode?.type === 'add'
        ? targetFather?.father_id || targetFamily?.members?.[0]?.id
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
    }, [anchorId, anchorIsFather, mode, searchText]);

    const closeManual = () => {
        setMode(null);
        setSearchText('');
        setSelectedVoters([]);
        setFamilyName('');
    };

    const selectUdm = (udm) => {
        closeManual();
        setRenamingFamilyId(null);
        setFatherOverrides({});
        setFatherErrors({});
        router.get(route('keluarga-pemilih.index'), udm ? { udm } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const startNewFamily = () => {
        setMode({ type: 'new' });
        setSearchText('');
        setSelectedVoters([]);
        setFamilyName('');
    };

    const startAddingToFamily = (family) => {
        setMode({ type: 'add', familyId: family.id });
        setSearchText('');
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
            ...(mode.type === 'new' ? { name: familyName } : {}),
        };

        router.post(url, payload, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: closeManual,
        });
    };

    const runAuto = () => {
        if (!window.confirm('Auto hanya membentuk keluarga apabila no. rumah, alamat kediaman, lokaliti dan UDM sepadan tepat. Teruskan?')) return;

        router.post(route('keluarga-pemilih.auto'), {}, {
            preserveScroll: true,
            onStart: () => setAutoProcessing(true),
            onFinish: () => setAutoProcessing(false),
        });
    };

    const removeMember = (family, voter) => {
        if (!window.confirm(`Keluarkan ${voter.name || 'pemilih ini'} daripada ${family.name}?`)) return;
        router.delete(route('keluarga-pemilih.members.destroy', { pemilihFamily: family.id, pemilihRecord: voter.id }), { preserveScroll: true });
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

        router.put(route('keluarga-pemilih.update', familyId), { name: renameValue }, {
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

            setFatherOverrides((current) => ({
                ...current,
                [family.id]: {
                    father_id: payload.father_id,
                    father_name: payload.father_name,
                },
            }));
        } catch (error) {
            setFatherErrors((current) => ({ ...current, [family.id]: error.message }));
        } finally {
            setFatherProcessingId(null);
        }
    };

    const selectedIds = new Set(selectedVoters.map((voter) => voter.id));

    return (
        <AuthenticatedLayout header={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="label-section">Operasi · Pengurusan Pemilih</p><h2 className="mt-0.5 heading-lg">Keluarga Pemilih</h2><p className="mt-1 max-w-2xl text-xs text-slate-500">Satukan pemilih yang tinggal serumah. Semak padanan cadangan dahulu atau biarkan sistem mengumpulkan rekod yang mempunyai bukti kediaman sepadan tepat.</p></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={startNewFamily} className="btn-primary inline-flex items-center gap-1.5"><Icon name="plus" />Tambah Manual</button>
                    <button type="button" onClick={runAuto} disabled={autoProcessing || stats.unassigned === 0} className="btn-ghost inline-flex items-center gap-1.5 border-green-200 text-green-800 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="sparkles" />{autoProcessing ? 'Memproses…' : 'Auto Keluarga'}</button>
                </div>
            </div>
        }>
            <Head title="Keluarga Pemilih" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Jumlah Keluarga" value={stats.families} icon="home" />
                    <StatCard label="Pemilih Aktif" value={stats.voters} icon="users" />
                    <StatCard label="Sudah Berkeluarga" value={stats.assigned} icon="users" />
                    <StatCard label="Belum Berkeluarga" value={stats.unassigned} icon="plus" />
                </section>

                <section className="space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="label-section">Ringkasan UDM</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{filters.udm ? 'UDM dipilih' : 'Klik kad untuk tapis keluarga'}</h3></div>
                        <div className="flex flex-col gap-1 sm:items-end">
                            {filters.udm && <p className="text-xs font-semibold text-green-800">{filters.udm}</p>}
                            <label htmlFor="keluarga-udm-filter" className="sr-only">Tapis keluarga mengikut UDM</label>
                            <select id="keluarga-udm-filter" value={filters.udm} onChange={(event) => selectUdm(event.target.value)} className="input-field w-full text-xs sm:w-56">
                                <option value="">Semua UDM</option>
                                {udmSummaries.map((summary) => <option key={summary.udm} value={summary.udm}>{summary.udm}</option>)}
                            </select>
                        </div>
                    </div>
                    {!filters.udm && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <button type="button" onClick={() => selectUdm('')} aria-pressed="true" className="card w-full cursor-pointer border-green-500 bg-green-50 p-3 text-left ring-1 ring-green-200 transition hover:border-green-300">
                            <span className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-900">Semua UDM</span><span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold text-slate-500">{udmSummaries.length} UDM</span></span>
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

                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0" />
                    <p><strong>Padanan automatik sangat ketat:</strong> rekod hanya dikumpulkan jika no. rumah, alamat kediaman, lokaliti dan UDM semuanya sama. Nama bin/binti, no. rumah atau lokaliti turut digunakan untuk menyusun cadangan manual, tetapi tidak mencukupi untuk auto-gabung.</p>
                </div>

                {mode && (
                    <section className="card overflow-hidden border-green-200">
                        <div className="flex items-start justify-between gap-3 border-b border-green-100 bg-green-50/70 px-3 py-3 sm:px-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-green-700">{mode.type === 'new' ? 'Keluarga baharu' : 'Tambah ahli keluarga'}</p>
                                <h3 className="mt-0.5 text-sm font-bold text-slate-900">{mode.type === 'new' ? 'Pilih pemilih untuk disatukan' : `Tambah pemilih ke ${targetFamily?.name || 'keluarga'}`}</h3>
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
                                            ? `Cadangan bin/binti ditanda hanya jika sepadan dengan ayah keluarga: ${targetFamily.father_name}.`
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
                                                return (
                                                    <label key={voter.id} className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition hover:bg-green-50/70 ${checked ? 'bg-green-50' : 'bg-white'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleVoter(voter)} className="mt-1 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex flex-wrap items-center gap-1.5">
                                                                <span className="text-xs font-bold text-slate-900">{voter.name || 'Nama tiada'}</span>
                                                                {voter.no_kp && <span className="text-[10px] text-slate-500">{voter.no_kp}</span>}
                                                            </span>
                                                            <span className="mt-1 flex flex-wrap gap-1">
                                                                {voter.no_rumah && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">Rumah {voter.no_rumah}</span>}
                                                                {voter.match_reasons.map((reason) => <span key={reason} className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-800">{reason}</span>)}
                                                            </span>
                                                            <span className="mt-1 block truncate text-[10px] text-slate-500">{[locationLabel(voter), voter.address].filter(Boolean).join(' · ') || 'Alamat tiada'}</span>
                                                        </span>
                                                        {voter.match_score >= 80 && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black text-green-800">Padanan kuat</span>}
                                                    </label>
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
                )}

                {filters.udm && <section className="space-y-2.5">
                    <div className="flex items-end justify-between gap-2">
                        <div><p className="label-section">Senarai Keluarga</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{families.total.toLocaleString('ms-MY')} keluarga{filters.udm ? ` · ${filters.udm}` : ' · Semua UDM'}</h3></div>
                        {stats.unassigned > 0 && <p className="text-right text-[11px] text-slate-500">{stats.unassigned.toLocaleString('ms-MY')} pemilih belum dikelompokkan</p>}
                    </div>

                    {families.data.length === 0 ? (
                        <div className="card-dashed px-4 py-10 text-center">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Icon name="home" className="h-5 w-5" /></span>
                            <h4 className="mt-3 text-sm font-bold text-slate-800">Belum ada keluarga pemilih</h4>
                            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Tambah keluarga secara manual atau jalankan auto untuk mengumpulkan rekod dengan maklumat kediaman yang sama tepat.</p>
                            <button type="button" onClick={startNewFamily} className="btn-primary mt-4">Mula Tambah Manual</button>
                        </div>
                    ) : (
                        <div className="grid gap-2.5 xl:grid-cols-2">
                            {families.data.map((family) => {
                                const locations = [...new Set(family.members.map(locationLabel).filter(Boolean))];
                                const father = fatherDetails(family, fatherOverrides);
                                return (
                                    <article key={family.id} className="card overflow-hidden">
                                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {renamingFamilyId === family.id ? (
                                                        <form onSubmit={(event) => saveRename(event, family.id)} className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={`Tukar nama ${family.name}`}>
                                                            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={255} aria-label="Nama keluarga" className="input-field min-w-0 flex-1 py-1 text-xs" />
                                                            <button type="submit" disabled={!renameValue.trim() || renameProcessing} aria-label="Simpan nama keluarga" title="Simpan nama" className="rounded-md p-1.5 text-green-700 transition hover:bg-green-50 disabled:opacity-50"><Icon name="check" /></button>
                                                            <button type="button" onClick={cancelRename} aria-label="Batal menukar nama" title="Batal" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Icon name="close" /></button>
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <h4 className="truncate text-sm font-black text-slate-900">{family.name}</h4>
                                                            <button type="button" onClick={() => startRename(family)} aria-label={`Tukar nama ${family.name}`} title="Tukar nama keluarga" className="rounded-md p-1 text-slate-400 transition hover:bg-green-50 hover:text-green-700"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                                                        </>
                                                    )}
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">{family.member_count} ahli</span>
                                                </div>
                                                {renamingFamilyId === family.id && errors.name && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-700">{errors.name}</p>}
                                                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Icon name="pin" className="h-3 w-3 shrink-0" />{locations.join(' · ') || 'Lokaliti tidak dinyatakan'}</p>
                                            </div>
                                            <button type="button" onClick={() => startAddingToFamily(family)} className="btn-ghost inline-flex shrink-0 items-center justify-center gap-1.5 border-green-200 text-green-800"><Icon name="plus" />Tambah Ahli</button>
                                        </div>
                                        {fatherErrors[family.id] && <p role="alert" className="px-3 pt-2 text-[10px] font-semibold text-rose-700">{fatherErrors[family.id]}</p>}
                                        <div className="divide-y divide-slate-100">
                                            {family.members.map((voter) => (
                                                <div key={voter.id} className="flex items-start gap-3 px-3 py-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600">{voter.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-800"><span className="truncate">{voter.name || 'Nama tiada'}</span>{Number(father.father_id) === Number(voter.id) && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-green-800">Ayah</span>}</p>
                                                        <p className="mt-0.5 text-[10px] text-slate-500">{[voter.no_kp, voter.no_rumah ? `Rumah ${voter.no_rumah}` : null, locationLabel(voter)].filter(Boolean).join(' · ') || 'Maklumat alamat tiada'}</p>
                                                        {voter.address && <p className="mt-0.5 truncate text-[10px] text-slate-500">{voter.address}</p>}
                                                    </div>
                                                    <button type="button" onClick={() => toggleFather(family, voter)} disabled={fatherProcessingId === family.id} aria-pressed={Number(father.father_id) === Number(voter.id)} className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold transition disabled:opacity-50 ${Number(father.father_id) === Number(voter.id) ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-700'}`}>
                                                        {fatherProcessingId === family.id ? '...' : Number(father.father_id) === Number(voter.id) ? 'Ayah · Nyah tanda' : 'Tandakan ayah'}
                                                    </button>
                                                    <button type="button" onClick={() => removeMember(family, voter)} aria-label={`Keluarkan ${voter.name || 'pemilih'} daripada keluarga`} title="Keluarkan daripada keluarga" className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"><Icon name="trash" /></button>
                                                </div>
                                            ))}
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
                                    ? <Link key={link.url} href={link.url} preserveScroll className={`rounded-lg px-3 py-1.5 text-xs font-bold ${link.active ? 'bg-green-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-700'}`}>{paginationText(link.label)}</Link>
                                    : <span key={`disabled-${link.label}`} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400">{paginationText(link.label)}</span>
                            ))}
                        </nav>
                    )}
                </section>}
            </div>
        </AuthenticatedLayout>
    );
}
