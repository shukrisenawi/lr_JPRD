import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

const emptyFund = (udm = '') => ({
    udm,
    kategori_id: '',
    jenis_dana_lain: '',
    jenis: 'masuk',
    jumlah: '',
    tarikh: today(),
    keterangan: '',
    catatan: '',
});

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        wallet: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" /><path d="M3 8h16" /><path d="M16 13h5" /><circle cx="16" cy="13" r=".6" fill="currentColor" stroke="none" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
        arrowDown: <><path d="M12 4v15" /><path d="m6 13 6 6 6-6" /></>,
        arrowUp: <><path d="M12 20V5" /><path d="m6 11 6-6 6 6" /></>,
        tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
        list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
        back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function formatCurrency(value) {
    return `RM ${Number(value || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
    if (!value) return '-';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
}

function UdmCard({ summary, selected, onSelect }) {
    const balance = Number(summary.baki || 0);
    const isNegative = balance < 0;

    return (
        <button type="button" onClick={() => onSelect(summary.udm)} className={`group relative overflow-hidden rounded-2xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${selected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : isNegative ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300' : 'border-emerald-100 bg-white hover:border-emerald-300'}`}>
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-4 ${selected ? 'border-emerald-200 bg-emerald-100/70' : isNegative ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50'}`}>
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${isNegative ? 'bg-rose-600 shadow-rose-600/20' : 'bg-emerald-600 shadow-emerald-600/20'}`}><Icon name="layers" className="h-5 w-5" /></div>
                    <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isNegative ? 'text-rose-700' : 'text-emerald-700'}`}>UDM</p>
                        <h2 className="truncate text-base font-black text-slate-900">{summary.udm}</h2>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Baki semasa</p>
                    <p className={`mt-1 text-lg font-black leading-none ${isNegative ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(summary.baki)}</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Masuk</p><p className="mt-1 text-xs font-black text-emerald-700">{formatCurrency(summary.total_masuk)}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Keluar</p><p className="mt-1 text-xs font-black text-rose-600">{formatCurrency(summary.total_keluar)}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Rekod</p><p className="mt-1 text-xs font-black text-slate-700">{summary.count}</p></div>
            </div>
        </button>
    );
}

function DanaRow({ dana, onEdit, onDelete }) {
    const isIncoming = dana.jenis === 'masuk';
    const displayType = dana.kategori_is_other && dana.jenis_dana_lain ? dana.jenis_dana_lain : dana.kategori;

    return (
        <div className="flex flex-col gap-3 px-4 py-3 transition hover:bg-emerald-50/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isIncoming ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}><Icon name={isIncoming ? 'arrowDown' : 'arrowUp'} className="h-4 w-4" /></div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-900">{dana.keterangan}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${isIncoming ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isIncoming ? 'Masuk' : 'Keluar'}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">{displayType || 'Tiada kategori'}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(dana.tarikh)}{dana.catatan ? ` · ${dana.catatan}` : ''}</p>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
                <p className={`text-sm font-black ${isIncoming ? 'text-emerald-700' : 'text-rose-700'}`}>{isIncoming ? '+' : '-'} {formatCurrency(dana.jumlah)}</p>
                <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => onEdit(dana)} aria-label="Edit rekod dana" title="Edit rekod dana" className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:bg-emerald-50"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => onDelete(dana)} aria-label="Padam rekod dana" title="Padam rekod dana" className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                </div>
            </div>
        </div>
    );
}

function DanaForm({ form, editing, categories, udms, canSelectAll, onClose, onSubmit }) {
    const selectedCategory = useMemo(() => categories.find((category) => String(category.id) === String(form.data.kategori_id)), [categories, form.data.kategori_id]);
    const isOther = selectedCategory?.is_other === true;

    const setCategory = (value) => {
        form.setData('kategori_id', value);
        if (!categories.find((category) => String(category.id) === String(value))?.is_other) form.setData('jenis_dana_lain', '');
    };

    return (
        <section className="relative z-20 overflow-visible rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="rounded-t-2xl bg-gradient-to-br from-emerald-50 to-green-50 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><Icon name={editing ? 'edit' : 'plus'} className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{editing ? 'Kemaskini rekod' : 'Rekod baharu'}</p>
                        <h2 className="mt-0.5 text-base font-black text-slate-900">{editing ? 'Ubah dana' : 'Tambah dana'}</h2>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 p-5">
                <div>
                    <InputLabel htmlFor="dana-udm" value="UDM" />
                    <select id="dana-udm" value={form.data.udm} onChange={(event) => form.setData('udm', event.target.value)} disabled={!canSelectAll} className="input-field mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                        <option value="">Pilih UDM</option>
                        {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                    </select>
                    <InputError message={form.errors.udm} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="dana-kategori" value="Kategori dana" />
                    <select id="dana-kategori" value={form.data.kategori_id} onChange={(event) => setCategory(event.target.value)} className="input-field mt-1.5" required>
                        <option value="">Pilih kategori</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <InputError message={form.errors.kategori_id} className="mt-1" />
                </div>

                {isOther && <div>
                    <InputLabel htmlFor="dana-jenis-lain" value="Jenis dana (Lain-lain)" />
                    <input id="dana-jenis-lain" type="text" className="input-field mt-1.5" placeholder="Contoh: Sumbangan khas" value={form.data.jenis_dana_lain} onChange={(event) => form.setData('jenis_dana_lain', event.target.value)} required />
                    <InputError message={form.errors.jenis_dana_lain} className="mt-1" />
                </div>}

                <div>
                    <InputLabel value="Jenis transaksi" />
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {[
                            { value: 'masuk', label: 'Masuk', hint: 'Tambah baki', icon: 'arrowDown' },
                            { value: 'keluar', label: 'Keluar', hint: 'Tolak baki', icon: 'arrowUp' },
                        ].map((option) => {
                            const checked = form.data.jenis === option.value;
                            return <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${checked ? option.value === 'masuk' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                <input type="radio" name="dana-jenis" value={option.value} checked={checked} onChange={(event) => form.setData('jenis', event.target.value)} className={option.value === 'masuk' ? 'text-emerald-600 focus:ring-emerald-500' : 'text-rose-600 focus:ring-rose-500'} />
                                <Icon name={option.icon} className="h-4 w-4" />
                                <span><span className="block text-xs font-black">{option.label}</span><span className="block text-[10px] opacity-70">{option.hint}</span></span>
                            </label>;
                        })}
                    </div>
                    <InputError message={form.errors.jenis} className="mt-1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="dana-jumlah" value="Jumlah (RM)" />
                        <input id="dana-jumlah" type="number" min="0.01" step="0.01" className="input-field mt-1.5" placeholder="0.00" value={form.data.jumlah} onChange={(event) => form.setData('jumlah', event.target.value)} required />
                        <InputError message={form.errors.jumlah} className="mt-1" />
                    </div>
                    <div>
                        <InputLabel htmlFor="dana-tarikh" value="Tarikh" />
                        <input id="dana-tarikh" type="date" className="input-field mt-1.5" value={form.data.tarikh} onChange={(event) => form.setData('tarikh', event.target.value)} required />
                        <InputError message={form.errors.tarikh} className="mt-1" />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="dana-keterangan" value="Perkara / keterangan" />
                    <input id="dana-keterangan" type="text" className="input-field mt-1.5" placeholder="Contoh: Sumbangan program" value={form.data.keterangan} onChange={(event) => form.setData('keterangan', event.target.value)} required />
                    <InputError message={form.errors.keterangan} className="mt-1" />
                </div>

                <div>
                    <InputLabel htmlFor="dana-catatan" value="Catatan (pilihan)" />
                    <textarea id="dana-catatan" rows="3" className="input-field mt-1.5 resize-y" placeholder="Maklumat tambahan..." value={form.data.catatan} onChange={(event) => form.setData('catatan', event.target.value)} />
                    <InputError message={form.errors.catatan} className="mt-1" />
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    {editing && <button type="button" onClick={onClose} className="btn-outline w-full sm:w-auto">Batal</button>}
                    <PrimaryButton disabled={form.processing || categories.length === 0} className="w-full justify-center gap-1.5 sm:w-auto"><Icon name={editing ? 'edit' : 'plus'} className="h-4 w-4" />{form.processing ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah dana'}</PrimaryButton>
                </div>
            </form>
        </section>
    );
}

function CategoryManager({ categories }) {
    const form = useForm({ name: '' });
    const [editing, setEditing] = useState(null);

    const openEdit = (category) => {
        setEditing(category);
        form.clearErrors();
        form.setData('name', category.name);
    };

    const closeEdit = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: closeEdit };
        if (editing) form.put(route('dana.kategori.update', editing.id), options);
        else form.post(route('dana.kategori.store'), options);
    };

    const deleteCategory = (category) => {
        if (window.confirm(`Padam kategori ${category.name}?`)) router.delete(route('dana.kategori.destroy', category.id), { preserveScroll: true });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm"><Icon name="tag" className="h-5 w-5" /></div>
                    <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Pentadbiran</p><h2 className="mt-0.5 text-base font-black text-slate-900">Kategori dana</h2><p className="mt-1 text-xs text-slate-500">Tambah kategori yang boleh dipilih pada rekod dana.</p></div>
                </div>
                {editing && <button type="button" onClick={closeEdit} className="btn-outline self-start sm:self-auto">Batal edit</button>}
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                <form onSubmit={submit} className="space-y-3">
                    <div><InputLabel htmlFor="dana-kategori-name" value={editing ? 'Nama kategori' : 'Kategori baharu'} /><input id="dana-kategori-name" type="text" className="input-field mt-1.5" placeholder="Contoh: Sumbangan" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required /><InputError message={form.errors.name} className="mt-1" /></div>
                    <PrimaryButton disabled={form.processing} className="w-full justify-center gap-1.5">{editing ? <Icon name="edit" className="h-4 w-4" /> : <Icon name="plus" className="h-4 w-4" />}{form.processing ? 'Menyimpan...' : editing ? 'Simpan kategori' : 'Tambah kategori'}</PrimaryButton>
                </form>
                <div className="space-y-2">
                    {categories.map((category) => <div key={category.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide ${category.is_other ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{category.is_other ? 'Sistem' : 'Kategori'}</span><span className="truncate text-xs font-bold text-slate-800">{category.name}</span><span className="text-[10px] text-slate-400">{category.dana_count} rekod</span></div><div className="flex shrink-0 gap-2">{!category.is_other && <button type="button" onClick={() => openEdit(category)} className="btn-outline px-2 py-1 text-[10px]"><Icon name="edit" className="mr-1 inline h-3 w-3" />Edit</button>}<button type="button" onClick={() => deleteCategory(category)} disabled={category.is_other || category.dana_count > 0} title={category.is_other ? 'Kategori sistem' : category.dana_count > 0 ? 'Kategori telah digunakan' : 'Padam kategori'} className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="trash" className="mr-1 inline h-3 w-3" />Padam</button></div></div>)}
                    {categories.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-xs text-slate-400">Belum ada kategori dana.</p>}
                </div>
            </div>
        </section>
    );
}

export default function Index({ dana = [], udms = [], udmSummaries = [], selectedUdm = '', defaultUdm = '', canSelectAll = true, categories = [], canManageCategories = false, totals = {} }) {
    const form = useForm(emptyFund(defaultUdm || selectedUdm));
    const [editing, setEditing] = useState(null);
    const { setData } = form;

    useEffect(() => {
        if (!editing) setData('udm', selectedUdm || defaultUdm || '');
    }, [selectedUdm, defaultUdm, editing, setData]);

    const selectedSummary = udmSummaries.find((summary) => summary.udm === selectedUdm);

    const openEdit = (fund) => {
        setEditing(fund);
        form.clearErrors();
        form.setData({
            udm: fund.udm,
            kategori_id: String(fund.kategori_id),
            jenis_dana_lain: fund.jenis_dana_lain ?? '',
            jenis: fund.jenis,
            jumlah: fund.jumlah,
            tarikh: fund.tarikh ?? today(),
            keterangan: fund.keterangan ?? '',
            catatan: fund.catatan ?? '',
        });
    };

    const closeForm = () => {
        setEditing(null);
        form.clearErrors();
        form.setData(emptyFund(selectedUdm || defaultUdm || ''));
    };

    const submit = (event) => {
        event.preventDefault();
        const activeUdm = selectedUdm || defaultUdm;
        form.transform((data) => ({ ...data, _redirect_udm: activeUdm }));
        const options = { preserveScroll: true, onSuccess: closeForm };
        if (editing) form.put(route('dana.update', editing.id), options);
        else form.post(activeUdm ? route('dana.store', { udm: activeUdm }) : route('dana.store'), options);
    };

    const deleteFund = (fund) => {
        if (window.confirm(`Padam rekod dana "${fund.keterangan}"?`)) router.delete(route('dana.destroy', fund.id), { data: { _redirect_udm: selectedUdm }, preserveScroll: true });
    };

    const selectUdm = (udm) => router.get(route('dana.index'), { udm }, { preserveScroll: false, preserveState: false, replace: true });
    const clearSelection = () => router.get(route('dana.index'), {}, { preserveScroll: false, preserveState: false, replace: true });

    return (
        <AuthenticatedLayout>
            <Head title="Dana" />

            <div className="mx-auto max-w-7xl space-y-5 px-3 sm:px-4 lg:px-6">
                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-emerald-950 to-green-800 p-5 text-white shadow-lg shadow-green-900/10 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Operasi kewangan UDM</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Dana</h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50">Pantau baki setiap UDM dan simpan semua transaksi dana masuk serta keluar dalam satu rekod.</p>
                        </div>
                        {selectedUdm && canSelectAll && <button type="button" onClick={clearSelection} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20 sm:w-auto"><Icon name="back" className="h-4 w-4" />Semua UDM</button>}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">Jumlah masuk</p><p className="mt-0.5 text-lg font-black">{formatCurrency(totals.total_masuk)}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">Jumlah keluar</p><p className="mt-0.5 text-lg font-black">{formatCurrency(totals.total_keluar)}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">Baki skop</p><p className="mt-0.5 text-lg font-black">{formatCurrency(totals.baki)}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">UDM</p><p className="mt-0.5 text-lg font-black">{udmSummaries.length}</p></div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] lg:items-start">
                    <section className="order-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5 lg:order-1">
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Ringkasan mengikut UDM</p><h2 className="mt-1 text-xl font-black text-slate-900">{selectedUdm ? `Detail dana ${selectedUdm}` : 'Baki dana setiap UDM'}</h2><p className="mt-1 text-xs text-slate-500">{selectedUdm ? 'Semak, kemas kini atau padam rekod transaksi UDM ini.' : 'Klik kad UDM untuk melihat semua transaksi dan detail dana.'}</p></div>
                            {!selectedUdm && <span className="self-start rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{udmSummaries.length} UDM dipaparkan</span>}
                        </div>

                        {selectedUdm ? <>
                            {selectedSummary && <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-4"><div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Baki</p><p className={`mt-1 text-sm font-black ${Number(selectedSummary.baki) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(selectedSummary.baki)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Masuk</p><p className="mt-1 text-sm font-black text-emerald-700">{formatCurrency(selectedSummary.total_masuk)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Keluar</p><p className="mt-1 text-sm font-black text-rose-700">{formatCurrency(selectedSummary.total_keluar)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Rekod</p><p className="mt-1 text-sm font-black text-slate-700">{selectedSummary.count}</p></div></div>}
                            <div className="mt-4 divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-white">{dana.length > 0 ? dana.map((fund) => <DanaRow key={fund.id} dana={fund} onEdit={openEdit} onDelete={deleteFund} />) : <div className="px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="wallet" className="h-6 w-6" /></div><h3 className="mt-3 text-sm font-black text-slate-800">Belum ada rekod dana</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Tambah transaksi pertama untuk {selectedUdm} menggunakan borang di sebelah.</p></div>}</div>
                        </> : <div className="mt-4 grid gap-4 md:grid-cols-2">{udmSummaries.length > 0 ? udmSummaries.map((summary) => <UdmCard key={summary.udm} summary={summary} selected={false} onSelect={selectUdm} />) : <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-12 text-center md:col-span-2"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm"><Icon name="list" className="h-6 w-6" /></div><h3 className="mt-3 text-sm font-black text-slate-800">Belum ada UDM</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">UDM aktif akan muncul di sini apabila data pemilih tersedia.</p></div>}</div>}
                    </section>

                    <div className="order-1 lg:order-2"><DanaForm form={form} editing={editing} categories={categories} udms={udms} canSelectAll={canSelectAll} onClose={closeForm} onSubmit={submit} /></div>
                </div>

                {canManageCategories && <CategoryManager categories={categories} />}
            </div>
        </AuthenticatedLayout>
    );
}
