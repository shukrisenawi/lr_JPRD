import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useMemo, useState } from 'react';

const numberFormatter = new Intl.NumberFormat('ms-MY');
const chartColors = ['#0e7490', '#16a34a', '#f59e0b', '#475569', '#dc2626', '#7c3aed'];
const udmCulaColorGroups = {
    umno: new Set(['1', '1A', '1B', '1P']),
    pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']),
};
const panelPerformanceStyle = {
    contentVisibility: 'auto',
    containIntrinsicSize: '20rem',
};

function formatNumber(value) {
    return numberFormatter.format(value ?? 0);
}

function formatPercent(value) {
    return `${formatNumber(value ?? 0)}%`;
}

function getUdmCulaBarColor(entry, index) {
    const code = entry?.code;
    const displayLabel = entry?.display_label ?? '';

    if (code === '?' || displayLabel.includes('BELUM DICULA')) {
        return '#d1d5db';
    }

    if (udmCulaColorGroups.umno.has(code)) {
        return '#1d4ed8';
    }

    if (udmCulaColorGroups.pas.has(code)) {
        return '#16a34a';
    }

    if (code === '10') {
        return '#dc2626';
    }

    if (code === '5') {
        return '#38bdf8';
    }

    if (code === '9') {
        return '#f97316';
    }

    const fallbackColors = ['#7c3aed', '#f59e0b', '#475569', '#14b8a6', '#e11d48', '#84cc16'];

    return fallbackColors[index % fallbackColors.length];
}

function renderCulaSummary(culaBreakdown = []) {
    if (culaBreakdown.length === 0) {
        return '-';
    }

    return culaBreakdown.slice(0, 3).map((item, index) => (
        <span key={`${item.code}-${index}`}>
            <span>{item.display_label}: </span>
            <span className="font-semibold text-slate-900">{formatNumber(item.total)}</span>
            {index < Math.min(culaBreakdown.length, 3) - 1 ? ', ' : ''}
        </span>
    ));
}

function StatCard({ label, value, detail, tone = 'cyan' }) {
    const tones = {
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
        amber: 'border-amber-200 bg-amber-50 text-amber-950',
        slate: 'border-slate-200 bg-white text-slate-900',
    };

    return (
        <div className={`rounded-xl border px-4 py-3.5 shadow-sm ${tones[tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold leading-none">{formatNumber(value)}</p>
            {detail && <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm font-medium text-slate-500">
            {message}
        </div>
    );
}

function ChartPanel({ title, children, action, compact = false }) {
    return (
        <section
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-panel"
            style={panelPerformanceStyle}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-bold leading-6 text-slate-900">{title}</h3>
                {action}
            </div>
            <div className={`mt-3 w-full ${compact ? '' : 'h-[19rem] lg:h-[20rem]'}`}>{children}</div>
        </section>
    );
}

function SummaryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-lg">
            <p className="font-semibold text-slate-900">{label}</p>
            {payload.map((item) => (
                <p key={item.dataKey} className="mt-1 text-slate-600">
                    {item.name}: {formatNumber(item.value)}
                </p>
            ))}
        </div>
    );
}

function DataTable({ rows, columns }) {
    return (
        <div
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={panelPerformanceStyle}
        >
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-[13px]">
                    <thead className="bg-slate-900 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className="px-3 py-2.5">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {rows.map((row, index) => (
                            <tr key={row.key ?? `${row.name ?? row.code}-${index}`} className="hover:bg-cyan-50/60">
                                {columns.map((column) => (
                                    <td key={column.key} className="px-3 py-2.5 align-top">
                                        {column.format
                                            ? column.format(row[column.key], row)
                                            : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UploadPanel() {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('pemilih_file', file);

        router.post(route('laporan.upload'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center"
        >
            <input
                type="file"
                accept=".xls,.xlsx,.csv,.ods,.html"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
            />
            <button
                type="submit"
                disabled={!file || processing}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {processing ? 'Memuat naik...' : 'Muat Naik Fail'}
            </button>
        </form>
    );
}

export default function Laporan({ report }) {
    const [activeTab, setActiveTab] = useState('udm');
    const [search, setSearch] = useState('');
    const [selectedUdmKey, setSelectedUdmKey] = useState(() => report.dm_details?.[0]?.key ?? '');

    const tabs = [
        { key: 'udm', label: 'UDM' },
        { key: 'locality', label: 'Lokaliti' },
        { key: 'cula', label: 'Status Culaan' },
    ];

    const filteredLocalities = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return report.by_locality;
        }

            return report.by_locality.filter((row) => (
            row.name.toLowerCase().includes(keyword)
            || row.dm.toLowerCase().includes(keyword)
            || row.code.toLowerCase().includes(keyword)
        ));
    }, [report.by_locality, search]);

    const dmChartRows = useMemo(
        () => [...report.by_dm].sort((first, second) => (
            (second.total ?? 0) - (first.total ?? 0)
            || (first.name ?? '').localeCompare(second.name ?? '')
        )).slice(0, 12),
        [report.by_dm],
    );
    const dmCulaRows = report.cula_by_dm ?? [];
    const dmDetails = report.dm_details ?? [];
    const udmTableRows = useMemo(
        () => [...report.by_dm].sort((first, second) => (
            (second.coverage_percent ?? 0) - (first.coverage_percent ?? 0)
            || (second.with_cula ?? 0) - (first.with_cula ?? 0)
            || (first.name ?? '').localeCompare(second.name ?? '')
        )).slice(0, 25),
        [report.by_dm],
    );
    const localityRows = filteredLocalities.slice(0, 20);
    const culaRows = report.by_cula.slice(0, 12);
    const genderRows = report.gender.filter((row) => row.total > 0);
    const selectedUdmDetail = dmDetails.find((row) => row.key === selectedUdmKey) ?? dmDetails[0] ?? null;
    const selectedUdmCula = dmCulaRows.find((row) => row.key === selectedUdmKey) ?? dmCulaRows[0] ?? null;
    const selectedUdmCulaChartRows = selectedUdmCula?.cula_breakdown.slice(0, 12) ?? [];
    const selectedUdmLocalityRows = selectedUdmDetail?.localities.slice(0, 12) ?? [];
    const selectedUdmRaceRows = selectedUdmDetail?.race_breakdown.slice(0, 8) ?? [];
    const selectedUdmTopLocalityTableRows = selectedUdmDetail?.localities.slice(0, 20) ?? [];
    const selectedUdmGenderRows = useMemo(() => {
        if (!selectedUdmDetail) {
            return [];
        }

        return [
            { key: 'L', label: 'Lelaki', total: selectedUdmDetail.summary.male ?? 0 },
            { key: 'P', label: 'Perempuan', total: selectedUdmDetail.summary.female ?? 0 },
            { key: 'LAIN', label: 'Lain-lain', total: selectedUdmDetail.summary.other_gender ?? 0 },
        ].filter((row) => row.total > 0);
    }, [selectedUdmDetail]);
    const localityChartRows = localityRows.slice(0, 12);

    const dmColumns = [
        { key: 'name', label: 'UDM' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'with_cula', label: 'Sudah Dicula', format: formatNumber },
        { key: 'belum_dicula', label: 'Belum Dicula', format: formatNumber },
        { key: 'coverage_percent', label: 'Peratus Siap', format: formatPercent },
    ];

    const localityColumns = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'dm', label: 'UDM' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'with_cula', label: 'Sudah Dicula', format: formatNumber },
        { key: 'belum_dicula', label: 'Belum Dicula', format: formatNumber },
        { key: 'coverage_percent', label: 'Peratus Siap', format: formatPercent },
        {
            key: 'cula_breakdown',
            label: 'Ringkasan Status Culaan',
            format: (_, row) => renderCulaSummary(row.cula_breakdown),
        },
    ];

    const culaColumns = [
        { key: 'display_label', label: 'Status Culaan' },
        { key: 'total', label: 'Jumlah Pemilih', format: formatNumber },
    ];

    const dmLocalityColumns = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'with_cula', label: 'Sudah Dicula', format: formatNumber },
        { key: 'belum_dicula', label: 'Belum Dicula', format: formatNumber },
        { key: 'coverage_percent', label: 'Peratus Siap', format: formatPercent },
        {
            key: 'cula_breakdown',
            label: 'Status Culaan',
            format: (_, row) => renderCulaSummary(row.cula_breakdown),
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                            Laporan
                        </p>
                        <h2 className="mt-1.5 text-2xl font-bold leading-tight text-slate-900 lg:text-[2rem]">
                            Analitik pemilih mengikut UDM, lokaliti dan status culaan
                        </h2>
                        <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-500">
                            Paparan ini membaca fail pemilih terkini dan susun data besar kepada ringkasan yang mudah ditapis.
                        </p>
                    </div>
                    <div className="rounded-xl bg-white/90 px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm sm:text-sm">
                        Sumber: {report.source.exists ? report.source.name : 'Belum ada fail'}
                    </div>
                </div>
            }
        >
            <Head title="Laporan" />

            <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                <UploadPanel />

                {!report.source.exists ? (
                    <EmptyState message="Fail contoh tidak ditemui. Upload fail pemilih untuk mula jana laporan." />
                ) : (
                    <>
                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard
                                label="Jumlah pemilih"
                                value={report.summary.total_voters}
                                detail="Jumlah pemilih dalam fail semasa"
                                tone="cyan"
                            />
                            <StatCard
                                label="Jumlah UDM"
                                value={report.summary.total_dm}
                                detail="UDM aktif dalam laporan"
                                tone="slate"
                            />
                            <StatCard
                                label="Sudah dicula"
                                value={report.summary.with_cula}
                                detail="Pemilih dengan status culaan"
                                tone="emerald"
                            />
                            <StatCard
                                label="Belum dicula"
                                value={report.summary.belum_dicula}
                                detail="Kod kosong atau ?"
                                tone="amber"
                            />
                            <StatCard
                                label="Peratus siap culaan"
                                value={report.summary.coverage_percent}
                                detail={`${formatNumber(report.summary.total_localities)} lokaliti`}
                                tone="slate"
                            />
                        </section>

                        <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                            <ChartPanel title="Top UDM mengikut jumlah pemilih">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dmChartRows} margin={{ top: 6, right: 12, bottom: 58, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            interval={0}
                                            angle={-28}
                                            textAnchor="end"
                                            height={72}
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis tickFormatter={formatNumber} width={56} tick={{ fontSize: 10 }} />
                                        <Tooltip content={<SummaryTooltip />} />
                                        <Legend />
                                        <Bar dataKey="male" name="Lelaki" stackId="total" fill="#0e7490" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="female" name="Perempuan" stackId="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartPanel>

                            <ChartPanel title="Pecahan jantina">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={genderRows}
                                            dataKey="total"
                                            nameKey="label"
                                            innerRadius={54}
                                            outerRadius={92}
                                            paddingAngle={2}
                                        >
                                            {genderRows.map((entry, index) => (
                                                <Cell
                                                    key={entry.key}
                                                    fill={chartColors[index % chartColors.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<SummaryTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-panel">
                            <div className="flex flex-wrap gap-1.5">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                            activeTab === tab.key
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-white text-slate-600 hover:bg-cyan-50 hover:text-cyan-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {activeTab === 'udm' && (
                            <section className="space-y-3">
                                <ChartPanel
                                    title={`Ringkasan UDM ${selectedUdmDetail?.name ?? '-'}`}
                                    compact
                                    action={
                                        <select
                                            value={selectedUdmDetail?.key ?? ''}
                                            onChange={(event) => setSelectedUdmKey(event.target.value)}
                                            className="rounded-lg border-slate-200 py-2 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                        >
                                            {dmDetails.map((row) => (
                                                <option key={row.key} value={row.key}>
                                                    {row.name}
                                                </option>
                                            ))}
                                        </select>
                                    }
                                >
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            label="Jumlah pemilih UDM"
                                            value={selectedUdmDetail?.summary.total_voters ?? 0}
                                            detail={`${formatNumber(selectedUdmDetail?.summary.total_localities ?? 0)} lokaliti`}
                                            tone="cyan"
                                        />
                                        <StatCard
                                            label="Sudah dicula"
                                            value={selectedUdmDetail?.summary.with_cula ?? 0}
                                            detail="Dalam UDM dipilih"
                                            tone="emerald"
                                        />
                                        <StatCard
                                            label="Belum dicula"
                                            value={selectedUdmDetail?.summary.belum_dicula ?? 0}
                                            detail="Dalam UDM dipilih"
                                            tone="amber"
                                        />
                                        <StatCard
                                            label="Peratus siap culaan"
                                            value={selectedUdmDetail?.summary.coverage_percent ?? 0}
                                            detail="Liputan status culaan"
                                            tone="slate"
                                        />
                                    </div>
                                </ChartPanel>

                                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
                                    <ChartPanel title="Pecahan status culaan dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selectedUdmCulaChartRows} margin={{ top: 6, right: 12, bottom: 66, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="display_label"
                                                    interval={0}
                                                    angle={-25}
                                                    textAnchor="end"
                                                    height={76}
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <YAxis tickFormatter={formatNumber} width={56} tick={{ fontSize: 10 }} />
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Bar dataKey="total" name="Jumlah" radius={[4, 4, 0, 0]}>
                                                    {selectedUdmCulaChartRows.map((entry, index) => (
                                                        <Cell key={`${entry.code}-${index}`} fill={getUdmCulaBarColor(entry, index)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>

                                    <ChartPanel title="Pecahan jantina dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={selectedUdmGenderRows}
                                                    dataKey="total"
                                                    nameKey="label"
                                                    innerRadius={50}
                                                    outerRadius={88}
                                                    paddingAngle={2}
                                                >
                                                    {selectedUdmGenderRows.map((entry, index) => (
                                                        <Cell key={entry.key} fill={chartColors[index % chartColors.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </section>

                                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
                                    <ChartPanel title="Jumlah pemilih setiap lokaliti dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selectedUdmLocalityRows} layout="vertical" margin={{ top: 6, right: 12, bottom: 6, left: 110 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tickFormatter={formatNumber} />
                                                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Legend />
                                                <Bar dataKey="with_cula" name="Sudah Dicula" stackId="total" fill="#16a34a" radius={[0, 0, 4, 4]} />
                                                <Bar dataKey="belum_dicula" name="Belum Dicula" stackId="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>

                                    <ChartPanel title="Pecahan bangsa dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={selectedUdmRaceRows}
                                                    dataKey="total"
                                                    nameKey="label"
                                                    innerRadius={50}
                                                    outerRadius={88}
                                                    paddingAngle={2}
                                                >
                                                    {selectedUdmRaceRows.map((entry, index) => (
                                                        <Cell key={entry.code} fill={chartColors[index % chartColors.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </section>

                                <ChartPanel title="Jadual lokaliti dalam UDM" compact>
                                    <div className="overflow-auto">
                                        <DataTable rows={selectedUdmTopLocalityTableRows} columns={dmLocalityColumns} />
                                    </div>
                                </ChartPanel>

                                <DataTable rows={udmTableRows} columns={dmColumns} />
                            </section>
                        )}

                        {activeTab === 'locality' && (
                            <section className="space-y-3">
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Cari lokaliti, UDM atau kod..."
                                        className="w-full rounded-lg border-slate-200 py-2 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:max-w-md"
                                    />
                                    <p className="text-sm text-slate-500">
                                        Papar {formatNumber(localityRows.length)} daripada {formatNumber(filteredLocalities.length)} lokaliti
                                    </p>
                                </div>

                                <ChartPanel title="Top lokaliti mengikut status culaan">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={localityChartRows} layout="vertical" margin={{ top: 6, right: 12, bottom: 6, left: 100 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={formatNumber} />
                                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Legend />
                                            <Bar dataKey="with_cula" name="Sudah Dicula" stackId="total" fill="#16a34a" radius={[0, 0, 4, 4]} />
                                            <Bar dataKey="belum_dicula" name="Belum Dicula" stackId="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>

                                <DataTable rows={localityRows} columns={localityColumns} />
                            </section>
                        )}

                        {activeTab === 'cula' && (
                            <section className="space-y-3">
                                <ChartPanel title="Taburan status culaan">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={culaRows} margin={{ top: 6, right: 12, bottom: 54, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="display_label"
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                                height={62}
                                                tick={{ fontSize: 10 }}
                                            />
                                            <YAxis tickFormatter={formatNumber} width={56} tick={{ fontSize: 10 }} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[4, 4, 0, 0]}>
                                                {culaRows.map((entry, index) => (
                                                    <Cell key={`${entry.code}-${index}`} fill={getUdmCulaBarColor(entry, index)} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>

                                <DataTable rows={report.by_cula} columns={culaColumns} />
                            </section>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
