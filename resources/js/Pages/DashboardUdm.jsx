import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const number = new Intl.NumberFormat('ms-MY');
const money = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' });
const fmt = (value) => number.format(value ?? 0);

function Section({ title, description, children, table = false }) {
    return <section className={`min-w-0 rounded-xl border bg-white ${table ? 'border-slate-200 shadow-sm' : 'border-green-200'}`}>
        <div className={`border-b px-5 py-4 ${table ? 'border-slate-100' : 'border-green-100'}`}>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {description && <p className="mt-1 text-xs text-slate-600">{description}</p>}
        </div>
        {children}
    </section>;
}

function LocalityChart({ rows, dataKey, label, color }) {
    if (!rows.length) return <p className="p-6 text-sm text-slate-500">Tiada data pemilih untuk UDM ini.</p>;
    return <div className="overflow-x-auto p-4">
        <div style={{ height: Math.max(280, rows.length * 44 + 50), minWidth: 320 }} aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" accessibilityLayer margin={{ top: 8, right: 50, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="locality" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [fmt(value), label]} />
                    <Bar dataKey={dataKey} name={label} fill={color} barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList dataKey={dataKey} position="right" formatter={fmt} fontSize={11} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>;
}

export default function DashboardUdm({ udm, statistics, payments }) {
    const { rows, totals, codes } = statistics;
    const breakdownRef = useRef(null);
    const [codesPerTable, setCodesPerTable] = useState(2);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            setCodesPerTable(Math.max(1, Math.floor((entry.contentRect.width - 160) / 48)));
        });
        if (breakdownRef.current) observer.observe(breakdownRef.current);
        return () => observer.disconnect();
    }, []);
    const codeBlocks = codes.length ? Array.from({ length: Math.ceil(codes.length / codesPerTable) }, (_, index) => codes.slice(index * codesPerTable, (index + 1) * codesPerTable)) : [[]];
    const breakdownCell = 'border-b border-slate-100 px-1 py-3 text-right tabular-nums break-all';
    const breakdownLocalityCell = 'border-b border-slate-100 px-2 py-3 text-left font-medium break-words';
    const breakdownHeader = 'border-b border-slate-200 bg-slate-100 px-1 py-3 text-center font-semibold text-slate-600';
    const pnTotal = ['2', '3B', '3D', '3K', '3M', '3P', '3U', '1B', '1P', '4P', '6', '11', '12', '17', '18']
        .reduce((sum, code) => sum + (totals.breakdown[code] ?? 0), 0);
    const activeTotal = Math.max(totals.total - (totals.breakdown['8'] ?? 0), 0);
    const skc = pnTotal - Math.round(Math.round(activeTotal * 0.85) * 0.51);
    const skcTheme = skc < 0 ? 'border-red-200 bg-red-50 text-red-800' : skc > 0 ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-700';
    const metrics = [
        ['Jumlah Pemilih', fmt(totals.total)],
        ['Sudah Dicula', fmt(totals.with_cula)],
        ['Belum Dicula', fmt(totals.without_cula)],
        ['Kemajuan Culaan', `${totals.percentage}%`],
        ['Ahli PAS', fmt(totals.members)],
        ['SKC', fmt(skc), skcTheme, 'Sasaran Kena Cari'],
    ];
    const cell = 'border-b border-slate-100 whitespace-nowrap px-4 py-3 text-right tabular-nums';
    const localityCell = 'sticky left-0 z-10 min-w-44 border-b border-slate-100 bg-inherit px-4 py-3 text-left font-medium';
    const headerCell = 'border-b border-slate-200 bg-slate-100 px-4 py-3 text-right font-semibold text-slate-600';
    const rowClass = 'odd:bg-white even:bg-slate-50/60 text-slate-700 transition-colors hover:!bg-emerald-50/60';
    const progressRow = (row, label) => <>
        <th scope="row" className={localityCell}>{label}</th>
        <td className={`${cell} font-bold`}>{fmt(row.total)}</td>
        <td className={cell}><span className="inline-flex min-w-10 justify-center rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">{fmt(row.with_cula)}</span></td>
        <td className={cell}><span className={`inline-flex min-w-10 justify-center rounded-md px-2 py-1 font-semibold ${row.without_cula ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}>{fmt(row.without_cula)}</span></td>
        <td className={cell}>
            <div className="ml-auto flex min-w-32 items-center justify-end gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${row.percentage}%` }} /></div>
                <span className="w-12 font-medium text-slate-700">{row.percentage}%</span>
            </div>
        </td>
        <td className={cell}>{fmt(row.members)}</td>
    </>;
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>}>
            <Head title="Dashboard" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div>
                    <h1 className="text-2xl font-bold text-green-800">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-600">UDM: {udm || 'Belum ditetapkan'} · Pemilih aktif, tidak termasuk rekod manual.</p>
                </div>
                {!udm && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila tetapkan UDM pengguna dalam pengurusan akses untuk melihat statistik.</p>}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    {metrics.map(([label, value, theme, description]) => <div key={label} className={`rounded-xl border p-4 ${theme ?? 'border-green-200 bg-white'}`}>
                        <p className={`text-xs font-medium ${theme ? '' : 'text-slate-600'}`}>{label}</p>
                        <p className={`mt-2 text-2xl font-bold tabular-nums ${theme ? '' : 'text-green-800'}`}>{value}</p>
                        {description && <p className="mt-1 text-xs">{description}</p>}
                    </div>)}
                </div>
                <Section title="Jumlah Bayaran Peralatan Pilihanraya PRU16" description="Jumlah dana masuk dalam kategori bayaran peralatan pilihanraya untuk UDM ini sahaja.">
                    <div className="px-5 py-5">
                        <p className="text-3xl font-bold tabular-nums text-green-800">{money.format(Number(payments.total_bayaran))}</p>
                        <p className="mt-2 text-sm text-slate-600">{fmt(payments.count)} rekod bayaran</p>
                    </div>
                </Section>
                <Section table title="Cula Mengikut Lokaliti" description="Kemajuan berdasarkan kod cula yang telah direkodkan.">
                    <div className="overflow-x-auto rounded-b-xl">
                        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
                            <thead><tr>
                                {['Lokaliti', 'Pemilih', 'Sudah Dicula', 'Belum Dicula', 'Kemajuan', 'Ahli PAS'].map((label, i) => <th key={label} scope="col" className={`${headerCell} ${i === 0 ? 'sticky left-0 z-20 text-left' : ''}`}>{label}</th>)}
                            </tr></thead>
                            <tbody>
                                {rows.map((row) => <tr key={row.locality} className={rowClass}>{progressRow(row, row.locality)}</tr>)}
                                {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tiada data pemilih untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="font-bold text-emerald-900"><tr className="bg-emerald-50/70">{progressRow(totals, 'Jumlah')}</tr></tfoot>
                        </table>
                    </div>
                </Section>
                <Section table title="Pecahan Cula Mengikut Lokaliti" description="Bilangan pemilih bagi setiap kod cula. Kod kosong, ?, TIADA dan 0 dikira belum dicula.">
                    <div ref={breakdownRef} className="space-y-4 rounded-b-xl p-2 sm:p-3">
                        {codeBlocks.map((block, blockIndex) => <div key={blockIndex}>
                        {codeBlocks.length > 1 && <p className="mb-1.5 text-xs font-medium text-slate-600">Kod {block.map(({ code }) => code).join(', ')} <span className="font-normal">· Jumlah ialah semua kod bagi lokaliti.</span></p>}
                        <table className="w-full table-fixed border-separate border-spacing-0 text-[10px] sm:text-xs">
                            <colgroup><col style={{ width: 100 }} />{block.map(({ code }) => <col key={code} />)}<col style={{ width: 60 }} /></colgroup>
                            <thead><tr>
                                <th scope="col" className={`${breakdownHeader} text-left px-2`}>Lokaliti</th>
                                {block.map(({ code, label }) => <th key={code} scope="col" className={breakdownHeader}><span title={label} aria-label={`${code} - ${label}`} tabIndex={0} className="inline-flex cursor-help justify-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700">{code}</span></th>)}
                                <th scope="col" className={breakdownHeader}>Jumlah</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((row) => <tr key={row.locality} className={rowClass}>
                                    <th scope="row" className={breakdownLocalityCell}>{row.locality}</th>
                                    {block.map(({ code }) => <td key={code} className={`${breakdownCell} ${row.breakdown[code] ? 'font-semibold' : 'text-slate-400'}`}>{fmt(row.breakdown[code])}</td>)}
                                    <td className={`${breakdownCell} font-bold text-slate-900`}>{fmt(row.total)}</td>
                                </tr>)}
                                {!rows.length && <tr><td colSpan={block.length + 2} className="p-6 text-center text-slate-500">Tiada data culaan untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="font-bold text-emerald-900"><tr className="bg-emerald-50/70">
                                <th scope="row" className={breakdownLocalityCell}>Jumlah</th>
                                {block.map(({ code }) => <td key={code} className={breakdownCell}>{fmt(totals.breakdown[code])}</td>)}
                                <td className={breakdownCell}>{fmt(totals.total)}</td>
                            </tr></tfoot>
                        </table>
                        </div>)}
                    </div>
                </Section>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Section title="Graf Pemilih Mengikut Lokaliti">
                        <LocalityChart rows={rows} dataKey="total" label="Pemilih" color="#15803d" />
                    </Section>
                    <Section title="Graf Keahlian PAS Mengikut Lokaliti" description="Pemilih yang mempunyai nombor ahli PAS (bukan kosong atau tanda -).">
                        <LocalityChart rows={rows} dataKey="members" label="Ahli PAS" color="#4d7c0f" />
                    </Section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
