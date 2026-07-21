import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');

function fmt(v) {
    return nf.format(v ?? 0);
}

function StatCard({ label, value, detail, color = 'violet' }) {
    const colors = {
        violet: { card: 'border-slate-200 bg-white', icon: 'bg-green-100 text-green-700', value: 'text-slate-800', symbol: 'PK' },
        emerald: { card: 'border-lime-100 bg-white', icon: 'bg-lime-100 text-lime-700', value: 'text-emerald-700', symbol: 'BR' },
        amber: { card: 'border-amber-200 bg-white', icon: 'bg-amber-100 text-amber-700', value: 'text-orange-500', symbol: 'UP' },
        cyan: { card: 'border-sky-100 bg-white', icon: 'bg-sky-100 text-sky-700', value: 'text-blue-700', symbol: 'DP' },
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

function getName(record) {
    return record.payload?.['NAMA PEMOHON']
        || record.payload?.NAMA_PEMOHON
        || record.payload?.nama
        || record.payload?.name
        || record.payload?.nama_pemilih
        || '-';
}

function getNoKpDisplay(record) {
    return record.payload?.['NO KAD PENGENALAN']
        || record.payload?.NO_KAD_PENGENALAN
        || record.no_kp
        || '-';
}

function getPhone(record) {
    return record.payload?.['NO TELEFON']
        || record.payload?.NO_TELEFON
        || record.payload?.telefon
        || record.payload?.phone
        || '-';
}

function getAddress(record) {
    return record.payload?.ALAMAT
        || record.payload?.alamat
        || '-';
}

function getUniversity(record) {
    return record.payload?.UNIVERSITI
        || record.payload?.universiti
        || '-';
}

function getBidang(record) {
    return record.payload?.BIDANG
        || record.payload?.bidang
        || '-';
}

function getTarikhPermohonan(record) {
    return record.payload?.['TARIKH PERMOHONAN']
        || record.payload?.TARIKH_PERMOHONAN
        || '-';
}

function buildTelegramLink(command, identity) {
    const payload = identity ? `/${command} ${identity}` : `/${command}`;
    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(payload)}`;
}

function Pagination({ currentPage, totalPages, totalRecords, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalRecords);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 8;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {from} - {to} daripada {totalRecords} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Sebelum
                </button>
                {getPageNumbers().map((page) => (
                    <button
                        key={page}
                        type="button"
                        onClick={() => onPageChange(page)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${page === currentPage ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700'}`}
                    >
                        {page}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Seterusnya
                </button>
            </div>
        </div>
    );
}

export default function PusatKhidmatIndex({ sheet_url: initialSheetUrl, records: initialRecords, total_count: initialTotal, available_cula_codes: availableCulaCodes = [], udms = [], localities = [] }) {
    const { auth } = usePage().props;
    const accessLevel = auth.user?.access_level ?? 'jprd';
    const scope = accessLevel === 'jprd' ? null : (auth.user?.role?.slug === 'master-admin' ? null : null);
    const userScopeDm = accessLevel === 'udm' ? auth.user?.scope_key : (accessLevel === 'cawangan' ? auth.user?.scope_key?.split('|')[0] : null);
    const userScopeLocality = accessLevel === 'cawangan' ? auth.user?.scope_key?.split('|')[1] : null;
    const isScoped = accessLevel === 'udm' || accessLevel === 'cawangan';

    const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlInput, setUrlInput] = useState(initialSheetUrl);
    const [savingUrl, setSavingUrl] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [records, setRecords] = useState(initialRecords);
    const [totalCount, setTotalCount] = useState(initialTotal);
    const [newCount, setNewCount] = useState(null);
    const [updatedCount, setUpdatedCount] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedUdm, setSelectedUdm] = useState(userScopeDm || '');
    const [selectedLocality, setSelectedLocality] = useState(userScopeLocality || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('belum');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [showCulaModal, setShowCulaModal] = useState(false);
    const [pendingIds, setPendingIds] = useState(new Set());
    const [checkedIds, setCheckedIds] = useState(() => {
        try {
            const saved = localStorage.getItem('pusat-khidmat-checked-ids');
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch {}
        return new Set();
    });
    const [checkedTimestamps, setCheckedTimestamps] = useState(() => {
        try {
            const saved = localStorage.getItem('pusat-khidmat-checked-timestamps');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch {}
        return {};
    });
    const pageSize = 20;

    const unlinkedRecords = useMemo(() => records.filter((r) => !r.linked), [records]);

    const culaStatuses = useMemo(() => {
        const map = new Map();
        records.forEach((r) => {
            if (!r.linked || !r.pemilih) return;
            const code = r.pemilih.cula_code;
            const label = r.pemilih.cula_display_label || '';
            const isDone = code && code !== '0' && code !== '?' && !label.includes('BELUM DICULA');
            map.set(r.id, isDone ? 'done' : 'pending');
        });
        return map;
    }, [records]);

    const hasCulaCode = useMemo(() => {
        const map = new Map();
        records.forEach((r) => {
            if (!r.linked || !r.pemilih) return;
            const code = r.pemilih.cula_code;
            const hasCode = code && code !== '0' && code !== '?';
            map.set(r.id, hasCode);
        });
        return map;
    }, [records]);

    const semakStatuses = useMemo(() => {
        const map = new Map();
        records.forEach((r) => {
            if (!r.linked || !r.pemilih) return;
            map.set(r.id, checkedIds.has(r.id));
        });
        return map;
    }, [records, checkedIds]);

    const udmLocalityCount = useMemo(() => {
        const count = {};
        records.forEach((r) => {
            if (!r.linked || !r.pemilih) return;
            const dm = r.pemilih.dm;
            const loc = r.pemilih.locality;
            if (dm && loc) {
                if (!count[dm]) count[dm] = new Set();
                count[dm].add(loc);
            }
        });
        return Object.fromEntries(Object.entries(count).map(([k, v]) => [k, v.size]));
    }, [records]);

    const tabRecords = useMemo(() => {
        switch (activeTab) {
            case 'belum':
                return records.filter((r) => r.linked && culaStatuses.get(r.id) === 'pending' && !semakStatuses.get(r.id));
            case 'siap':
                return records.filter((r) => r.linked && culaStatuses.get(r.id) === 'done' && !semakStatuses.get(r.id));
            case 'tiada':
                return unlinkedRecords;
            case 'semak':
                return records
                    .filter((r) => r.linked && semakStatuses.get(r.id))
                    .sort((a, b) => (checkedTimestamps[b.id] || 0) - (checkedTimestamps[a.id] || 0));
            default:
                return records.filter((r) => r.linked && culaStatuses.get(r.id) === 'pending' && !semakStatuses.get(r.id));
        }
    }, [records, unlinkedRecords, culaStatuses, semakStatuses, activeTab, checkedTimestamps]);

    const activeRecords = useMemo(() => {
        let result = tabRecords;
        if (selectedUdm) {
            result = result.filter((r) => r.pemilih?.dm === selectedUdm);
        }
        if (selectedLocality) {
            result = result.filter((r) => r.pemilih?.locality === selectedLocality);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((r) => {
                const name = getName(r).toLowerCase();
                const noKp = getNoKpDisplay(r).toLowerCase();
                const noKpClean = String(r.no_kp || '').toLowerCase();
                return name.includes(q) || noKp.includes(q) || noKpClean.includes(q);
            });
        }
        return result;
    }, [tabRecords, selectedUdm, selectedLocality, search]);

    const totalPages = Math.ceil(activeRecords.length / pageSize);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return activeRecords.slice(start, start + pageSize);
    }, [activeRecords, currentPage]);

    const linkedCount = records.filter((r) => r.linked).length;
    const unlinkedCount = unlinkedRecords.length;
    const doneCount = records.filter((r) => r.linked && culaStatuses.get(r.id) === 'done').length;
    const pendingCount = linkedCount - doneCount;

    const tabCountsByUdm = useMemo(() => {
        const counts = { belum: 0, siap: 0, tiada: 0, semak: 0 };
        records.forEach((r) => {
            if (selectedUdm && r.pemilih?.dm !== selectedUdm) return;
            if (!r.linked) {
                counts.tiada++;
            } else if (semakStatuses.get(r.id)) {
                counts.semak++;
            } else if (culaStatuses.get(r.id) === 'done') {
                counts.siap++;
            } else {
                counts.belum++;
            }
        });
        return counts;
    }, [records, selectedUdm, culaStatuses, semakStatuses]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setSearch('');
        if (!isScoped) {
            setSelectedUdm('');
            setSelectedLocality('');
        }
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateRecordCula = (recordId, culaCode, culaDisplayLabel) => {
        setRecords((prev) => prev.map((r) => {
            if (r.id !== recordId) return r;
            const next = { ...r };
            if (next.pemilih) {
                next.pemilih = { ...next.pemilih, cula_code: culaCode, cula_display_label: culaDisplayLabel };
            }
            return next;
        }));
    };

    const handleCheckToggle = (recordId) => {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(recordId)) {
                next.delete(recordId);
            } else {
                next.add(recordId);
                setCheckedTimestamps((prevTs) => ({ ...prevTs, [recordId]: Date.now() }));
            }
            return next;
        });
    };

    const [successModal, setSuccessModal] = useState(null);

    useEffect(() => {
        try {
            localStorage.setItem('pusat-khidmat-checked-ids', JSON.stringify([...checkedIds]));
            localStorage.setItem('pusat-khidmat-checked-timestamps', JSON.stringify(checkedTimestamps));
        } catch {}
    }, [checkedIds, checkedTimestamps]);

    const handleCulaSiap = async (code, label) => {
        if (!selectedRecord?.pemilih || !code) return;
        setShowCulaModal(false);
        setPendingIds((prev) => new Set([...prev, selectedRecord.pemilih.id]));
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('pusat-khidmat.update-cula', selectedRecord.pemilih.id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                body: JSON.stringify({ cula_code: code, cula_display_label: label }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.message || 'Gagal.');
            updateRecordCula(selectedRecord.id, code, label);
            setCheckedIds((prev) => new Set([...prev, selectedRecord.id]));
            setSuccessModal(`Kod culaan ${getName(selectedRecord)} (${label}) berjaya dikemaskini.`);
        } catch (e) {
            setSuccessModal(e instanceof Error ? e.message : 'Ralat tidak diketahui.');
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(selectedRecord.pemilih.id);
                return next;
            });
            setSelectedRecord(null);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setMessage('');
        setNewCount(null);
        setUpdatedCount(null);
        setSearch('');
        setCurrentPage(1);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('pusat-khidmat.sync'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
            });
            const payload = await res.json();

            if (!res.ok) throw new Error(payload.message || 'Gagal.');

            setRecords(payload.records);
            setTotalCount(payload.total_count);
            setNewCount(payload.new_count);
            setUpdatedCount(payload.updated_count);
            setMessage(payload.message);
            setMessageType('success');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Ralat tidak diketahui.');
            setMessageType('error');
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveUrl = async () => {
        setSavingUrl(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('pusat-khidmat.sheet-url'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                body: JSON.stringify({ url: urlInput }),
            });
            const payload = await res.json();

            if (!res.ok) throw new Error(payload.message || 'Gagal.');

            setSheetUrl(urlInput);
            setEditingUrl(false);
            setMessage(payload.message);
            setMessageType('success');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Ralat tidak diketahui.');
            setMessageType('error');
        } finally {
            setSavingUrl(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="label-section">Operasi</p>
                        <h2 className="mt-0.5 heading-lg">Data Pusat Khidmat</h2>
                        <p className="text-muted mt-0.5">Ambil data dari Google Sheet dan pautkan dengan rekod pemilih melalui No Kad Pengenalan.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => { setEditingUrl(!editingUrl); if (!editingUrl) setUrlInput(sheetUrl); }}
                            className="btn-ghost"
                        >
                            {editingUrl ? 'Batal' : 'Tukar URL'}
                        </button>
                        <button type="button" onClick={handleSync} disabled={syncing} className="btn-emerald">
                            {syncing ? 'Mengambil...' : 'Get Data'}
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Pusat Khidmat" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                {editingUrl && (
                    <div className="card">
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label htmlFor="sheet-url-input" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">URL Google Sheet</label>
                                <input
                                    id="sheet-url-input"
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                />
                            </div>
                            <button type="button" onClick={handleSaveUrl} disabled={savingUrl} className="btn-primary">
                                {savingUrl ? 'Menyimpan...' : 'Simpan URL'}
                            </button>
                        </div>
                    </div>
                )}

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Jumlah Rekod" value={totalCount} color="violet" />
                    <StatCard label="Dipaut Pemilih" value={linkedCount} detail={`${unlinkedCount} belum dipaut`} color="emerald" />
                    <StatCard label="Baru Ditambah" value={newCount !== null ? newCount : 0} color="amber" />
                    <StatCard label="Dikemaskini" value={updatedCount !== null ? updatedCount : 0} color="cyan" />
                </section>

                <section className="card overflow-hidden p-0">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => handleTabChange('belum')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'belum' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Belum Cula ({tabCountsByUdm.belum})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('siap')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'siap' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Siap Cula ({tabCountsByUdm.siap})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('tiada')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'tiada' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Tiada Data Pemilih ({tabCountsByUdm.tiada})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('semak')}
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'semak' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Siap Semak ({tabCountsByUdm.semak})
                            </button>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                {isScoped ? (
                                    <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                                        {userScopeDm}
                                    </span>
                                ) : (
                                    <select
                                        value={selectedUdm}
                                        onChange={(e) => { setSelectedUdm(e.target.value); setSelectedLocality(''); setCurrentPage(1); }}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    >
                                        <option value="">Semua UDM</option>
                                        {udms.map((dm) => (
                                            <option key={dm} value={dm}>{dm}</option>
                                        ))}
                                    </select>
                                )}
                                {isScoped && userScopeLocality ? (
                                    <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                                        {userScopeLocality}
                                    </span>
                                ) : (
                                    <select
                                        value={selectedLocality}
                                        onChange={(e) => { setSelectedLocality(e.target.value); setCurrentPage(1); }}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    >
                                        <option value="">Semua Lokaliti</option>
                                        {localities
                                            .filter((loc) => !selectedUdm || records.some((r) => r.pemilih?.dm === selectedUdm && r.pemilih?.locality === loc))
                                            .map((loc) => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                    </select>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 lg:min-w-[16rem]">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                        placeholder="Cari nama atau no kp..."
                                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    />
                                </div>
                                {(search || selectedUdm || selectedLocality) && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`${messageType === 'success' ? 'flash-success' : messageType === 'error' ? 'flash-error' : 'flash-info'}`}>
                            {message}
                        </div>
                    )}

                    <div className="p-3">
                        {records.length === 0 ? (
                            <div className="card-dashed">
                                <p className="text-base font-black text-slate-950">Tiada data</p>
                                <p className="mt-1 text-sm text-slate-600">Tekan "Get Data" untuk mula mengambil data dari Google Sheet.</p>
                            </div>
                        ) : activeRecords.length === 0 ? (
                            <div className="card-dashed">
                                <p className="text-base font-black text-slate-950">Tiada keputusan</p>
                                <p className="mt-1 text-sm text-slate-600">Tiada rekod sepadan dengan tab dan carian anda.</p>
                            </div>
                        ) : (
                            <>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {paginatedRecords.map((record, index) => {
                                const name = getName(record);
                                const noKp = getNoKpDisplay(record);
                                const phone = getPhone(record);
                                const address = getAddress(record);
                                const university = getUniversity(record);
                                const bidang = getBidang(record);
                                const tarikh = getTarikhPermohonan(record);
                                const globalIndex = (currentPage - 1) * pageSize + index + 1;

                                return (
                                    <div
                                        key={record.id}
                                        className={`rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${record.linked ? 'border-green-600' : 'border-slate-200'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-500 text-xs font-black text-white shadow-sm">
                                                    {globalIndex}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold leading-5 text-slate-800">{name}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                                        {record.pemilih?.dm && (
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                {record.pemilih.dm}
                                                            </span>
                                                        )}
                                                        {record.pemilih?.locality && (udmLocalityCount[record.pemilih.dm] || 1) > 1 && (
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                {record.pemilih.locality}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-2 text-xs">
                                            <div className="grid grid-cols-2 gap-2">
                                                {noKp && noKp !== '-' && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">No KP</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{noKp}</p>
                                                    </div>
                                                )}
                                                {phone && phone !== '-' && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">Telefon</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{phone}</p>
                                                    </div>
                                                )}
                                                {address && address !== '-' && (
                                                    <div className="col-span-2">
                                                        <span className="font-semibold text-green-700">Alamat</span>
                                                        <p className="mt-0.5 font-medium text-slate-600">{address}</p>
                                                    </div>
                                                )}
                                                {university && university !== '-' && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">Universiti</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{university}</p>
                                                    </div>
                                                )}
                                                {bidang && bidang !== '-' && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">Bidang</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{bidang}</p>
                                                    </div>
                                                )}
                                                {tarikh && tarikh !== '-' && (
                                                    <div className="col-span-2">
                                                        <span className="font-semibold text-green-700">Tarikh Permohonan</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{tarikh}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {record.linked && record.pemilih && (
                                            <>
                                            <div className="mt-3 rounded-lg border border-green-100 bg-green-50/60 p-2.5">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-green-700">Data Pemilih</p>
                                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                    {record.pemilih.no_ahli && (
                                                        <p><span className="text-slate-500">No Ahli:</span> <span className="font-bold text-slate-800">{record.pemilih.no_ahli}</span></p>
                                                    )}
                                                    {(record.pemilih.cula_display_label || record.pemilih.cula_code) && (
                                                        <p className="flex items-center gap-1">
                                                            <span className="text-slate-500">Cula:</span>
                                                            <span className="font-bold text-slate-800">{record.pemilih.cula_display_label || record.pemilih.cula_code}</span>
                                                        </p>
                                                    )}
                                                    {record.pemilih.no_rumah && record.pemilih.no_rumah !== '-' && (
                                                        <p><span className="text-slate-500">No Rumah:</span> <span className="font-bold text-slate-800">{record.pemilih.no_rumah}</span></p>
                                                    )}
                                                    {record.pemilih.alamat_kediaman && record.pemilih.alamat_kediaman !== '-' && (
                                                        <p className="col-span-2"><span className="text-slate-500">Alamat:</span> <span className="font-bold text-slate-800">{record.pemilih.alamat_kediaman}</span></p>
                                                    )}
                                                </div>
                                            </div>
                                                {(activeTab === 'belum' || activeTab === 'siap') && record.pemilih && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <a
                                                            href={buildTelegramLink('kemascula', record.pemilih.no_kp)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={() => { setSelectedRecord(record); setShowCulaModal(true); }}
                                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                        >
                                                            Cula
                                                        </a>
                                                        {phone && phone !== '-' && (
                                                            <a
                                                                href={buildTelegramLink('kemastel', record.pemilih.no_kp)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                                            >
                                                                Kemas Tel
                                                            </a>
                                                        )}
                                                        {activeTab === 'siap' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCheckToggle(record.id)}
                                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${semakStatuses.get(record.id) ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-400 hover:border-blue-500 hover:text-blue-500'}`}
                                                                title={semakStatuses.get(record.id) ? 'Buang dari Siap Semak' : 'Tanda untuk semak'}
                                                            >
                                                                ✓
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            {activeTab === 'semak' && (
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCheckToggle(record.id)}
                                                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                                    >
                                                        Kembali Data
                                                    </button>
                                                </div>
                                            )}
                                            </>
                                        )}

                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={activeRecords.length}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </div>

            {showCulaModal && selectedRecord?.pemilih && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCulaModal(false)} onKeyDown={(e) => e.key === 'Escape' && setShowCulaModal(false)} tabIndex={-1}>
                    <div role="document" className="mx-4 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Kemaskini Cula — {getName(selectedRecord)}</h3>
                            <button
                                type="button"
                                onClick={() => { setShowCulaModal(false); setSelectedRecord(null); }}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50"
                            >
                                Tutup
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Pilih kod culaan untuk dikemaskini:</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {[...availableCulaCodes]
                                .filter((c) => {
                                    const label = c.label || '';
                                    return !label.includes('BELUM DICULA') && label !== 'M';
                                })
                                .sort((a, b) => {
                                    const na = parseInt(a.code, 10);
                                    const nb = parseInt(b.code, 10);
                                    return (na || 999) - (nb || 999) || a.code.localeCompare(b.code);
                                }).map((c) => (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => handleCulaSiap(c.code, c.label || c.code)}
                                        disabled={pendingIds.has(selectedRecord.pemilih.id)}
                                        className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${c.code === (selectedRecord.pemilih.cula_code || '') ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}
                                    >
                                        {c.label || c.code}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {successModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{successModal}</p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSuccessModal(null)}
                                className="rounded-md bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-500"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
            </div>
        </AuthenticatedLayout>
    );
}
