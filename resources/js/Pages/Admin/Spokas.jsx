import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const numberFormat = new Intl.NumberFormat('ms-MY');

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
        check: <><path d="m5 12 4 4L19 6" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
        alert: <><path d="M10.3 3.5 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
}

function SummaryCard({ label, value, tone = 'green', icon }) {
    const tones = {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        blue: 'border-sky-200 bg-sky-50 text-sky-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider">{label}</p>
                <Icon name={icon} className="h-4 w-4" />
            </div>
            <p className="mt-1 text-2xl font-black">{numberFormat.format(value)}</p>
        </div>
    );
}

function ResultTable({ items, kind }) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 50;
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) return items;

        return items.filter((item) => [
            item.name,
            item.member_number,
            item.ic_birth,
            item.pemilih_name,
            item.pemilih_no_kp,
            item.reason,
        ].some((value) => String(value ?? '').toLowerCase().includes(needle)));
    }, [items, query]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const successful = kind !== 'failed';

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-900">{numberFormat.format(filtered.length)} rekod</p>
                    <p className="text-xs text-slate-500">Papar maksimum 50 rekod setiap halaman.</p>
                </div>
                <div className="relative sm:w-72">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                        placeholder="Cari nama atau nombor..."
                        className="input-field w-full pl-9 text-xs"
                    />
                </div>
            </div>

            {visible.length === 0 ? (
                <p className="p-8 text-center text-xs font-semibold text-slate-400">Tiada rekod untuk dipaparkan.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-3 py-2">Nama SPoKAS</th>
                                <th className="px-3 py-2">No. Ahli PAS</th>
                                {successful ? (
                                    <>
                                        <th className="px-3 py-2">Nama Pemilih</th>
                                        <th className="px-3 py-2">No. K/P Pemilih</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-3 py-2">IC Birth</th>
                                        <th className="px-3 py-2">Sebab</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((item) => (
                                <tr key={`${kind}-${item.spokas_id}`} className="hover:bg-emerald-50/40">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{item.name || '-'}</td>
                                    <td className="px-3 py-2 font-mono text-slate-600">{item.member_number || '-'}</td>
                                    {successful ? (
                                        <>
                                            <td className="px-3 py-2 text-slate-700">
                                                <div className="font-semibold">{item.pemilih_name || '-'}</div>
                                                <span className={`mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${kind === 'ic' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                                                    {kind === 'ic' ? 'Padan IC' : 'Padan nama'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.pemilih_no_kp || '-'}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.ic_birth || '-'}</td>
                                            <td className="px-3 py-2 text-red-700">{item.reason}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filtered.length > pageSize && (
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                    <span className="text-[11px] font-semibold text-slate-500">Halaman {currentPage} / {totalPages}</span>
                    <div className="flex gap-1">
                        <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="btn-ghost px-2 py-1 text-[11px] disabled:opacity-40">Sebelum</button>
                        <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="btn-ghost px-2 py-1 text-[11px] disabled:opacity-40">Seterusnya</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Spokas({ spokas_count, pemilih_count, results, last_migrated_at }) {
    const { post, processing } = useForm({});
    const [tab, setTab] = useState('ic');
    const icMatches = results?.ic_matches ?? [];
    const nameMatches = results?.name_matches ?? [];
    const failed = results?.failed ?? [];
    const activeItems = tab === 'ic' ? icMatches : (tab === 'name' ? nameMatches : failed);

    const migrate = () => {
        if (! window.confirm('Teruskan migrasi No. Ahli PAS ke data pemilih?')) return;
        post(route('admin.spokas.migrate'), { preserveScroll: true });
    };

    const tabs = [
        { key: 'ic', label: 'Berjaya guna IC', count: icMatches.length, active: 'border-sky-600 bg-sky-50 text-sky-800' },
        { key: 'name', label: 'Berjaya guna nama', count: nameMatches.length, active: 'border-violet-600 bg-violet-50 text-violet-800' },
        { key: 'failed', label: 'Tidak berjaya', count: failed.length, active: 'border-red-600 bg-red-50 text-red-800' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Pentadbiran</p>
                    <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">SPoKAS</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Padankan nombor ahli PAS dengan rekod pemilih.</p>
                </div>
            }
        >
            <Head title="SPoKAS" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon name="database" /></span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Migrasi No. Ahli PAS</h3>
                                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Sistem akan cuba padan IC Birth SPoKAS dengan No. K/P pemilih dahulu. Jika tiada padanan, sistem akan cuba nama yang sama sebelum mengemaskini column No. Ahli PAS.</p>
                            </div>
                        </div>
                        <PrimaryButton type="button" onClick={migrate} disabled={processing} className="shrink-0 px-5 py-2">
                            {processing ? 'Sedang migrate...' : 'Migrate'}
                            {!processing && <Icon name="arrow" className="ml-2 h-4 w-4" />}
                        </PrimaryButton>
                    </div>
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Padanan nama mesti tepat selepas normalisasi huruf besar dan jarak kosong. Padanan berganda tidak akan dikemaskini secara automatik.</span>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                    <SummaryCard label="Rekod SPoKAS" value={spokas_count} icon="database" />
                    <SummaryCard label="Rekod Pemilih" value={pemilih_count} tone="blue" icon="user" />
                    {results && <SummaryCard label="Jumlah Dikemaskini" value={results.updated_count} tone="green" icon="check" />}
                    {results && <SummaryCard label="Tidak Berjaya" value={failed.length} tone="red" icon="alert" />}
                </section>

                {last_migrated_at && <p className="text-right text-[11px] font-semibold text-slate-500">Migrasi terakhir: {last_migrated_at}</p>}

                {results ? (
                    <section className="space-y-3">
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Keputusan migrasi SPoKAS">
                            {tabs.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === item.key}
                                    onClick={() => setTab(item.key)}
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${tab === item.key ? item.active : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                                >
                                    {item.label} <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{numberFormat.format(item.count)}</span>
                                </button>
                            ))}
                        </div>
                        <ResultTable items={activeItems} kind={tab} />
                    </section>
                ) : (
                    <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <p className="text-sm font-bold text-slate-700">Belum ada keputusan migrasi</p>
                        <p className="mt-1 text-xs text-slate-500">Klik butang Migrate untuk mula padanan data.</p>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
