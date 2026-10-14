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
    const cell = 'whitespace-nowrap px-4 py-3 text-right tabular-nums';
    const progressRow = (row, label) => <>
        <th scope="row" className="px-4 py-3 text-left font-medium">{label}</th>
        <td className={cell}>{fmt(row.total)}</td>
        <td className={`${cell} text-green-700`}>{fmt(row.with_cula)}</td>
        <td className={cell}>{fmt(row.without_cula)}</td>
        <td className={cell}>{row.percentage}%</td>
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-50 text-xs text-slate-600"><tr>
                                {['Lokaliti', 'Pemilih', 'Sudah Dicula', 'Belum Dicula', 'Kemajuan', 'Ahli PAS'].map((label, i) => <th key={label} scope="col" className={`${cell} ${i === 0 ? 'text-left' : ''}`}>{label}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-green-100">
                                {rows.map((row) => <tr key={row.locality} className="hover:bg-green-50/50">{progressRow(row, row.locality)}</tr>)}
                                {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tiada data pemilih untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="border-t border-green-200 bg-green-50 font-bold"> <tr>{progressRow(totals, 'Jumlah')}</tr></tfoot>
                        </table>
                    </div>
                </Section>
                <Section title="Pecahan Cula Mengikut Lokaliti" description="Bilangan pemilih bagi setiap kod cula. Kod kosong, ?, TIADA dan 0 dikira belum dicula.">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-50 text-xs text-slate-600"><tr>
                                <th scope="col" className="px-4 py-3 text-left">Lokaliti</th>
                                {codes.map(({ code, label }) => <th key={code} scope="col" className="min-w-28 px-4 py-3 text-right"><span className="block font-bold">{code}</span><span className="mt-1 block text-[10px] font-normal">{label}</span></th>)}
                                <th scope="col" className={cell}>Jumlah</th>
                            </tr></thead>
                            <tbody className="divide-y divide-green-100">
                                {rows.map((row) => <tr key={row.locality} className="hover:bg-green-50/50">
                                    <th scope="row" className="px-4 py-3 text-left font-medium">{row.locality}</th>
                                    {codes.map(({ code }) => <td key={code} className={cell}>{fmt(row.breakdown[code])}</td>)}
                                    <td className={`${cell} font-bold`}>{fmt(row.total)}</td>
                                </tr>)}
                                {!rows.length && <tr><td colSpan={codes.length + 2} className="p-6 text-center text-slate-500">Tiada data culaan untuk UDM ini.</td></tr>}
                            </tbody>
                            <tfoot className="border-t border-green-200 bg-green-50 font-bold"><tr>
                                <th scope="row" className="px-4 py-3 text-left">Jumlah</th>
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
