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

function formatNumber(value) {
    return numberFormatter.format(value ?? 0);
}

function StatCard({ label, value, detail, tone = 'cyan' }) {
    const tones = {
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
        amber: 'border-amber-200 bg-amber-50 text-amber-950',
        slate: 'border-slate-200 bg-white text-slate-900',
    };

    return (
        <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold">{formatNumber(value)}</p>
            {detail && <p className="mt-2 text-sm text-slate-500">{detail}</p>}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm font-medium text-slate-500">
            {message}
        </div>
    );
}

function ChartPanel({ title, children, action }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                {action}
            </div>
            <div className="mt-5 h-[24rem] w-full">{children}</div>
        </section>
    );
}

function SummaryTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className="px-4 py-3">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {rows.map((row, index) => (
                            <tr key={`${row.name ?? row.code}-${index}`} className="hover:bg-cyan-50/60">
                                {columns.map((column) => (
                                    <td key={column.key} className="px-4 py-3">
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

function SearchModal({ voter, onClose }) {
    if (!voter) {
        return null;
    }

    const fields = [
        ['Nama', voter.name],
        ['No. IC Baru', voter.no_kp || '-'],
        ['No. IC Lama', voter.old_ic || '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'],
        ['Tel. Rumah', voter.phone_home || '-'],
        ['DM', voter.dm],
        ['Lokaliti', voter.locality],
        ['Jantina', voter.gender],
        ['Bangsa', voter.race],
        ['Kod Cula', voter.cula_code],
        ['Alamat', voter.address],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Detail Pemilih</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">{voter.name}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                        Tutup
                    </button>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                    {fields.map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                            <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SearchPanel() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoter, setSelectedVoter] = useState(null);

    const handleChange = async (event) => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);

        if (nextQuery.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        setSearching(true);

        try {
            const response = await fetch(`${route('laporan.search')}?q=${encodeURIComponent(nextQuery)}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch {
            setSuggestions([]);
        } finally {
            setSearching(false);
        }
    };

    return (
        <>
            <section className="relative rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Carian Pemilih</p>
                        <p className="mt-1 text-sm text-slate-500">Cari mengikut nama, nombor IC, atau nombor telefon.</p>
                    </div>
                    <input
                        type="search"
                        value={query}
                        onChange={handleChange}
                        placeholder="Contoh: Ali, 900101025555, 0123456789"
                        className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-4 right-4 top-[8.6rem] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        {searching ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => (
                                <button
                                    key={voter.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVoter(voter);
                                        setSuggestions([]);
                                    }}
                                    className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-cyan-50 last:border-b-0"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{voter.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            IC: {voter.no_kp || '-'} | HP: {voter.phone_mobile || '-'}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                        <p>{voter.dm}</p>
                                        <p className="mt-1">{voter.locality}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </section>

            <SearchModal
                voter={selectedVoter}
                onClose={() => setSelectedVoter(null)}
            />
        </>
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
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center"
        >
            <input
                type="file"
                accept=".xls,.xlsx,.csv,.ods,.html"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
            />
            <button
                type="submit"
                disabled={!file || processing}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {processing ? 'Memuat naik...' : 'Upload fail'}
            </button>
        </form>
    );
}

export default function Laporan({ report }) {
    const [activeTab, setActiveTab] = useState('dm');
    const [search, setSearch] = useState('');
    const [selectedDmName, setSelectedDmName] = useState(() => report.dm_details?.[0]?.name ?? '');

    const tabs = [
        { key: 'dm', label: 'DM' },
        { key: 'locality', label: 'Lokaliti' },
        { key: 'cula', label: 'Kod Cula' },
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

    const dmChartRows = report.by_dm.slice(0, 12);
    const dmCulaRows = report.cula_by_dm ?? [];
    const dmDetails = report.dm_details ?? [];
    const localityRows = filteredLocalities.slice(0, 20);
    const culaRows = report.by_cula.slice(0, 12);
    const genderRows = report.gender.filter((row) => row.total > 0);
    const selectedDmDetail = dmDetails.find((row) => row.name === selectedDmName) ?? dmDetails[0] ?? null;
    const selectedDmCula = dmCulaRows.find((row) => row.name === selectedDmName) ?? dmCulaRows[0] ?? null;
    const selectedDmCulaChartRows = selectedDmCula?.cula_breakdown.slice(0, 12) ?? [];
    const selectedDmLocalityRows = selectedDmDetail?.localities.slice(0, 12) ?? [];
    const selectedDmRaceRows = selectedDmDetail?.race_breakdown.slice(0, 8) ?? [];
    const selectedDmTopLocalityTableRows = selectedDmDetail?.localities.slice(0, 20) ?? [];
    const selectedDmLocalityCulaRows = useMemo(() => {
        if (!selectedDmDetail) {
            return [];
        }

        const topCulaCodes = [];

        selectedDmDetail.localities.forEach((locality) => {
            locality.cula_breakdown.forEach((cula) => {
                if (!topCulaCodes.includes(cula.code) && topCulaCodes.length < 5) {
                    topCulaCodes.push(cula.code);
                }
            });
        });

        return selectedDmDetail.localities.slice(0, 10).map((locality) => {
            const row = {
                name: locality.name,
                total: locality.total,
            };

            topCulaCodes.forEach((code) => {
                const culaRow = locality.cula_breakdown.find((item) => item.code === code);
                row[`cula_${code}`] = culaRow?.total ?? 0;
            });

            return row;
        });
    }, [selectedDmDetail]);
    const selectedDmTopCulaKeys = useMemo(() => {
        if (!selectedDmDetail) {
            return [];
        }

        const unique = [];

        selectedDmDetail.localities.forEach((locality) => {
            locality.cula_breakdown.forEach((cula) => {
                if (!unique.some((item) => item.code === cula.code) && unique.length < 5) {
                    unique.push({
                        code: cula.code,
                        label: cula.label,
                    });
                }
            });
        });

        return unique;
    }, [selectedDmDetail]);

    const dmColumns = [
        { key: 'name', label: 'DM' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'male', label: 'Lelaki', format: formatNumber },
        { key: 'female', label: 'Perempuan', format: formatNumber },
        { key: 'with_cula', label: 'Ada Kod Cula', format: formatNumber },
    ];

    const localityColumns = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'dm', label: 'DM' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'male', label: 'Lelaki', format: formatNumber },
        { key: 'female', label: 'Perempuan', format: formatNumber },
    ];

    const culaColumns = [
        { key: 'label', label: 'Kod Cula' },
        { key: 'total', label: 'Jumlah Pemilih', format: formatNumber },
    ];

    const dmLocalityColumns = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Pemilih', format: formatNumber },
        { key: 'male', label: 'Lelaki', format: formatNumber },
        { key: 'female', label: 'Perempuan', format: formatNumber },
        {
            key: 'cula_breakdown',
            label: 'Kod Cula',
            format: (_, row) => row.cula_breakdown.slice(0, 3).map((item) => `${item.code}: ${formatNumber(item.total)}`).join(', ') || 'Tiada',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Laporan
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            Analitik pemilih mengikut DM, lokaliti dan cula
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Paparan ini membaca fail pemilih terkini dan susun data besar kepada ringkasan yang mudah ditapis.
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
                        Sumber: {report.source.exists ? report.source.name : 'Belum ada fail'}
                    </div>
                </div>
            }
        >
            <Head title="Laporan" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                <UploadPanel />
                <SearchPanel />

                {!report.source.exists ? (
                    <EmptyState message="Fail contoh tidak ditemui. Upload fail pemilih untuk mula jana laporan." />
                ) : (
                    <>
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Jumlah pemilih"
                                value={report.summary.total_voters}
                                detail={`${formatNumber(report.summary.total_dm)} DM aktif`}
                                tone="cyan"
                            />
                            <StatCard
                                label="Jumlah lokaliti"
                                value={report.summary.total_localities}
                                detail="Mengikut kolum Nama Lokaliti"
                                tone="slate"
                            />
                            <StatCard
                                label="Lelaki"
                                value={report.summary.male}
                                detail="Kod jantina L"
                                tone="emerald"
                            />
                            <StatCard
                                label="Perempuan"
                                value={report.summary.female}
                                detail="Kod jantina P"
                                tone="amber"
                            />
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
                            <ChartPanel title="Top DM mengikut jumlah pemilih">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dmChartRows} margin={{ top: 10, right: 20, bottom: 70, left: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            interval={0}
                                            angle={-35}
                                            textAnchor="end"
                                            height={90}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis tickFormatter={formatNumber} width={70} />
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
                                            innerRadius={70}
                                            outerRadius={120}
                                            paddingAngle={3}
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

                        <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-panel backdrop-blur">
                            <div className="flex flex-wrap gap-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
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

                        {activeTab === 'dm' && (
                            <section className="space-y-4">
                                <ChartPanel
                                    title={`Ringkasan DM ${selectedDmDetail?.name ?? '-'}`}
                                    action={
                                        <select
                                            value={selectedDmDetail?.name ?? ''}
                                            onChange={(event) => setSelectedDmName(event.target.value)}
                                            className="rounded-xl border-slate-200 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                        >
                                            {dmDetails.map((row) => (
                                                <option key={row.name} value={row.name}>
                                                    {row.name}
                                                </option>
                                            ))}
                                        </select>
                                    }
                                >
                                    <div className="grid h-full gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            label="Jumlah pemilih DM"
                                            value={selectedDmDetail?.summary.total_voters ?? 0}
                                            detail={`${formatNumber(selectedDmDetail?.summary.total_localities ?? 0)} lokaliti`}
                                            tone="cyan"
                                        />
                                        <StatCard
                                            label="Lelaki"
                                            value={selectedDmDetail?.summary.male ?? 0}
                                            detail="Dalam DM dipilih"
                                            tone="emerald"
                                        />
                                        <StatCard
                                            label="Perempuan"
                                            value={selectedDmDetail?.summary.female ?? 0}
                                            detail="Dalam DM dipilih"
                                            tone="amber"
                                        />
                                        <StatCard
                                            label="Ada kod cula"
                                            value={selectedDmDetail?.summary.with_cula ?? 0}
                                            detail="Pemilih berkod"
                                            tone="slate"
                                        />
                                    </div>
                                </ChartPanel>

                                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
                                    <ChartPanel title="Jumlah pemilih setiap lokaliti dalam DM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selectedDmLocalityRows} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 140 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tickFormatter={formatNumber} />
                                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Legend />
                                                <Bar dataKey="male" name="Lelaki" stackId="total" fill="#0e7490" radius={[0, 0, 4, 4]} />
                                                <Bar dataKey="female" name="Perempuan" stackId="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>

                                    <ChartPanel title="Bangsa dalam DM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={selectedDmRaceRows}
                                                    dataKey="total"
                                                    nameKey="label"
                                                    innerRadius={60}
                                                    outerRadius={110}
                                                    paddingAngle={3}
                                                >
                                                    {selectedDmRaceRows.map((entry, index) => (
                                                        <Cell key={entry.code} fill={chartColors[index % chartColors.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<SummaryTooltip />} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </section>

                                <ChartPanel title={`Kod cula setiap lokaliti bagi DM ${selectedDmDetail?.name ?? '-'}`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={selectedDmLocalityCulaRows} margin={{ top: 10, right: 20, bottom: 60, left: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                                height={70}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis tickFormatter={formatNumber} width={70} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Legend />
                                            {selectedDmTopCulaKeys.map((item, index) => (
                                                <Bar
                                                    key={item.code}
                                                    dataKey={`cula_${item.code}`}
                                                    name={item.label}
                                                    stackId="total"
                                                    fill={chartColors[index % chartColors.length]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>

                                <ChartPanel title="Detail lokaliti dalam DM">
                                    <div className="h-full overflow-auto">
                                        <DataTable rows={selectedDmTopLocalityTableRows} columns={dmLocalityColumns} />
                                    </div>
                                </ChartPanel>

                                <ChartPanel title={`Kod cula keseluruhan untuk DM ${selectedDmCula?.name ?? '-'}`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={selectedDmCulaChartRows} margin={{ top: 10, right: 20, bottom: 60, left: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                                height={70}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis tickFormatter={formatNumber} width={70} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Bar dataKey="total" name="Jumlah" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>

                                <DataTable rows={report.by_dm.slice(0, 25)} columns={dmColumns} />
                            </section>
                        )}

                        {activeTab === 'locality' && (
                            <section className="space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Cari lokaliti, DM atau kod..."
                                        className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:max-w-md"
                                    />
                                    <p className="text-sm text-slate-500">
                                        Papar {formatNumber(localityRows.length)} daripada {formatNumber(filteredLocalities.length)} lokaliti
                                    </p>
                                </div>

                                <ChartPanel title="Top lokaliti mengikut jumlah pemilih">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={localityRows.slice(0, 12)} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 120 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={formatNumber} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Legend />
                                            <Bar dataKey="total" name="Jumlah" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>

                                <DataTable rows={localityRows} columns={localityColumns} />
                            </section>
                        )}

                        {activeTab === 'cula' && (
                            <section className="space-y-4">
                                <ChartPanel title="Taburan kod cula">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={culaRows} margin={{ top: 10, right: 20, bottom: 60, left: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                interval={0}
                                                angle={-25}
                                                textAnchor="end"
                                                height={70}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis tickFormatter={formatNumber} width={70} />
                                            <Tooltip content={<SummaryTooltip />} />
                                            <Bar dataKey="total" name="Jumlah" fill="#7c3aed" radius={[4, 4, 0, 0]} />
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
