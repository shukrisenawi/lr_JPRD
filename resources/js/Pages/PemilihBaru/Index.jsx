import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const numberFormat = new Intl.NumberFormat('ms-MY');

function SummaryCard({ label, value, tone }) {
    const tones = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        blue: 'border-blue-200 bg-blue-50 text-blue-800',
        slate: 'border-slate-200 bg-white text-slate-800',
    };

    return (
        <div className={`rounded-xl border px-4 py-3 shadow-sm ${tones[tone] ?? tones.slate}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{label}</p>
            <p className="mt-1 text-2xl font-black leading-none">{numberFormat.format(value ?? 0)}</p>
        </div>
    );
}

function UdmFilterCard({ summary, onSelect }) {
    return (
        <button type="button" onClick={() => onSelect(summary.name)} className="group flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-400 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{summary.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Tapisan UDM untuk culaan pemilih baharu</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Pilih</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rekod bulan dipilih</p>
                <p className="mt-0.5 text-2xl font-black text-slate-800">{numberFormat.format(summary.total ?? 0)}</p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>{numberFormat.format(summary.completed ?? 0)} sudah cula</span>
                <span className="text-amber-700 group-hover:text-amber-600">Lihat senarai →</span>
            </div>
        </button>
    );
}

function CulaModal({ record, codes, onClose, onSave, processing, error }) {
    const [code, setCode] = useState(record?.cula_code ?? '');

    if (!record) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" onClick={onClose} aria-label="Tutup dialog" className="absolute inset-0 h-full w-full cursor-default bg-slate-950/40" />
            <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cula-pemilih-baru-title">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Rekod belum disahkan</p>
                        <h2 id="cula-pemilih-baru-title" className="mt-1 text-base font-bold text-slate-900">Kemaskini kod cula</h2>
                        <p className="mt-1 text-xs text-slate-500">{record.name || 'Nama tiada'} · {record.no_kp || record.id_lain || 'No. ID tiada'}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
                </div>

                <label htmlFor="pemilih-baru-cula-code" className="mt-5 block text-xs font-bold text-slate-700">Kod cula</label>
                <select id="pemilih-baru-cula-code" value={code} onChange={(event) => setCode(event.target.value)} className="input-field mt-1 w-full py-2 text-sm">
                    <option value="" disabled>Pilih kod cula</option>
                    {codes.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                </select>
                {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                    <button type="button" onClick={() => onSave(code)} disabled={!code || processing} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
                        {processing ? 'Menyimpan...' : 'Simpan Cula'}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default function Index({ filters, month_options, year_options, summary, records, available_cula_codes, udms, udm_summaries, localities }) {
    const [search, setSearch] = useState(filters.q ?? '');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const selectedMonthLabel = month_options.find((option) => option.value === filters.bulan)?.label ?? filters.bulan;

    const visit = (values) => router.get(route('pemilih-baru.index'), values, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });

    const submitSearch = (event) => {
        event.preventDefault();
        visit({ ...filters, q: search });
    };

    const changeUdm = (udm) => {
        setSearch('');
        visit({ ...filters, udm, locality: '', q: '' });
    };
    const changeMonth = (bulan) => visit({ ...filters, bulan });
    const changeYear = (tahun) => visit({ ...filters, tahun });
    const changeLocality = (locality) => visit({ ...filters, locality });

    const clearSearch = () => {
        setSearch('');
        visit({ ...filters, q: '' });
    };

    const saveCula = (code) => {
        if (!selectedRecord || !code) return;
        setSaving(true);
        setSaveError('');
        router.post(route('pemilih-baru.cula.update', selectedRecord.id), { cula_code: code }, {
            preserveScroll: true,
            onSuccess: () => setSelectedRecord(null),
            onError: () => setSaveError('Kod cula gagal disimpan. Sila cuba lagi.'),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <AuthenticatedLayout header={
            <div>
                <p className="label-section">Operasi Culaan</p>
                <h2 className="mt-0.5 heading-lg">Cula Pemilih Baharu</h2>
                <p className="text-muted mt-0.5">Data belum disahkan diurus secara berasingan daripada Fail Pemilih Semasa.</p>
            </div>
        }>
            <Head title="Cula Pemilih Baharu" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="overflow-hidden rounded-xl border border-amber-300 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-xs font-black text-amber-800">⌕</span>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Tapisan Pemilih Baharu</h3>
                            <p className="mt-0.5 text-[10px] text-slate-500">Pilih UDM dahulu untuk membuka senarai culaan.</p>
                        </div>
                    </div>
                    <div className={`grid gap-3 p-4 sm:grid-cols-2 ${filters.udm ? 'xl:grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.7fr)_minmax(7rem,0.5fr)_minmax(12rem,1fr)_minmax(15rem,1.5fr)]' : 'xl:grid-cols-[minmax(14rem,1.5fr)_minmax(10rem,1fr)_minmax(8rem,0.7fr)]'}`}>
                        <div>
                            <label htmlFor="filter-udm" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">UDM</label>
                            <select id="filter-udm" value={filters.udm} onChange={(event) => changeUdm(event.target.value)} className="input-field mt-1 w-full py-2 text-xs">
                                <option value="">Pilih UDM</option>
                                {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-month" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Bulan</label>
                            <select id="filter-month" value={filters.bulan} onChange={(event) => changeMonth(event.target.value)} className="input-field mt-1 w-full py-2 text-xs">
                                {month_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-year" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Tahun</label>
                            <select id="filter-year" value={filters.tahun} onChange={(event) => changeYear(event.target.value)} className="input-field mt-1 w-full py-2 text-xs">
                                {year_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        {filters.udm && (
                            <>
                                <div>
                                    <label htmlFor="filter-locality" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Lokaliti</label>
                                    <select id="filter-locality" value={filters.locality} onChange={(event) => changeLocality(event.target.value)} className="input-field mt-1 w-full py-2 text-xs">
                                        <option value="">Semua Lokaliti</option>
                                        {localities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                                    </select>
                                </div>
                                <form onSubmit={submitSearch} className="flex items-end gap-2">
                                    <div className="min-w-0 flex-1">
                                        <label htmlFor="search-new-voter" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cari Pemilih</label>
                                        <input id="search-new-voter" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau No. KP" className="input-field mt-1 w-full py-2 text-xs" />
                                    </div>
                                    <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Cari</button>
                                </form>
                            </>
                        )}
                    </div>
                </section>

                {!filters.udm ? (
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Pilih UDM</h3>
                                <p className="mt-0.5 text-[10px] text-slate-500">{selectedMonthLabel} {filters.tahun} · klik kad UDM untuk memaparkan senarai pemilih.</p>
                            </div>
                        </div>
                        {udm_summaries.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {udm_summaries.map((item) => <UdmFilterCard key={item.key} summary={item} onSelect={changeUdm} />)}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
                                <p className="text-sm font-bold text-slate-700">Tiada rekod pemilih baharu</p>
                                <p className="mt-1 text-xs text-slate-400">Import data dari Settings atau pilih bulan dan tahun yang mempunyai rekod.</p>
                            </div>
                        )}
                    </section>
                ) : (
                    <>
                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard label="Jumlah dipilih" value={summary.total} tone="slate" />
                            <SummaryCard label="Belum cula" value={summary.pending} tone="amber" />
                            <SummaryCard label="Sudah cula" value={summary.completed} tone="emerald" />
                            <SummaryCard label="Dah link" value={summary.linked} tone="blue" />
                        </section>

                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Senarai Pemilih Baharu · {filters.udm}</h3>
                            <p className="mt-0.5 text-[10px] text-slate-400">{numberFormat.format(records.total ?? 0)} rekod · {selectedMonthLabel} {filters.tahun}</p>
                        </div>
                        {filters.q && <button type="button" onClick={clearSearch} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Kosongkan carian</button>}
                    </div>

                    {records.data.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <p className="text-sm font-bold text-slate-700">Tiada rekod untuk tapisan ini</p>
                            <p className="mt-1 text-xs text-slate-400">Import fail pemilih baharu dari halaman Settings atau pilih bulan lain.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 text-left">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2.5">Pemilih</th>
                                        <th className="px-4 py-2.5">Kawasan</th>
                                        <th className="px-4 py-2.5">Transaksi</th>
                                        <th className="px-4 py-2.5">Cula</th>
                                        <th className="px-4 py-2.5">Remark</th>
                                        <th className="px-4 py-2.5 text-right">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {records.data.map((record) => (
                                        <tr key={record.id} className="align-top transition hover:bg-amber-50/40">
                                            <td className="max-w-72 px-4 py-3">
                                                <p className="text-xs font-bold text-slate-800">{record.name || 'Nama tiada'}</p>
                                                <p className="mt-1 text-[10px] text-slate-500">KP: {record.no_kp || '-'}{record.id_lain ? ` · ID lain: ${record.id_lain}` : ''}</p>
                                                <p className="mt-0.5 text-[10px] text-slate-400">{record.gender || '-'}{record.birth_year ? ` · Lahir ${record.birth_year}` : ''}{record.no_rumah ? ` · Rumah ${record.no_rumah}` : ''}</p>
                                            </td>
                                            <td className="min-w-40 px-4 py-3 text-[11px] text-slate-600">
                                                <p className="font-semibold">{record.dm || 'Tanpa UDM'}</p>
                                                <p className="mt-0.5 text-slate-400">{record.locality || 'Tanpa lokaliti'}</p>
                                            </td>
                                            <td className="max-w-64 px-4 py-3 text-[10px] leading-relaxed text-slate-500">{record.transaction || '-'}</td>
                                            <td className="min-w-36 px-4 py-3">
                                                {record.cula_code && !['0', '?', 'TIADA'].includes(String(record.cula_code).toUpperCase()) ? (
                                                    <span className="inline-flex flex-col rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">
                                                        <span>{record.cula_code}</span>
                                                        <span className="mt-0.5 max-w-40 font-medium text-emerald-700">{record.cula_display_label}</span>
                                                    </span>
                                                ) : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Belum cula</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${record.remark === 'Dah link' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>{record.remark}</span>
                                                {record.linked_at && <p className="mt-1 text-[9px] text-slate-400">{record.linked_at}</p>}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <button type="button" onClick={() => { setSelectedRecord(record); setSaveError(''); }} className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-amber-500">
                                                    {record.cula_code ? 'Ubah Cula' : 'Cula'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {records.links?.length > 3 && (
                        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-100 px-3 py-3">
                            {records.links.map((link) => (
                                <button key={`${link.label}-${link.url ?? 'disabled'}`} type="button" disabled={!link.url || link.active} onClick={() => link.url && router.visit(link.url, { preserveScroll: true })} className={`min-w-8 rounded-md px-2.5 py-1.5 text-[10px] font-bold ${link.active ? 'bg-slate-800 text-white' : link.url ? 'text-slate-500 hover:bg-slate-100' : 'cursor-not-allowed text-slate-300'}`}>
                                    {link.label.replace(/&laquo;|&raquo;/g, '').trim() || '‹ ›'}
                                </button>
                            ))}
                        </div>
                    )}
                        </section>
                    </>
                )}
            </div>

            <CulaModal
                record={selectedRecord}
                codes={available_cula_codes}
                onClose={() => setSelectedRecord(null)}
                onSave={saveCula}
                processing={saving}
                error={saveError}
            />
        </AuthenticatedLayout>
    );
}
