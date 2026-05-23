import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');
const chartColors = ['#8b5cf6', '#a78bfa', '#38bdf8', '#bbf7d0', '#f59e0b', '#ef4444'];
const udmCulaGroups = { umno: new Set(['1', '1A', '1B', '1P']), pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']) };

function fmt(v) { return nf.format(v ?? 0); }

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

function renderCula(b = []) {
    if (!b.length) return '-';
    return b.slice(0, 3).map((item, i) => (
        <span key={`${item.code}-${i}`}>{item.display_label}: <strong className="text-slate-950">{fmt(item.total)}</strong>{i < Math.min(b.length, 3) - 1 ? ', ' : ''}</span>
    ));
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

function DataTable({ rows, columns }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="table-header">
                        <tr>{columns.map((c) => <th key={c.key} className="px-2.5 py-1.5">{c.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                        {rows.map((row, i) => (
                            <tr key={row.key ?? `${row.name}-${i}`} className="hover:bg-green-50/50">
                                {columns.map((c) => <td key={c.key} className="px-2.5 py-2 align-top leading-4">{c.format ? c.format(row[c.key], row) : row[c.key]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ProgramLaporan({ program, report }) {
    const [tab, setTab] = useState('udm');
    const [udmKey, setUdmKey] = useState(() => report.dm_details?.[0]?.key ?? '');
    const [search, setSearch] = useState('');

    const selUdm = report.dm_details.find((r) => r.key === udmKey) ?? report.dm_details[0] ?? null;
    const selCula = report.cula_by_dm?.find((r) => r.key === udmKey) ?? report.cula_by_dm?.[0] ?? null;
    const selCulaChart = selCula?.cula_breakdown.slice(0, 12) ?? [];
    const selLoc = selUdm?.localities.slice(0, 12) ?? [];
    const selLocTable = selUdm?.localities.slice(0, 20) ?? [];

    const selRace = report.race_by_dm?.find((r) => r.key === udmKey)?.items?.slice(0, 8) ?? [];
    const selGender = useMemo(() => {
        const g = report.gender_by_dm?.find((r) => r.key === udmKey)?.items;
        if (!g) return [];
        return g;
    }, [udmKey, report.gender_by_dm]);

    const dmChartRows = useMemo(() => [...report.by_dm].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 12), [report.by_dm]);

    const filteredLocs = useMemo(() => {
        const kw = search.trim().toLowerCase();
        if (!kw) return report.by_locality;
        return report.by_locality.filter((r) => r.name.toLowerCase().includes(kw));
    }, [report.by_locality, search]);

    const localityRows = filteredLocs.slice(0, 20);
    const locChartRows = localityRows.slice(0, 12);
    const culaRows = report.by_cula.slice(0, 12);
    const genderRows = report.gender.filter((r) => r.total > 0);
    const raceRows = report.race.slice(0, 8);

    const dmCols = [
        { key: 'name', label: 'UDM' },
        { key: 'total', label: 'Hadir', format: fmt },
    ];
    const locCols = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Hadir', format: fmt },
        { key: 'with_cula', label: 'Sudah Dicula', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'cula_breakdown', label: 'Status Culaan', format: (_, r) => renderCula(r.cula_breakdown) },
    ];
    const culaCols = [
        { key: 'bil', label: 'Bil.' },
        { key: 'display_label', label: 'Status' },
        { key: 'total', label: 'Jumlah', format: fmt },
    ];
    const dmLocCols = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Hadir', format: fmt },
        { key: 'with_cula', label: 'Sudah', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'cula_breakdown', label: 'Status', format: (_, r) => renderCula(r.cula_breakdown) },
    ];

    return (
        <AuthenticatedLayout header={
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="label-section">Laporan Program</p>
                    <h2 className="mt-0.5 heading-lg">{program.tajuk}</h2>
                    <p className="text-muted mt-0.5">{program.tarikh} • {program.tempat}{program.group_name && <> • {program.group_name}</>}</p>
                </div>
                <button onClick={() => window.history.back()} className="btn-ghost text-xs">
                    ← Kembali
                </button>
            </div>
        }>
            <Head title={`Laporan - ${program.tajuk}`} />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                {report.total === 0 ? (
                    <div className="card-dashed"><p className="text-xs font-bold text-slate-800">Tiada Kehadiran</p><p className="mt-1 text-xs text-slate-600">Belum ada rekod kehadiran untuk program ini.</p></div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Jumlah Hadir" value={report.total} detail="Keseluruhan" color="violet" />
                            <StatCard label="Jumlah UDM" value={report.total_dm} detail="Unik" color="slate" />
                            <StatCard label="Sudah Dicula" value={report.summary.with_cula} detail="Ada status culaan" color="emerald" />
                            <StatCard label="Belum Dicula" value={report.summary.belum_dicula} detail="Kod kosong/?" color="amber" />
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[2fr_1fr_1fr]">
                            <ChartPanel title="Graf Keseluruhan — Kehadiran mengikut UDM">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dmChartRows} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                        <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={56} tick={{ fontSize: 9, fill: '#475569' }} />
                                        <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                        <Tooltip content={<TTip />} />
                                        <Bar dataKey="total" name="Hadir" fill="#059669" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                            <ChartPanel title="Jantina">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={genderRows} dataKey="total" nameKey="label" innerRadius={52} outerRadius={84} paddingAngle={2} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                                            {genderRows.map((e, i) => <Cell key={e.key} fill={chartColors[i % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip content={<TTip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                            <ChartPanel title="Bangsa">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={raceRows} dataKey="total" nameKey="label" innerRadius={52} outerRadius={84} paddingAngle={2} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                                            {raceRows.map((e, i) => <Cell key={e.code} fill={chartColors[i % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip content={<TTip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                        </div>

                        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
                            <div className="flex gap-0.5">
                                {[{ k: 'udm', l: 'UDM' }, { k: 'locality', l: 'Lokaliti' }, { k: 'cula', l: 'Status Culaan' }].map((t) => (
                                    <button key={t.k} onClick={() => setTab(t.k)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${tab === t.k ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                                        {t.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'udm' && (
                            <section className="space-y-3">
                                <ChartPanel title={`Ringkasan ${selUdm?.name ?? '-'}`} compact
                                    action={
                                        <select value={selUdm?.key ?? ''} onChange={(e) => setUdmKey(e.target.value)} className="input-field w-auto py-1.5 text-xs">
                                            {report.dm_details.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                                        </select>
                                    }>
                                    <div className="grid gap-2 sm:grid-cols-4">
                                        <StatCard label="Jumlah Hadir" value={selUdm?.summary.total_voters ?? 0} detail="Dalam UDM ini" color="violet" />
                                        <StatCard label="Lokaliti" value={selUdm?.summary.total_localities ?? 0} detail="Unik" color="slate" />
                                        <StatCard label="Sudah Dicula" value={selUdm?.summary.with_cula ?? 0} detail="Ada status" color="emerald" />
                                        <StatCard label="Belum Dicula" value={selUdm?.summary.belum_dicula ?? 0} detail="Kosong/?" color="amber" />
                                    </div>
                                </ChartPanel>

                                <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                                    <ChartPanel title="Status Culaan Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selCulaChart} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                                <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <Tooltip content={<TTip />} />
                                                <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                    {selCulaChart.map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                    <ChartPanel title="Jantina Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={selGender} dataKey="t" nameKey="l" innerRadius={40} outerRadius={72} paddingAngle={2}>
                                                    {selGender.map((e, i) => <Cell key={e.k} fill={chartColors[i % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip content={<TTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </div>

                                <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                                    <ChartPanel title="Hadir Setiap Lokaliti">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selLoc} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1d5db" />
                                                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <Tooltip content={<TTip />} />
                                                <Bar dataKey="with_cula" name="Sudah" stackId="t" fill="#10b981" radius={[0, 0, 2, 2]} />
                                                <Bar dataKey="belum_dicula" name="Belum" stackId="t" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                    <ChartPanel title="Bangsa Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={selRace} dataKey="total" nameKey="label" innerRadius={40} outerRadius={72} paddingAngle={2}>
                                                    {selRace.map((e, i) => <Cell key={e.code} fill={chartColors[i % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip content={<TTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </div>

                                <DataTable rows={selLocTable} columns={dmLocCols} />
                                <DataTable rows={dmChartRows} columns={dmCols} />
                            </section>
                        )}

                        {tab === 'locality' && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari lokaliti..." className="input-field sm:max-w-xs" />
                                    <span className="text-xs font-semibold text-slate-500">{fmt(localityRows.length)}/{fmt(filteredLocs.length)}</span>
                                </div>
                                <ChartPanel title="Top Lokaliti">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={locChartRows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1d5db" />
                                            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Hadir" fill="#059669" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={localityRows} columns={[
                                    { key: 'name', label: 'Lokaliti' },
                                    { key: 'total', label: 'Hadir', format: fmt },
                                ]} />
                            </section>
                        )}

                        {tab === 'cula' && (
                            <section className="space-y-3">
                                <ChartPanel title="Taburan Status Culaan">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={culaRows} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                            <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={52} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                {culaRows.map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={report.by_cula.map((r, i) => ({ ...r, bil: i + 1 }))} columns={culaCols} />
                            </section>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
