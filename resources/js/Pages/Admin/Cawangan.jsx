import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        branch: <><path d="M6 3v18" /><path d="M6 7h7a3 3 0 0 1 3 3v11" /><path d="M6 13h5a3 3 0 0 1 3 3v5" /><circle cx="6" cy="3" r="2" /><circle cx="16" cy="10" r="2" /><circle cx="14" cy="21" r="2" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18a2.1 2.1 0 0 0 3 3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.4-.6-.6-2.4 2.3-2.3Z" /><path d="m15 15 6 6" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function CawanganCard({ cawangan, udms, editing = false, onEdit, onCancel, onDelete }) {
    const editForm = useForm({ name: cawangan.name, udm: cawangan.udm });

    const submit = (event) => {
        event.preventDefault();
        editForm.put(route('admin.cawangan.update', cawangan.id), {
            preserveScroll: true,
            onSuccess: onCancel,
        });
    };

    if (editing) {
        return (
            <form onSubmit={submit} className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div>
                        <InputLabel htmlFor={`edit-cawangan-name-${cawangan.id}`} value="Nama Cawangan" />
                        <TextInput id={`edit-cawangan-name-${cawangan.id}`} value={editForm.data.name} onChange={(event) => editForm.setData('name', event.target.value)} className="input-field mt-1 text-xs" />
                        <InputError className="mt-1" message={editForm.errors.name} />
                    </div>
                    <div>
                        <InputLabel htmlFor={`edit-cawangan-udm-${cawangan.id}`} value="UDM" />
                        <select id={`edit-cawangan-udm-${cawangan.id}`} value={editForm.data.udm} onChange={(event) => editForm.setData('udm', event.target.value)} className="input-field mt-1 text-xs">
                            <option value="">Pilih UDM</option>
                            {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                        </select>
                        <InputError className="mt-1" message={editForm.errors.udm} />
                    </div>
                    <div className="flex gap-1.5 sm:pb-0.5">
                        <button type="submit" disabled={editForm.processing} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">Simpan</button>
                        <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white">Batal</button>
                    </div>
                </div>
            </form>
        );
    }

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon name="branch" className="h-5 w-5" /></div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{cawangan.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">UDM: <span className="font-semibold text-sky-700">{cawangan.udm}</span></p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"><Icon name="users" className="h-3 w-3" />{cawangan.committee_members_count} AJK</span>
                <button type="button" onClick={() => onEdit(cawangan.id)} className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"><Icon name="edit" className="mr-1 inline h-3 w-3" />Edit</button>
                <button type="button" onClick={() => onDelete(cawangan)} className="rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><Icon name="trash" className="mr-1 inline h-3 w-3" />Padam</button>
            </div>
        </div>
    );
}

function RepairModal({ legacyScopes, cawangans, onClose }) {
    const form = useForm({
        repairs: legacyScopes.map((scope) => ({ legacy_scope_key: scope.key, cawangan_id: '' })),
    });

    const groupedBranches = useMemo(() => {
        const groups = new Map();
        cawangans.forEach((cawangan) => {
            if (!groups.has(cawangan.udm)) groups.set(cawangan.udm, []);
            groups.get(cawangan.udm).push(cawangan);
        });
        return [...groups.entries()];
    }, [cawangans]);

    const updateSelection = (index, value) => {
        form.setData('repairs', form.data.repairs.map((repair, repairIndex) => repairIndex === index ? { ...repair, cawangan_id: value } : repair));
    };

    const submit = (event) => {
        event.preventDefault();
        form.post(route('admin.cawangan.repair'), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 pt-8 sm:pt-16">
            <section className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="repair-cawangan-title">
                <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Pembetulan data lama</p>
                        <h3 id="repair-cawangan-title" className="mt-0.5 text-sm font-bold text-slate-900">Pindahkan AJK daripada lokaliti kepada cawangan</h3>
                        <p className="mt-1 text-xs text-slate-600">Pilih cawangan bagi setiap lokaliti lama. Semua AJK di lokaliti tersebut akan dipindahkan sekali.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Tutup repair"><Icon name="x" className="h-5 w-5" /></button>
                </div>

                <form onSubmit={submit} className="space-y-3 p-4">
                    {legacyScopes.map((scope, index) => {
                        const matchingBranches = cawangans.filter((cawangan) => !scope.udm || cawangan.udm === scope.udm);
                        return (
                            <div key={scope.key} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1.2fr] sm:items-center">
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{scope.name || 'Lokaliti tidak dinamakan'}</p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">UDM: {scope.udm || 'Tidak diketahui'} · {scope.members_count} AJK</p>
                                </div>
                                <div>
                                    <label htmlFor={`repair-cawangan-${index}`} className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cawangan baharu</label>
                                    <select id={`repair-cawangan-${index}`} value={form.data.repairs[index]?.cawangan_id || ''} onChange={(event) => updateSelection(index, event.target.value)} className="input-field mt-1 text-xs" required>
                                        <option value="">Pilih cawangan</option>
                                        {matchingBranches.length > 0 ? matchingBranches.map((cawangan) => <option key={cawangan.id} value={cawangan.id}>{cawangan.name}</option>) : groupedBranches.map(([udm, branches]) => <optgroup key={udm} label={udm}>{branches.map((cawangan) => <option key={cawangan.id} value={cawangan.id}>{cawangan.name}</option>)}</optgroup>)}
                                    </select>
                                    <InputError className="mt-1" message={form.errors[`repairs.${index}.cawangan_id`]} />
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                        <button type="submit" disabled={form.processing || !cawangans.length} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">{form.processing ? 'Memindahkan...' : 'Simpan pembetulan'}</button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default function Cawangan({ cawangans = [], udms = [], legacy_scopes = [] }) {
    const createForm = useForm({ name: '', udm: '' });
    const [editingId, setEditingId] = useState(null);
    const [repairOpen, setRepairOpen] = useState(false);

    const groupedCawangans = useMemo(() => {
        const groups = new Map();
        cawangans.forEach((cawangan) => {
            if (!groups.has(cawangan.udm)) groups.set(cawangan.udm, []);
            groups.get(cawangan.udm).push(cawangan);
        });
        return [...groups.entries()];
    }, [cawangans]);

    const submitCreate = (event) => {
        event.preventDefault();
        createForm.post(route('admin.cawangan.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const deleteCawangan = (cawangan) => {
        if (window.confirm(`Padam cawangan ${cawangan.name}?`)) {
            router.delete(route('admin.cawangan.destroy', cawangan.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="label-section">Pentadbiran</p>
                    <h2 className="mt-0.5 heading-lg">Pengurusan Cawangan</h2>
                    <p className="mt-1 text-xs text-slate-500">Susun hierarki JPRD &gt; UDM &gt; Cawangan. Lokaliti pemilih kekal sebagai data lokasi sahaja.</p>
                </div>
                {legacy_scopes.length > 0 && <button type="button" onClick={() => setRepairOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-500"><Icon name="wrench" className="h-4 w-4" />Repair data lama</button>}
            </div>
        }>
            <Head title="Pengurusan Cawangan" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="rounded-xl border border-emerald-200 bg-white shadow-sm">
                    <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon name="plus" className="h-5 w-5" /></div>
                            <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Cawangan baharu</p><h3 className="text-sm font-bold text-slate-900">Tambah cawangan di bawah UDM</h3></div>
                        </div>
                    </div>
                    <form onSubmit={submitCreate} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div>
                            <InputLabel htmlFor="cawangan-name" value="Nama Cawangan" />
                            <TextInput id="cawangan-name" value={createForm.data.name} onChange={(event) => createForm.setData('name', event.target.value)} className="input-field mt-1 text-xs" placeholder="Contoh: Cawangan Taman Murni" />
                            <InputError className="mt-1" message={createForm.errors.name} />
                        </div>
                        <div>
                            <InputLabel htmlFor="cawangan-udm" value="Di bawah UDM" />
                            <select id="cawangan-udm" value={createForm.data.udm} onChange={(event) => createForm.setData('udm', event.target.value)} className="input-field mt-1 text-xs">
                                <option value="">Pilih UDM</option>
                                {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                            </select>
                            <InputError className="mt-1" message={createForm.errors.udm} />
                        </div>
                        <PrimaryButton disabled={createForm.processing} className="justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold"><Icon name="plus" className="h-4 w-4" />{createForm.processing ? '...' : 'Tambah'}</PrimaryButton>
                    </form>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="label-section text-emerald-700">Senarai cawangan</p><p className="mt-0.5 text-xs text-slate-500">{cawangans.length} cawangan didaftarkan dalam {new Set(cawangans.map((cawangan) => cawangan.udm)).size} UDM.</p></div>
                        {legacy_scopes.length > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">{legacy_scopes.length} lokaliti lama perlu dibaiki</span>}
                    </div>

                    {groupedCawangans.length === 0 ? <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-xs text-slate-400">Belum ada cawangan. Tambah cawangan di bawah UDM untuk mula.</div> : (
                        <div className="space-y-4">
                            {groupedCawangans.map(([udm, branches]) => (
                                <div key={udm}>
                                    <div className="mb-2 flex items-center gap-2"><span className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">UDM</span><h3 className="text-sm font-bold text-slate-800">{udm}</h3><span className="text-[10px] text-slate-400">{branches.length} cawangan</span></div>
                                    <div className="grid gap-2 lg:grid-cols-2">
                                        {branches.map((cawangan) => <CawanganCard key={cawangan.id} cawangan={cawangan} udms={udms} editing={editingId === cawangan.id} onEdit={setEditingId} onCancel={() => setEditingId(null)} onDelete={deleteCawangan} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {repairOpen && <RepairModal legacyScopes={legacy_scopes} cawangans={cawangans} onClose={() => setRepairOpen(false)} />}
        </AuthenticatedLayout>
    );
}
