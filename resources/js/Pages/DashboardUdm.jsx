import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const number = new Intl.NumberFormat('ms-MY');
const money = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' });
const fmt = (value) => number.format(value ?? 0);

function Section({ title, description, children }) {
    return <section className="min-w-0 rounded-xl border border-green-200 bg-white">
        <div className="border-b border-green-100 px-5 py-4">
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
    const metrics = [
        ['Jumlah Pemilih', fmt(totals.total)],
        ['Sudah Dicula', fmt(totals.with_cula)],
        ['Belum Dicula', fmt(totals.without_cula)],
        ['Kemajuan Culaan', `${totals.percentage}%`],
        ['Ahli PAS', fmt(totals.members)],
    ];
    const cell = 'border-b border-r border-slate-200 whitespace-nowrap px-3 py-2.5 text-right tabular-nums';
    const localityCell = 'sticky left-0 z-10 min-w-44 border-b border-r border-slate-200 bg-inherit px-3 py-2.5 text-left font-semibold';
    const headerCell = 'border-b border-r border-lime-600 bg-lime-300 px-3 py-3 text-center font-bold text-slate-900';
    const rowClass = 'odd:bg-white even:bg-slate-50 text-slate-700 transition-colors hover:!bg-lime-100';
    const progressRow = (row, label) => <>
        <th scope="row" className={localityCell}>{label}</th>
        <td className={`${cell} font-bold`}>{fmt(row.total)}</td>
        <td className={cell}><span className="inline-flex min-w-10 justify-center rounded-md bg-green-100 px-2 py-1 font-semibold text-green-800">{fmt(row.with_cula)}</span></td>
        <td className={cell}><span className={`inline-flex min-w-10 justify-center rounded-md px-2 py-1 font-semibold ${row.without_cula ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}>{fmt(row.without_cula)}</span></td>
        <td className={cell}>
            <div className="ml-auto flex min-w-32 items-center justify-end gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-green-600" style={{ width: `${row.percentage}%` }} /></div>
                <span className="w-12 font-semibold text-green-800">{row.percentage}%</span>
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
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-green-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-600">{label}</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-green-800">{value}</p>
                    </div>)}
                </div>
                <Section title="Jumlah Bayaran Peralatan Pilihanraya PRU16" description="Jumlah dana masuk dalam kategori bayaran peralatan pilihanraya untuk UDM ini sahaja.">
                    <div className="px-5 py-5">
                        <p className="text-3xl font-bold tabular-nums text-green-800">{money.format(Number(payments.total_bayaran))}</p>
                        <p className="mt-2 text-sm text-slate-600">{fmt(payments.count)} rekod bayaran</p>
                    </div>
                </Section>
                <Section title="Cula Mengikut Lokaliti" description="Kemajuan berdasarkan kod cula yang telah direkodkan.">
                    <div className="overflow-x-auto rounded-b-xl">
                        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
                            <thead><tr>
                                {['Lokaliti', 'Pemilih', 'Sudah Dicula', 'Belum Dicula', 'Kemajuan', 'Ahli PAS'].map((label, i) => <th key={label} scope="col" className={`${headerCell} ${i === 0 ? 'sticky left-0 z-20 text-left' : ''}`}>{label}</th>)}
                            </tr></thead>
                            <tbody>
                                {rows.map((row) => <tr key={row.locality} className={rowClass}>{progressRow(row, row.locality)}</tr>)}
                                {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tiada data pemilih untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="font-bold text-slate-900"><tr className="bg-violet-100">{progressRow(totals, 'Jumlah')}</tr></tfoot>
                        </table>
                    </div>
                </Section>
                <Section title="Pecahan Cula Mengikut Lokaliti" description="Bilangan pemilih bagi setiap kod cula. Kod kosong, ?, TIADA dan 0 dikira belum dicula.">
                    <div className="overflow-x-auto rounded-b-xl">
                        <table className="w-full border-separate border-spacing-0 text-xs">
                            <thead><tr>
                                <th scope="col" className={`${headerCell} sticky left-0 z-20 min-w-44 text-left`}>Lokaliti</th>
                                {codes.map(({ code, label }) => <th key={code} scope="col" className={`${headerCell} min-w-28 max-w-40`}><span className="inline-flex min-w-8 justify-center rounded bg-lime-100 px-2 py-0.5 text-sm font-extrabold">{code}</span><span className="mt-1.5 block text-[10px] font-semibold leading-tight">{label}</span></th>)}
                                <th scope="col" className={`${headerCell} min-w-24`}>Jumlah</th>
                            </tr></thead>
                            <tbody>
                                {rows.map((row) => <tr key={row.locality} className={rowClass}>
                                    <th scope="row" className={localityCell}>{row.locality}</th>
                                    {codes.map(({ code }) => <td key={code} className={`${cell} ${row.breakdown[code] ? 'font-semibold' : 'text-slate-400'}`}>{fmt(row.breakdown[code])}</td>)}
                                    <td className={`${cell} bg-green-50/70 font-bold text-green-800`}>{fmt(row.total)}</td>
                                </tr>)}
                                {!rows.length && <tr><td colSpan={codes.length + 2} className="p-6 text-center text-slate-500">Tiada data culaan untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="font-bold text-slate-900"><tr className="bg-violet-100">
                                <th scope="row" className={localityCell}>Jumlah</th>
                                {codes.map(({ code }) => <td key={code} className={cell}>{fmt(totals.breakdown[code])}</td>)}
                                <td className={cell}>{fmt(totals.total)}</td>
                            </tr></tfoot>
                        </table>
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
