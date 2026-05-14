import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');
const chartColors = ['#a78bfa', '#34d399', '#fbbf24', '#94a3b8', '#fb7185', '#c084fc'];
const udmCulaGroups = { umno: new Set(['1', '1A', '1B', '1P']), pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']) };

function fmt(v) { return nf.format(v ?? 0); }
function fmtP(v) { return `${fmt(v ?? 0)}%`; }

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
        <span key={`${item.code}-${i}`}>{item.display_label}: <strong className="text-white">{fmt(item.total)}</strong>{i < Math.min(b.length, 3) - 1 ? ', ' : ''}</span>
    ));
}

function StatCard({ label, value, detail, color = 'violet' }) {
    const colors = {
        violet: 'border-violet-600/40 bg-violet-600/10', emerald: 'border-emerald-600/40 bg-emerald-600/10',
        amber: 'border-amber-600/40 bg-amber-600/10', slate: 'border-slate-700 bg-slate-800',
    };
    return (
        <div className={`rounded-lg border px-3 py-2.5 shadow-sm ${colors[color]}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-white">{fmt(value)}</p>
            {detail && <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>}
        </div>
    );
}

function ChartPanel({ title, children, action, compact = false }) {
    return (
        <section className="card p-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="heading-md">{title}</h3>
                {action}
            </div>
            <div className={`mt-2 w-full ${compact ? '' : 'h-[16rem] lg:h-[18rem]'}`}>{children}</div>
        </section>
    );
}

function TTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs shadow-lg">
            <p className="font-bold text-white">{label}</p>
            {payload.map((item) => <p key={item.dataKey} className="mt-0.5 text-slate-400">{item.name}: {fmt(item.value)}</p>)}
        </div>
    );
}

function DataTable({ rows, columns }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700/60 text-xs">
                    <thead className="table-header">
                        <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2">{c.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 bg-slate-800/30 text-slate-300">
                        {rows.map((row, i) => (
                            <tr key={row.key ?? `${row.name}-${i}`} className="hover:bg-slate-700/20">
                                {columns.map((c) => <td key={c.key} className="px-3 py-2 align-top leading-5">{c.format ? c.format(row[c.key], row) : row[c.key]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function Laporan({ report }) {
    const [tab, setTab] = useState('udm');
    const [search, setSearch] = useState('');
    const [udmKey, setUdmKey] = useState(() => report.dm_details?.[0]?.key ?? '');

    const filteredLocs = useMemo(() => {
        const kw = search.trim().toLowerCase();
        if (!kw) return report.by_locality;
        return report.by_locality.filter((r) => r.name.toLowerCase().includes(kw) || r.dm.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw));
    }, [report.by_locality, search]);

    const dmChartRows = useMemo(() => [...report.by_dm].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 12), [report.by_dm]);
    const dmDetails = report.dm_details ?? [];
    const dmCulaRows = report.cula_by_dm ?? [];
    const udmTableRows = useMemo(() => [...report.by_dm].sort((a, b) => (b.coverage_percent ?? 0) - (a.coverage_percent ?? 0)).slice(0, 25), [report.by_dm]);
    const localityRows = filteredLocs.slice(0, 20);
    const culaRows = report.by_cula.slice(0, 12);
    const genderRows = report.gender.filter((r) => r.total > 0);
    const selUdm = dmDetails.find((r) => r.key === udmKey) ?? dmDetails[0] ?? null;
    const selCula = dmCulaRows.find((r) => r.key === udmKey) ?? dmCulaRows[0] ?? null;
    const selCulaChart = selCula?.cula_breakdown.slice(0, 12) ?? [];
    const selLoc = selUdm?.localities.slice(0, 12) ?? [];
    const selRace = selUdm?.race_breakdown.slice(0, 8) ?? [];
    const selLocTable = selUdm?.localities.slice(0, 20) ?? [];
    const selGender = useMemo(() => {
        if (!selUdm) return [];
        return [{ k: 'L', l: 'Lelaki', t: selUdm.summary.male ?? 0 }, { k: 'P', l: 'Perempuan', t: selUdm.summary.female ?? 0 }, { k: 'X', l: 'Lain', t: selUdm.summary.other_gender ?? 0 }].filter((r) => r.t > 0);
    }, [selUdm]);
    const locChartRows = localityRows.slice(0, 12);

    const dmCols = [
        { key: 'name', label: 'UDM' },
        { key: 'total', label: 'Pemilih', format: fmt },
        { key: 'with_cula', label: 'Sudah Dicula', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'coverage_percent', label: 'Siap', format: fmtP },
    ];
    const locCols = [
        { key: 'name', label: 'Lokaliti' }, { key: 'dm', label: 'UDM' },
        { key: 'total', label: 'Pemilih', format: fmt },
        { key: 'with_cula', label: 'Sudah', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'coverage_percent', label: 'Siap', format: fmtP },
        { key: 'cula_breakdown', label: 'Status Culaan', format: (_, r) => renderCula(r.cula_breakdown) },
    ];
    const culaCols = [
        { key: 'display_label', label: 'Status' },
        { key: 'total', label: 'Jumlah', format: fmt },
    ];
    const dmLocCols = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Pemilih', format: fmt },
        { key: 'with_cula', label: 'Sudah', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'coverage_percent', label: 'Siap', format: fmtP },
        { key: 'cula_breakdown', label: 'Status', format: (_, r) => renderCula(r.cula_breakdown) },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="label-section">Laporan</p>
                        <h2 className="mt-0.5 heading-lg">Analitik Pemilih</h2>
                        <p className="text-muted mt-0.5">Mengikut UDM, lokaliti dan status culaan.</p>
                    </div>
                    <span className="badge-slate shrink-0">{report.source.exists ? report.source.name : 'Belum ada fail'}</span>
                </div>
            }
        >
            <Head title="Laporan" />
            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                {!report.source.exists ? (
                    <div className="card-dashed"><p className="text-sm font-bold text-white">Tiada fail</p><p className="mt-1 text-xs text-slate-400">Muat naik fail pemilih di Settings untuk mula.</p></div>
                ) : (
                    <>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard label="Jumlah Pemilih" value={report.summary.total_voters} detail="Dalam fail semasa" color="violet" />
                            <StatCard label="Jumlah UDM" value={report.summary.total_dm} detail="Aktif" color="slate" />
                            <StatCard label="Sudah Dicula" value={report.summary.with_cula} detail="Ada status culaan" color="emerald" />
                            <StatCard label="Belum Dicula" value={report.summary.belum_dicula} detail="Kod kosong/?" color="amber" />
                            <StatCard label="Peratus Siap" value={report.summary.coverage_percent} detail={`${fmt(report.summary.total_localities)} lokaliti`} color="slate" />
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
                            <ChartPanel title="Top UDM">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dmChartRows} margin={{ top: 4, right: 8, bottom: 48, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis dataKey="name" interval={0} angle={-28} textAnchor="end" height={62} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <Tooltip content={<TTip />} />
                                        <Bar dataKey="male" name="Lelaki" stackId="t" fill="#a78bfa" radius={[0, 0, 2, 2]} />
                                        <Bar dataKey="female" name="Perempuan" stackId="t" fill="#fbbf24" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                            <ChartPanel title="Jantina">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={genderRows.map((r) => ({ ...r, label: r.label }))} dataKey="total" nameKey="label" innerRadius={44} outerRadius={76} paddingAngle={2}>
                                            {genderRows.map((e, i) => <Cell key={e.key} fill={chartColors[i % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip content={<TTip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                        </div>

                        <div className="card p-1.5">
                            <div className="flex flex-wrap gap-1">
                                {[{ k: 'udm', l: 'UDM' }, { k: 'locality', l: 'Lokaliti' }, { k: 'cula', l: 'Status Culaan' }].map((t) => (
                                    <button key={t.k} onClick={() => setTab(t.k)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${tab === t.k ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-slate-200'}`}>
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
                                            {dmDetails.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                                        </select>
                                    }>
                                    <div className="grid gap-2 sm:grid-cols-4">
                                        <StatCard label="Jumlah" value={selUdm?.summary.total_voters ?? 0} detail={`${fmt(selUdm?.summary.total_localities ?? 0)} lokaliti`} color="violet" />
                                        <StatCard label="Sudah" value={selUdm?.summary.with_cula ?? 0} detail="Dicula" color="emerald" />
                                        <StatCard label="Belum" value={selUdm?.summary.belum_dicula ?? 0} detail="Dicula" color="amber" />
                                        <StatCard label="Siap" value={selUdm?.summary.coverage_percent ?? 0} detail="Peratus" color="slate" />
                                    </div>
                                </ChartPanel>

                                <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                                    <ChartPanel title="Status Culaan Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selCulaChart} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                                <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                                <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#94a3b8' }} />
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
                                    <ChartPanel title="Pemilih Setiap Lokaliti">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selLoc} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: '#94a3b8' }} />
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
                                <DataTable rows={udmTableRows} columns={dmCols} />
                            </section>
                        )}

                        {tab === 'locality' && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari lokaliti, UDM..." className="input-field sm:max-w-xs" />
                                    <span className="text-xs text-slate-400">{fmt(localityRows.length)}/{fmt(filteredLocs.length)}</span>
                                </div>
                                <ChartPanel title="Top Lokaliti">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={locChartRows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="with_cula" name="Sudah" stackId="t" fill="#10b981" radius={[0, 0, 2, 2]} />
                                            <Bar dataKey="belum_dicula" name="Belum" stackId="t" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={localityRows} columns={locCols} />
                            </section>
                        )}

                        {tab === 'cula' && (
                            <section className="space-y-3">
                                <ChartPanel title="Taburan Status Culaan">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={culaRows} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                            <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={52} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                            <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                {culaRows.map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={report.by_cula} columns={culaCols} />
                            </section>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
