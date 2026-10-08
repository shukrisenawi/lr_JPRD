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

export default function Index({ filters, month_options, summary, records, available_cula_codes }) {
    const [search, setSearch] = useState(filters.q ?? '');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const visit = (values) => router.get(route('pemilih-baru.index'), values, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });

    const submitSearch = (event) => {
        event.preventDefault();
        visit({ bulan: filters.bulan, q: search });
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
                <section className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Semakan pemilih belum disahkan</p>
                            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">Kod cula yang disimpan akan dipindahkan ke rekod Pemilih Semasa apabila nombor ID sepadan semasa fail semasa diimport.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div>
                                <label htmlFor="filter-month" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Bulan import</label>
                                <select id="filter-month" value={filters.bulan} onChange={(event) => visit({ bulan: event.target.value, q: search })} className="input-field mt-1 min-w-44 py-2 text-xs">
                                    {month_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                            <form onSubmit={submitSearch} className="flex gap-2">
                                <label htmlFor="search-new-voter" className="sr-only">Cari pemilih baharu</label>
                                <input id="search-new-voter" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, No. KP atau lokaliti" className="input-field min-w-52 py-2 text-xs" />
                                <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Cari</button>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Jumlah bulan ini" value={summary.total} tone="slate" />
                    <SummaryCard label="Belum cula" value={summary.pending} tone="amber" />
                    <SummaryCard label="Sudah cula" value={summary.completed} tone="emerald" />
                    <SummaryCard label="Dah link" value={summary.linked} tone="blue" />
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Senarai Pemilih Baharu</h3>
                            <p className="mt-0.5 text-[10px] text-slate-400">{numberFormat.format(records.total ?? 0)} rekod · {filters.bulan}</p>
                        </div>
                        {filters.q && <button type="button" onClick={() => { setSearch(''); visit({ bulan: filters.bulan, q: '' }); }} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Kosongkan carian</button>}
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
