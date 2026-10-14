import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { orderUdms } from '@/Utils/udmOrder';
import { calculateAgeFromNoKp, familyMemberTone, sortFamilyMembers } from '@/Utils/familyMemberOrder';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ filters, udmSummaries: unorderedUdmSummaries, families, localities = [] }) {
    const udmSummaries = orderUdms(unorderedUdmSummaries);
    const [loading, setLoading] = useState(false);
    const { errors, available_cula_codes: culaCodes = [] } = usePage().props;
    const [pendingIds, setPendingIds] = useState(new Set());
    const [selectedVoter, setSelectedVoter] = useState(null);
    const [saving, setSaving] = useState(false);
    const [actionErrors, setActionErrors] = useState({});
    const [saveError, setSaveError] = useState('');
    const [culaOverrides, setCulaOverrides] = useState({});

    function openTelegram(member, command) {
        const identity = member.no_kp || member.old_ic;
        if (!identity) return;
        const popup = window.open('about:blank', '_blank');
        if (!popup) {
            setActionErrors((current) => ({ ...current, [member.id]: 'Pelayar menyekat popup Telegram.' }));
            return;
        }
        try {
            popup.location.replace(`tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(`/${command} ${identity}`)}`);
            if (command === 'kemascula') setPendingIds((current) => new Set([...current, member.id]));
            setActionErrors((current) => ({ ...current, [member.id]: null }));
        } catch {
            popup.close();
            setActionErrors((current) => ({ ...current, [member.id]: 'Telegram gagal dibuka.' }));
        }
    }

    async function saveCula(option) {
        if (!selectedVoter || saving) return;
        setSaving(true);
        setSaveError('');
        try {
            const response = await fetch(route('keluarga-pemilih.cula.update', selectedVoter.id), {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ cula_code: option.code }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || 'Kod cula tidak berjaya disimpan.');
            setCulaOverrides((current) => ({ ...current, [selectedVoter.id]: { cula_code: payload.cula_code, cula_display_label: payload.cula_display_label } }));
            setPendingIds((current) => { const next = new Set(current); next.delete(selectedVoter.id); return next; });
            setSelectedVoter(null);
        } catch (error) {
            setSaveError(error.message || 'Kod cula tidak berjaya disimpan.');
        } finally {
            setSaving(false);
        }
    }
    const totalFamilies = udmSummaries.reduce((total, item) => total + Number(item.families), 0);
    const reviewedUdm = udmSummaries.filter((item) => item.families > 0).length;
    const formatNumber = (value) => Number(value).toLocaleString('ms-MY');

    function applyFilter(udm, locality = '') {
        router.get(route('keluarga-disemak.index'), udm ? { udm, ...(locality ? { locality } : {}) } : {}, {
            preserveScroll: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Pemilih Sasaran" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
                <header className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm shadow-green-900/5">
                    <div className="border-b border-green-100 bg-green-50/70 px-5 py-6 sm:px-8 sm:py-8">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">Operasi / Semakan keluarga</p>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Pemilih Sasaran</h1>
                    </div>
                    <dl className="grid grid-cols-3 divide-x divide-green-100 px-2 py-5 sm:px-4">
                        {[[formatNumber(totalFamilies), 'Keluarga disemak'], [formatNumber(reviewedUdm), 'UDM dengan semakan'], [formatNumber(udmSummaries.length), 'UDM dalam akses']].map(([value, label]) => (
                            <div key={label} className="px-3 sm:px-6">
                                <dd className="text-2xl font-bold tabular-nums tracking-tight text-green-800 sm:text-3xl">{value}</dd>
                                <dt className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{label}</dt>
                            </div>
                        ))}
                    </dl>
                </header>

                <section aria-label="Penapis keluarga" aria-busy={loading} className="overflow-hidden rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_18rem_minmax(0,1fr)] xl:items-end">
                    <div>
                        <label htmlFor="udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                        <select id="udm" value={filters.udm} disabled={loading} onChange={(event) => applyFilter(event.target.value)} className="input-field mt-1.5 disabled:opacity-60">
                            <option value="">Semua UDM</option>
                            {udmSummaries.map((item) => <option key={item.udm} value={item.udm}>{item.udm}</option>)}
                        </select>
                        {errors.udm && <p role="alert" className="mt-1 text-sm text-red-700">{errors.udm}</p>}
                    </div>
                    <div>
                        <label htmlFor="locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                        <select id="locality" value={filters.locality || ''} disabled={!filters.udm || loading} onChange={(event) => applyFilter(filters.udm, event.target.value)} className="input-field mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60">
                            <option value="">{filters.udm ? 'Semua Lokaliti' : 'Pilih UDM dahulu'}</option>
                            {localities.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                        </select>
                        {errors.locality && <p role="alert" className="mt-1 text-sm text-red-700">{errors.locality}</p>}
                    </div>
                    <p role="status" className="text-xs text-slate-600 xl:pb-3">{loading ? 'Memuatkan keluarga...' : 'Senarai ditapis secara automatik.'}</p>
                    </div>
                </section>

                {!filters.udm ? (
                    <section aria-label="Ringkasan UDM" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="col-span-full flex items-center justify-between gap-3 pb-1">
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">Ringkasan mengikut UDM</h2>
                            <span className="text-xs text-slate-500">{udmSummaries.length} UDM</span>
                        </div>
                        {udmSummaries.map((item) => (
                            <Link key={item.udm} href={route('keluarga-disemak.index', { udm: item.udm })} className="card block w-full p-3 text-left transition hover:border-green-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">
                                <h3 className="truncate text-xs font-black text-slate-900">{item.udm}</h3>
                                <p className="mt-2 text-lg font-black tabular-nums text-green-800">{formatNumber(item.families)}</p>
                                <p className="text-[10px] font-semibold text-slate-500">Keluarga telah disemak</p>
                                <p className="mt-2 border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-500">{item.families > 0 ? 'Lihat keluarga' : 'Belum disemak'}</p>
                            </Link>
                        ))}
                        {udmSummaries.length === 0 && <p className="col-span-full rounded-xl border border-green-200 bg-white p-6 text-sm text-slate-600">Tiada UDM dalam skop akses anda.</p>}
                    </section>
                ) : (
                    <section aria-label="Senarai keluarga" className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div><h2 className="text-lg font-bold text-slate-800">{filters.udm} <span className="text-sm font-normal text-slate-600">({families.total} keluarga)</span></h2>{filters.locality && <p className="mt-1 text-sm text-green-800">{filters.locality}</p>}</div>
                            <Link href={route('keluarga-disemak.index')} className="text-sm font-semibold text-green-800 underline underline-offset-4">Kembali ke semua UDM</Link>
                        </div>
                        <div className="grid grid-cols-1 items-start gap-2.5 xl:grid-cols-2">
                        {families.data.map((family) => (
                            <article key={family.id} className="card overflow-hidden">
                                <div className="border-b border-slate-100 bg-white px-3 py-3">
                                    <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-slate-900">{family.name || `Keluarga #${family.id}`}</h3><span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">{family.members.length} ahli</span></div>
                                    <p className="mt-1 text-[10px] text-slate-500"><span className="font-semibold">Lokaliti:</span> {[...new Set(family.members.map((member) => member.locality?.trim()).filter(Boolean))].join(' · ') || '-'}</p>
                                    <p className="mt-2 whitespace-pre-line break-words text-xs text-slate-600">{family.address || 'Belum diisi'}</p>
                                    <p className="mt-1 text-[10px] text-slate-500">Disemak {family.reviewed_at}</p>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                     {sortFamilyMembers(family.members, family.father_id).map((member) => {
                                         const age = calculateAgeFromNoKp(member.no_kp);
                                         const culaMember = { ...member, ...(culaOverrides[member.id] || {}) };
                                         const tone = familyMemberTone(culaMember);
                                         return (
                                         <li key={member.id} className={`flex flex-wrap items-start gap-3 px-3 py-2.5 ${tone === 'pink' ? 'bg-pink-50/70' : tone === 'green' ? 'bg-green-50/70' : ''}`}>
                                             {member.avatar_url ? <img src={member.avatar_url} alt={member.name} className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{member.name?.charAt(0) || '?'}</span>}
                                             <div className="min-w-0 flex-1">
                                             <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-800">{member.name}{Number(family.father_id) === Number(member.id) && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[8px] font-black text-green-800">AYAH</span>}{age !== null && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{age} tahun</span>}</p>
                                             <p className="mt-0.5 text-[10px] text-slate-500">{[member.no_kp, member.no_rumah ? `Rumah ${member.no_rumah}` : null, member.udm, member.locality].filter(Boolean).join(' · ') || 'Maklumat alamat tiada'}</p>
                                             {member.address && <p className="mt-0.5 text-[10px] text-slate-500">{member.address}</p>}
                                             <p className="mt-0.5 text-[10px] text-slate-500">Tel: {member.phone ? <a href={`tel:${member.phone}`} className="text-green-700 hover:underline">{member.phone}</a> : '-'}</p>
                                             {member.catatan && <p className="mt-1 break-words rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800"><span className="font-bold">Catatan:</span> {member.catatan}</p>}
                                             {culaMember.cula_display_label && <p className="mt-1 text-[10px] text-slate-600">{culaMember.cula_display_label}</p>}
                                             {actionErrors[member.id] && <p role="alert" className="mt-1 text-xs text-red-700">{actionErrors[member.id]}</p>}
                                             </div>
                                             <div className="flex w-full shrink-0 flex-wrap justify-end gap-1 sm:w-auto">
                                                 {pendingIds.has(member.id) ? <button type="button" disabled={saving} onClick={() => { setSelectedVoter(member); setSaveError(''); }} className="rounded-md bg-blue-600 px-2 py-1 text-[9px] font-bold text-white disabled:opacity-50">Siap</button> : <button type="button" disabled={saving || !(member.no_kp || member.old_ic)} onClick={() => openTelegram(member, 'kemascula')} className="rounded-md bg-green-700 px-2 py-1 text-[9px] font-bold text-white disabled:opacity-50">Cula</button>}
                                                 <button type="button" disabled={saving || !(member.no_kp || member.old_ic)} onClick={() => openTelegram(member, 'kemastel')} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-700 disabled:opacity-50">Tukar Tel</button>
                                             </div>
                                        </li>
                                     ); })}
                                </ul>
                            </article>
                        ))}
                        </div>
                        {families.data.length === 0 && <p className="rounded-xl border border-green-200 bg-white p-6 text-sm text-slate-600">Belum ada keluarga yang telah disemak {filters.locality ? 'di lokaliti ini' : 'di UDM ini'}.</p>}
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
            <Modal show={Boolean(selectedVoter)} animate={false} onClose={() => !saving && setSelectedVoter(null)} maxWidth="md" title={`Kemas Cula — ${selectedVoter?.name || 'Pemilih'}`}>
                <div className="space-y-3 rounded-xl bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="label-section">Kemas Cula</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-900">{selectedVoter?.name}</h3>
                            <p className="mt-1 text-[10px] text-slate-500">Pilih kod culaan yang betul.</p>
                        </div>
                        <button type="button" disabled={saving} onClick={() => setSelectedVoter(null)} className="btn-ghost px-2 py-1 text-xs">Tutup</button>
                    </div>
                    <div className="flex max-h-[50vh] flex-wrap gap-1.5 overflow-y-auto">{culaCodes.map((option) => <button key={option.code} type="button" disabled={saving} onClick={() => saveCula(option)} className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${option.code === (culaOverrides[selectedVoter?.id]?.cula_code || selectedVoter?.cula_code) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}>{option.label}</button>)}{culaCodes.length === 0 && <p className="text-xs text-slate-500">Tiada kod culaan tersedia.</p>}</div>
                    {saveError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{saveError}</p>}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
