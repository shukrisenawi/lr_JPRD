import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ filters, udmSummaries, families }) {
    const [udm, setUdm] = useState(filters.udm);
    const [loading, setLoading] = useState(false);
    const { errors } = usePage().props;

    function applyFilter(event) {
        event.preventDefault();
        router.get(route('keluarga-disemak.index'), udm ? { udm } : {}, {
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Keluarga Disemak" />
            <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 sm:px-6">
                <header>
                    <p className="label-section">Operasi</p>
                    <h1 className="heading-lg mt-1">Keluarga Disemak</h1>
                    <p className="mt-2 text-sm text-slate-600">Lihat keluarga yang telah disemak mengikut UDM dan semua ahli dalam skop akses anda.</p>
                </header>

                <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-3 rounded-xl border border-green-200 bg-white p-4">
                    <div className="w-full sm:w-72">
                        <label htmlFor="udm" className="mb-1 block text-sm font-semibold text-slate-700">UDM</label>
                        <select id="udm" value={udm} onChange={(event) => setUdm(event.target.value)} className="w-full rounded-lg border-slate-300 text-sm focus:border-green-600 focus:ring-green-600">
                            <option value="">Semua UDM</option>
                            {udmSummaries.map((item) => <option key={item.udm} value={item.udm}>{item.udm}</option>)}
                        </select>
                        {errors.udm && <p role="alert" className="mt-1 text-sm text-red-700">{errors.udm}</p>}
                    </div>
                    <button disabled={loading} className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-60">{loading ? 'Memuatkan...' : 'Tapis'}</button>
                </form>

                {!filters.udm ? (
                    <section aria-label="Ringkasan UDM" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {udmSummaries.map((item) => (
                            <Link key={item.udm} href={route('keluarga-disemak.index', { udm: item.udm })} className="rounded-xl border border-green-200 bg-white p-5 transition-colors hover:border-green-600 hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
                                <h2 className="text-base font-bold text-slate-800">{item.udm}</h2>
                                <p className="mt-4 text-3xl font-bold tabular-nums text-green-800">{item.families.toLocaleString('ms-MY')}</p>
                                <p className="mt-1 text-sm text-slate-600">keluarga telah disemak</p>
                                <p className="mt-4 text-sm font-semibold text-green-800">Lihat keluarga &rarr;</p>
                            </Link>
                        ))}
                        {udmSummaries.length === 0 && <p className="col-span-full rounded-xl border border-green-200 bg-white p-6 text-sm text-slate-600">Tiada UDM dalam skop akses anda.</p>}
                    </section>
                ) : (
                    <section aria-label="Senarai keluarga" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-bold text-slate-800">{filters.udm} <span className="text-sm font-normal text-slate-600">({families.total} keluarga)</span></h2>
                            <Link href={route('keluarga-disemak.index')} className="text-sm font-semibold text-green-800 underline underline-offset-4">Kembali ke semua UDM</Link>
                        </div>
                        {families.data.map((family) => (
                            <article key={family.id} className="overflow-hidden rounded-xl border border-green-200 bg-white">
                                <div className="border-b border-green-100 bg-green-50 p-4">
                                    <h3 className="font-bold text-slate-800">{family.name || `Keluarga #${family.id}`}</h3>
                                    {family.address && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{family.address}</p>}
                                    <p className="mt-2 text-xs text-slate-600">Disemak {family.reviewed_at} · {family.members.length} ahli</p>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {family.members.map((member) => (
                                        <li key={member.id} className="px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                                            <p className="mt-1 text-xs text-slate-600">{[member.udm, member.locality].filter(Boolean).join(' · ') || 'Lokasi belum direkodkan'}</p>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                        {families.data.length === 0 && <p className="rounded-xl border border-green-200 bg-white p-6 text-sm text-slate-600">Belum ada keluarga yang telah disemak di UDM ini.</p>}
                        {families.last_page > 1 && (
                            <nav aria-label="Halaman keluarga" className="flex items-center justify-between gap-3 text-sm">
                                {families.prev_page_url ? <Link href={families.prev_page_url} className="rounded-lg border border-green-300 bg-white px-4 py-2 font-semibold text-green-800">Sebelumnya</Link> : <span />}
                                <span className="text-slate-600">{families.current_page} / {families.last_page}</span>
                                {families.next_page_url ? <Link href={families.next_page_url} className="rounded-lg border border-green-300 bg-white px-4 py-2 font-semibold text-green-800">Seterusnya</Link> : <span />}
                            </nav>
                        )}
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
