import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 3 2 5-7" /></>,
        alert: <><path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
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

function culaStatus(member) {
    if (!member.cula_code || member.cula_code === '?' || member.cula_code === 'TIADA') return 'Belum Cula';
    return member.cula_display_label || member.cula_code;
}

function formatDate(value) {
    const [year, month, day] = String(value || '').slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : '-';
}

function DetailModal({ member, onClose }) {
    const address = member.alamat_kediaman || member.alamat_kp || member.address || '-';
    const fields = [
        ['No. Ahli', member.no_ahli], ['No. KP', member.no_kp || member.old_ic || '-'],
        ['UDM', member.dm || '-'], ['Lokaliti', member.locality || '-'],
        ['No. Telefon', member.phone_mobile || member.phone_home || '-'], ['Jantina', member.gender || '-'],
        ['Bangsa', member.race || '-'], ['Tarikh Lahir', formatDate(member.date_of_birth)],
        ['Status Cula', culaStatus(member)], ['Alamat', address], ['Catatan', member.catatan || '-'],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-3 pt-12 backdrop-blur-sm sm:items-center sm:pt-3">
            <section className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Maklumat pemilih">
                <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Maklumat Pemilih</p><h3 className="mt-0.5 text-sm font-bold uppercase text-slate-900">{member.name || '-'}</h3></div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label="Tutup maklumat pemilih"><Icon name="x" className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {fields.map(([label, value]) => <div key={label} className={`rounded-lg border border-slate-100 px-3 py-2 ${label === 'Alamat' || label === 'Catatan' ? 'sm:col-span-2' : ''}`}><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">{label}</p><p className="mt-0.5 break-words text-xs font-medium text-slate-700">{value || '-'}</p></div>)}
                </div>
            </section>
        </div>
    );
}

export default function AhliPasIndex({ active_tab, filters, available_dms, available_localities, members, wrong_cula_members, statistics }) {
    const [form, setForm] = useState(filters);
    const [copiedNoAhli, setCopiedNoAhli] = useState('');
    const [detailMember, setDetailMember] = useState(null);
    const [openingCulaId, setOpeningCulaId] = useState(null);
    const [culaError, setCulaError] = useState('');

    useEffect(() => setForm(filters), [filters]);

    const copyNoAhli = async (value) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const input = document.createElement('textarea');
                input.value = value;
                input.setAttribute('readonly', '');
                input.style.position = 'fixed';
                input.style.opacity = '0';
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand('copy');
                input.remove();
                if (!copied) throw new Error('copy-failed');
            }
            setCopiedNoAhli(value);
            setTimeout(() => setCopiedNoAhli(current => current === value ? '' : current), 1500);
        } catch {
            setCopiedNoAhli('');
        }
    };

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

    const goToPage = (page) => load(active_tab === 'salah-cula'
        ? { ...form, tab: active_tab, salah_cula_page: page }
        : { ...form, tab: active_tab, page });
    const rows = members?.data ?? [];
    const wrongCulaRows = wrong_cula_members?.data ?? [];

    const openCula = (member) => {
        const identity = member.no_kp || member.old_ic;
        if (!identity) {
            setCulaError('No. KP tidak tersedia untuk membuka Telegram Bot.');
            return;
        }

        const telegramWindow = window.open('about:blank', '_blank');
        setOpeningCulaId(member.id);
        try {
            telegramWindow?.location.replace(`tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(`/kemascula ${identity}`)}`);
        } catch {
            telegramWindow?.close();
            setCulaError('Telegram Bot gagal dibuka.');
        } finally {
            window.setTimeout(() => setOpeningCulaId(current => current === member.id ? null : current), 1200);
        }
    };

    return (
        <AuthenticatedLayout
            header={<div><p className="label-section">Pemilih</p><h2 className="mt-0.5 heading-lg">Ahli PAS</h2></div>}
        >
            <Head title="Ahli PAS" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="rounded-xl border border-green-200 bg-white p-1 shadow-sm">
                    <div className="grid grid-cols-3 gap-1">
                        {[
                            { key: 'senarai', label: 'Senarai Ahli', icon: 'users' },
                            { key: 'salah-cula', label: 'Salah Cula', icon: 'alert' },
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
                                        <tbody className="divide-y divide-slate-100">{rows.map((member, index) => <tr key={member.id} className="hover:bg-green-50/50"><td className="px-4 py-2 text-slate-400">{(members.from ?? 1) + index}</td><td className="px-4 py-2 font-semibold uppercase text-slate-800">{member.name || '-'}</td><td className="px-4 py-2 text-slate-600">{member.no_kp || member.old_ic || '-'}</td><td className="px-4 py-2"><button type="button" onClick={() => copyNoAhli(member.no_ahli)} title="Klik untuk salin No. Ahli" aria-label={`Salin No. Ahli ${member.no_ahli}`} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold transition ${copiedNoAhli === member.no_ahli ? 'bg-emerald-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{copiedNoAhli === member.no_ahli ? 'Disalin' : member.no_ahli}</button></td><td className="px-4 py-2 text-slate-600">{member.dm || '-'}</td><td className="px-4 py-2 text-slate-600">{member.locality || '-'}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination members={members} onPage={goToPage} />
                        </section>
                    </>
                ) : active_tab === 'salah-cula' ? (
                    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="label-section text-amber-700">Semakan Salah Cula</p><p className="mt-0.5 text-xs text-slate-600">{Number(wrong_cula_members?.total ?? 0).toLocaleString('ms-MY')} ahli PAS berkod selain PAS atau belum cula.</p></div>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">Perlu semakan</span>
                        </div>
                        {culaError && <div className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{culaError}</div>}
                        {wrongCulaRows.length === 0 ? <div className="py-12 text-center"><p className="text-sm font-bold text-slate-400">Tiada ahli salah cula</p><p className="mt-1 text-xs text-slate-400">Semua ahli dalam skop mempunyai kod PAS yang sah.</p></div> : (
                            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-amber-100 bg-amber-50"><th className="px-4 py-2 text-left font-bold text-slate-500">#</th><th className="px-4 py-2 text-left font-bold text-slate-500">Nama</th><th className="px-4 py-2 text-left font-bold text-slate-500">No. Ahli</th><th className="px-4 py-2 text-left font-bold text-slate-500">Status Cula</th><th className="px-4 py-2 text-left font-bold text-slate-500">UDM</th><th className="px-4 py-2 text-left font-bold text-slate-500">Lokaliti</th><th className="px-4 py-2 text-center font-bold text-slate-500">Tindakan</th></tr></thead><tbody className="divide-y divide-slate-100">{wrongCulaRows.map((member, index) => <tr key={member.id} className="hover:bg-amber-50/40"><td className="px-4 py-2 text-slate-400">{(wrong_cula_members.from ?? 1) + index}</td><td className="px-4 py-2 font-semibold uppercase text-slate-800">{member.name || '-'}</td><td className="px-4 py-2"><button type="button" onClick={() => copyNoAhli(member.no_ahli)} title="Klik untuk salin No. Ahli" className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold transition ${copiedNoAhli === member.no_ahli ? 'bg-emerald-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{copiedNoAhli === member.no_ahli ? 'Disalin' : member.no_ahli}</button></td><td className="px-4 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${culaStatus(member) === 'Belum Cula' ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700'}`}>{culaStatus(member)}</span></td><td className="px-4 py-2 text-slate-600">{member.dm || '-'}</td><td className="px-4 py-2 text-slate-600">{member.locality || '-'}</td><td className="px-4 py-2"><div className="flex justify-center gap-1.5"><button type="button" onClick={() => openCula(member)} className="rounded-md bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-green-500">{openingCulaId === member.id ? 'Membuka...' : 'Cula'}</button><button type="button" onClick={() => setDetailMember(member)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"><Icon name="eye" className="h-3 w-3" />Detail</button></div></td></tr>)}</tbody></table></div>
                        )}
                        <Pagination members={wrong_cula_members} onPage={goToPage} />
                    </section>
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
            {detailMember && <DetailModal member={detailMember} onClose={() => setDetailMember(null)} />}
        </AuthenticatedLayout>
    );
}
