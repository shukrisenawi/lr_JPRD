import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function GroupPemilihIndex({ groups, availableKodCulas, availableKeturunans }) {
    const [editingId, setEditingId] = useState(null);
    const f = useForm({
        nama_group: '',
        kod_culas: [],
        keturunan: 'M',
        jantina: '',
        umur_dari: '',
        umur_akhir: '',
        sort_order: 0,
    });

    const submit = (e) => {
        e.preventDefault();
        if (editingId) {
            f.put(route('group-pemilih.update', editingId), {
                preserveScroll: true,
                onSuccess: () => { setEditingId(null); f.reset(); },
            });
            return;
        }
        f.post(route('group-pemilih.store'), {
            preserveScroll: true,
            onSuccess: () => f.reset(),
        });
    };

    const del = (g) => {
        if (window.confirm(`Padam group "${g.nama_group}"?`)) {
            router.delete(route('group-pemilih.destroy', g.id), {
                preserveScroll: true,
                onSuccess: () => { if (editingId === g.id) { setEditingId(null); f.reset(); } },
            });
        }
    };

    const edit = (g) => {
        setEditingId(g.id);
        f.setData({
            nama_group: g.nama_group,
            kod_culas: g.kod_culas ?? [],
            keturunan: g.keturunan ?? 'M',
            jantina: g.jantina ?? '',
            umur_dari: g.umur_dari ?? '',
            umur_akhir: g.umur_akhir ?? '',
            sort_order: g.sort_order ?? 0,
        });
        f.clearErrors();
    };

    const toggleKodCula = (kod) => {
        const current = f.data.kod_culas;
        if (current.includes(kod)) {
            f.setData('kod_culas', current.filter((k) => k !== kod));
        } else {
            f.setData('kod_culas', [...current, kod]);
        }
    };

    const groupsContent = groups.map((g) => (
        <div key={g.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">
                    <span className="mr-1 text-slate-400">{g.sort_order}.</span>
                    {g.nama_group}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                    {g.kod_culas.length > 0 && (
                        <span className="rounded-md border border-slate-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                            Kod: {g.kod_culas.join(', ')}
                        </span>
                    )}
                    {g.keturunan && (
                        <span className="rounded-md border border-slate-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            Keturunan: {g.keturunan}
                        </span>
                    )}
                    {g.jantina && (
                        <span className="rounded-md border border-slate-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                            Jantina: {g.jantina === 'L' ? 'Lelaki' : 'Perempuan'}
                        </span>
                    )}
                    {(g.umur_dari || g.umur_akhir) && (
                        <span className="rounded-md border border-slate-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            Umur: {g.umur_dari ?? '0'} - {g.umur_akhir ?? '999'}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
                <button onClick={() => edit(g)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700">Edit</button>
                <button onClick={() => del(g)} className="rounded-md bg-gradient-to-r from-rose-600 to-pink-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:from-rose-500 hover:to-red-400">Padam</button>
            </div>
        </div>
    ));

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Group Pemilih</p><h2 className="mt-0.5 heading-lg">Group Pemilih</h2></div>
        }>
            <Head title="Group Pemilih" />
            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
                    <form onSubmit={submit} className="card p-3">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{editingId ? 'Edit Group' : 'Tambah Group'}</p>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-800">{editingId ? 'Kemaskini group' : 'Daftar group baru'}</h3>
                        <div className="mt-3 grid gap-3">
                            <div>
                                <InputLabel htmlFor="nama_group" value="Nama Group" />
                                <TextInput id="nama_group" required value={f.data.nama_group} onChange={(e) => f.setData('nama_group', e.target.value)} className="mt-1 w-full text-xs" />
                                <InputError className="mt-1" message={f.errors.nama_group} />
                            </div>

                            <div>
                                <InputLabel htmlFor="kod_culas" value="Kod Cula" />
                                <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2">
                                    {availableKodCulas.length === 0 && <p className="text-xs text-slate-400">Tiada kod cula</p>}
                                    {availableKodCulas.map((kod) => {
                                        const checked = f.data.kod_culas.includes(kod);
                                        return (
                                            <label key={kod} className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition ${checked ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-green-200'}`}>
                                                <input type="checkbox" checked={checked} onChange={() => toggleKodCula(kod)} className="sr-only" />
                                                {kod}
                                            </label>
                                        );
                                    })}
                                </div>
                                <InputError className="mt-1" message={f.errors.kod_culas} />
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="keturunan" value="Keturunan" />
                                    <select id="keturunan" value={f.data.keturunan} onChange={(e) => f.setData('keturunan', e.target.value)} className="input-field mt-1 w-full text-xs">
                                        <option value="">Semua</option>
                                        {availableKeturunans.map((k) => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                    <InputError className="mt-1" message={f.errors.keturunan} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="jantina" value="Jantina" />
                                    <select id="jantina" value={f.data.jantina} onChange={(e) => f.setData('jantina', e.target.value)} className="input-field mt-1 w-full text-xs">
                                        <option value="">Semua</option>
                                        <option value="L">Lelaki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                    <InputError className="mt-1" message={f.errors.jantina} />
                                </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                                <div>
                                    <InputLabel htmlFor="umur_dari" value="Umur Dari" />
                                    <TextInput id="umur_dari" type="number" min="0" max="150" value={f.data.umur_dari} onChange={(e) => f.setData('umur_dari', e.target.value)} className="mt-1 w-full text-xs" placeholder="18" />
                                    <InputError className="mt-1" message={f.errors.umur_dari} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="umur_akhir" value="Umur Akhir" />
                                    <TextInput id="umur_akhir" type="number" min="0" max="150" value={f.data.umur_akhir} onChange={(e) => f.setData('umur_akhir', e.target.value)} className="mt-1 w-full text-xs" placeholder="60" />
                                    <InputError className="mt-1" message={f.errors.umur_akhir} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="sort_order" value="Susunan" />
                                    <TextInput id="sort_order" type="number" min="0" max="9999" value={f.data.sort_order} onChange={(e) => f.setData('sort_order', e.target.value)} className="mt-1 w-full text-xs" placeholder="0" />
                                    <InputError className="mt-1" message={f.errors.sort_order} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            {editingId && <button onClick={() => { setEditingId(null); f.reset(); f.clearErrors(); }} className="btn-ghost text-xs mr-2">Batal</button>}
                            <PrimaryButton disabled={f.processing} className="px-4 py-1.5 text-xs">{f.processing ? '...' : editingId ? 'Simpan' : 'Tambah'}</PrimaryButton>
                        </div>
                    </form>

                    <section className="card p-3">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Senarai Group</p>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-800">{groups.length} group</h3>
                        <div className="mt-3 space-y-2">
                            {groups.length === 0 ? (
                                <div className="card-dashed py-4 text-xs">Belum ada</div>
                            ) : groupsContent}
                        </div>
                    </section>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
