import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 3 2 5-7" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function Pagination({ members, onPage }) {
    if (!members || members.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">Papar {members.from ?? 0} - {members.to ?? 0} daripada {members.total} ahli</p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onPage(members.current_page - 1)} disabled={!members.prev_page_url} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Sebelum</button>
                {members.links?.filter(link => /^\d+$/.test(String(link.label))).map(link => (
                    <button key={link.label} type="button" onClick={() => onPage(Number(link.label))} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${link.active ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700'}`}>{link.label}</button>
                ))}
                <button type="button" onClick={() => onPage(members.current_page + 1)} disabled={!members.next_page_url} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Seterusnya</button>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, icon }) {
    return (
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700"><Icon name={icon} className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-800">{Number(value ?? 0).toLocaleString('ms-MY')}</p>
        </div>
    );
}

export default function AhliPasIndex({ active_tab, filters, available_dms, available_localities, members, statistics }) {
    const [form, setForm] = useState(filters);

    useEffect(() => setForm(filters), [filters]);

    const load = (params) => {
        router.get(route('ahli-pas.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const selectTab = (tab) => load({ ...form, tab, page: 1 });

    const applyFilters = (next) => {
        setForm(next);
        load({ ...next, tab: active_tab, page: 1 });
    };

    const updateFilter = (key, value) => {
        const next = { ...form, [key]: value };
        if (key === 'udm') next.locality = '';
        applyFilters(next);
    };

    const submitSearch = (event) => {
        event.preventDefault();
        applyFilters(form);
    };

    const goToPage = (page) => load({ ...form, tab: active_tab, page });
    const rows = members?.data ?? [];

    return (
        <AuthenticatedLayout
            header={<div><p className="label-section">Pemilih</p><h2 className="mt-0.5 heading-lg">Ahli PAS</h2></div>}
        >
            <Head title="Ahli PAS" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="rounded-xl border border-green-200 bg-white p-1 shadow-sm">
                    <div className="grid grid-cols-2 gap-1">
                        {[
                            { key: 'senarai', label: 'Senarai Ahli', icon: 'users' },
                            { key: 'statistik', label: 'Statistik', icon: 'chart' },
                        ].map(tab => (
                            <button key={tab.key} type="button" onClick={() => selectTab(tab.key)} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${active_tab === tab.key ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                                <Icon name={tab.icon} className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {active_tab === 'senarai' ? (
                    <>
                        <form onSubmit={submitSearch} className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_1fr_auto]">
                                <div>
                                    <label htmlFor="ahli-pas-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                                    <select id="ahli-pas-udm" value={form.udm} onChange={e => updateFilter('udm', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua UDM</option>
                                        {available_dms.map(udm => <option key={udm} value={udm}>{udm}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="ahli-pas-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                                    <select id="ahli-pas-locality" value={form.locality} onChange={e => updateFilter('locality', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua Lokaliti</option>
                                        {available_localities.map(locality => <option key={locality} value={locality}>{locality}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="ahli-pas-search" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Carian</label>
                                    <div className="relative mt-1.5">
                                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input id="ahli-pas-search" type="search" value={form.q} onChange={e => setForm({ ...form, q: e.target.value })} placeholder="Nama / No KP / No. Ahli" className="input-field w-full pl-9" />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary self-end">Cari</button>
                            </div>
                        </form>

                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <div><p className="label-section">Senarai Ahli PAS</p><p className="mt-0.5 text-xs text-slate-500">{Number(members?.total ?? 0).toLocaleString('ms-MY')} ahli dalam skop anda</p></div>
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">No. Ahli tersedia</span>
                            </div>
                            {rows.length === 0 ? <div className="py-12 text-center"><p className="text-sm font-bold text-slate-400">Tiada ahli PAS</p><p className="mt-1 text-xs text-slate-400">Cuba ubah tapisan atau carian.</p></div> : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-4 py-2 text-left font-bold text-slate-500">#</th><th className="px-4 py-2 text-left font-bold text-slate-500">Nama</th><th className="px-4 py-2 text-left font-bold text-slate-500">No KP</th><th className="px-4 py-2 text-left font-bold text-slate-500">No. Ahli</th><th className="px-4 py-2 text-left font-bold text-slate-500">UDM</th><th className="px-4 py-2 text-left font-bold text-slate-500">Lokaliti</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">{rows.map((member, index) => <tr key={member.id} className="hover:bg-green-50/50"><td className="px-4 py-2 text-slate-400">{(members.from ?? 1) + index}</td><td className="px-4 py-2 font-semibold uppercase text-slate-800">{member.name || '-'}</td><td className="px-4 py-2 text-slate-600">{member.no_kp || member.old_ic || '-'}</td><td className="px-4 py-2 font-bold text-green-700">{member.no_ahli}</td><td className="px-4 py-2 text-slate-600">{member.dm || '-'}</td><td className="px-4 py-2 text-slate-600">{member.locality || '-'}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination members={members} onPage={goToPage} />
                        </section>
                    </>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3"><SummaryCard label="Jumlah Ahli PAS" value={statistics?.total} icon="users" /><SummaryCard label="Jumlah UDM" value={statistics?.by_udm?.length} icon="chart" /><SummaryCard label="Jumlah Lokaliti" value={statistics?.by_locality?.length} icon="chart" /></div>
                        <div className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3"><p className="label-section">Ahli Mengikut UDM</p><p className="mt-0.5 text-xs text-slate-500">Jumlah ahli PAS dalam setiap UDM.</p></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-4 py-2 text-left font-bold text-slate-500">UDM</th><th className="px-4 py-2 text-right font-bold text-slate-500">Ahli</th></tr></thead><tbody className="divide-y divide-slate-100">{(statistics?.by_udm ?? []).map(row => <tr key={row.udm}><td className="px-4 py-2 font-semibold text-slate-700">{row.udm}</td><td className="px-4 py-2 text-right font-bold text-green-700">{Number(row.total).toLocaleString('ms-MY')}</td></tr>)}</tbody></table></div></section>
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3"><p className="label-section">Ahli Mengikut Lokaliti</p><p className="mt-0.5 text-xs text-slate-500">Pecahan ahli PAS mengikut UDM dan lokaliti.</p></div><div className="max-h-[32rem] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0"><tr className="border-b border-slate-100 bg-slate-50"><th className="px-4 py-2 text-left font-bold text-slate-500">UDM</th><th className="px-4 py-2 text-left font-bold text-slate-500">Lokaliti</th><th className="px-4 py-2 text-right font-bold text-slate-500">Ahli</th></tr></thead><tbody className="divide-y divide-slate-100">{(statistics?.by_locality ?? []).map(row => <tr key={`${row.udm}-${row.locality}`}><td className="px-4 py-2 font-semibold text-slate-700">{row.udm}</td><td className="px-4 py-2 text-slate-600">{row.locality}</td><td className="px-4 py-2 text-right font-bold text-green-700">{Number(row.total).toLocaleString('ms-MY')}</td></tr>)}</tbody></table></div></section>
                        </div>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
