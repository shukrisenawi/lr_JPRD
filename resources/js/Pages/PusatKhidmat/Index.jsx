import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

export default function PusatKhidmatIndex({ sheet_url: initialSheetUrl, records: initialRecords, total_count: initialTotal }) {
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
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const filteredRecords = useMemo(() => {
        if (!search.trim()) return records;
        const q = search.toLowerCase();
        return records.filter((r) => {
            const name = getName(r).toLowerCase();
            const noKp = getNoKpDisplay(r).toLowerCase();
            const noKpClean = String(r.no_kp || '').toLowerCase();
            return name.includes(q) || noKp.includes(q) || noKpClean.includes(q);
        });
    }, [records, search]);

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage]);

    const linkedCount = records.filter((r) => r.linked).length;
    const unlinkedCount = records.length - linkedCount;

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

                <section className="card p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Sumber Data</h3>
                            <p className="text-sm font-medium text-slate-700">{sheetUrl}</p>
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
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setCurrentPage(1); }}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {message && (
                    <div className={`${messageType === 'success' ? 'flash-success' : messageType === 'error' ? 'flash-error' : 'flash-info'}`}>
                        {message}
                    </div>
                )}

                {records.length === 0 ? (
                    <div className="card-dashed">
                        <p className="text-base font-black text-slate-950">Tiada data</p>
                        <p className="mt-1 text-sm text-slate-600">Tekan "Get Data" untuk mula mengambil data dari Google Sheet.</p>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="card-dashed">
                        <p className="text-base font-black text-slate-950">Tiada keputusan</p>
                        <p className="mt-1 text-sm text-slate-600">Tiada rekod sepadan dengan carian anda.</p>
                    </div>
                ) : (
                    <section>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                                                        {record.linked ? (
                                                            <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden="true"><title>dipaut</title><polyline points="20 6 9 17 4 12" /></svg>
                                                                Dipaut
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                                                Tiada pautan
                                                            </span>
                                                        )}
                                                        {record.pemilih?.dm && (
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                                                {record.pemilih.dm}
                                                            </span>
                                                        )}
                                                        {record.pemilih?.locality && (
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
                                                <div>
                                                    <span className="font-semibold text-green-700">No KP</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{noKp}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Telefon</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{phone}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="font-semibold text-green-700">Alamat</span>
                                                    <p className="mt-0.5 font-medium text-slate-600">{address}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Universiti</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{university}</p>
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-green-700">Bidang</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{bidang}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="font-semibold text-green-700">Tarikh Permohonan</span>
                                                    <p className="mt-0.5 font-bold text-slate-800">{tarikh}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {record.linked && record.pemilih && (
                                            <div className="mt-3 rounded-lg border border-green-100 bg-green-50/60 p-2.5">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-green-700">Data Pemilih</p>
                                                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                                    <p><span className="text-slate-500">No Ahli:</span> <span className="font-bold text-slate-800">{record.pemilih.no_ahli || '-'}</span></p>
                                                    <p><span className="text-slate-500">Cula:</span> <span className="font-bold text-slate-800">{record.pemilih.cula_display_label || record.pemilih.cula_code || '-'}</span></p>
                                                    <p><span className="text-slate-500">Status:</span> <span className={`font-bold ${record.pemilih.status === 'aktif' ? 'text-green-700' : 'text-red-600'}`}>{record.pemilih.status || '-'}</span></p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={filteredRecords.length}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                        />
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
