import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Announcements({ announcements, roles, users }) {
    const form = useForm({ title: '', type: 'text', body: '', poster: null, audience: 'all', role_ids: [], user_ids: [], starts_at: '', expires_at: '' });
    const [search, setSearch] = useState('');
    const [fileKey, setFileKey] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [posterPreview, setPosterPreview] = useState(null);
    const [posterError, setPosterError] = useState(false);
    const preview = (item) => { setPosterError(false); setPosterPreview(item); };
    const formatDate = (value) => value ? new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : null;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const status = (item) => !item.is_active ? 'Tidak aktif' : item.expires_at && item.expires_at < today ? 'Tamat' : item.starts_at && item.starts_at > today ? 'Dijadualkan' : 'Aktif';
    const closeCreate = () => {
        if (form.processing) return;
        setShowCreate(false);
        form.reset();
        form.clearErrors();
        setSearch('');
        setFileKey((key) => key + 1);
    };
    const toggle = (field, id) => form.setData(field, form.data[field].includes(id) ? form.data[field].filter((value) => value !== id) : [...form.data[field], id]);
    const submit = (event) => {
        event.preventDefault();
        form.post(route('admin.announcements.store'), { forceFormData: true, onSuccess: () => { setShowCreate(false); form.reset(); setSearch(''); setFileKey((key) => key + 1); } });
    };
    const input = 'mt-1 w-full rounded-lg border-slate-300 text-sm';

    return <AuthenticatedLayout header={<h1 className="text-lg font-bold">Pengumuman</h1>}>
        <Head title="Pengumuman" />
        <div className="mx-auto max-w-7xl space-y-6 px-4">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Senarai pengumuman</h2><p className="mt-1 text-sm text-slate-500">Urus pengumuman teks dan poster untuk pengguna.</p></div><button type="button" onClick={() => setShowCreate(true)} className="btn-primary">Tambah pengumuman</button></div>
            <Modal show={showCreate} onClose={closeCreate} closeable={!form.processing} title="Tambah pengumuman" animate={false}>
            <form onSubmit={submit} className="max-h-[85vh] space-y-4 overflow-y-auto bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Tambah pengumuman</h2><button type="button" disabled={form.processing} onClick={closeCreate} className="btn-ghost">Tutup</button></div>
                <p className="text-sm text-slate-500">Teks atau poster akan dipaparkan sebagai popup kepada penerima ketika masuk halaman.</p>
                <label className="block text-sm font-medium">Tajuk<input required maxLength={255} className={input} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} /></label>
                <label className="block text-sm font-medium">Jenis<select className={input} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}><option value="text">Teks</option><option value="poster">Poster</option></select></label>
                {form.data.type === 'poster' && <label className="block text-sm font-medium">Poster (JPG, PNG atau WebP, maksimum 20 MB)<input key={fileKey} type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" onChange={(e) => form.setData('poster', e.target.files[0])} /></label>}
                <label className="block text-sm font-medium">{form.data.type === 'text' ? 'Mesej' : 'Keterangan (pilihan)'}<textarea required={form.data.type === 'text'} rows={5} maxLength={20000} className={input} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} /></label>
                <label className="block text-sm font-medium">Penerima<select className={input} value={form.data.audience} onChange={(e) => form.setData('audience', e.target.value)}><option value="all">Semua pengguna</option><option value="roles">Mengikut peranan (role)</option><option value="users">Pengguna individu / personal</option></select></label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">Tarikh mula (pilihan)<input type="date" className={input} value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} /></label>
                    <label className="block text-sm font-medium">Tarikh tamat (pilihan)<input type="date" min={form.data.starts_at || undefined} className={input} value={form.data.expires_at} onChange={(e) => form.setData('expires_at', e.target.value)} /></label>
                </div>
                <p className="text-xs text-slate-500">Kosongkan untuk mula serta-merta atau tanpa tarikh tamat. Pengumuman dipaparkan sehingga akhir tarikh tamat, mengikut waktu sistem.</p>
                {form.data.audience !== 'all' && <fieldset className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Pilih penerima</legend>
                    {form.data.audience === 'users' && <input type="search" aria-label="Cari penerima" placeholder="Cari nama, e-mel atau UDM" className={input} value={search} onChange={(e) => setSearch(e.target.value)} />}
                    <div className="mt-2 max-h-60 overflow-y-auto">{(form.data.audience === 'roles' ? roles : users.filter((u) => `${u.name} ${u.email} ${u.udm || ''}`.toLowerCase().includes(search.toLowerCase()))).map((entry) => {
                        const field = form.data.audience === 'roles' ? 'role_ids' : 'user_ids';
                        return <label key={entry.id} className="flex items-center gap-3 p-2 text-sm"><input type="checkbox" checked={form.data[field].includes(entry.id)} onChange={() => toggle(field, entry.id)} className="rounded border-slate-300 text-green-700" /><span>{entry.name}{entry.email && <span className="ml-2 text-xs text-slate-500">{entry.email}</span>}{entry.email && <span className="mt-1 block text-xs font-medium text-green-700">{entry.udm ? `UDM: ${entry.udm}` : 'Peringkat JPrD / tiada UDM'}</span>}</span></label>;
                    })}</div>
                </fieldset>}
                {Object.entries(form.errors).map(([field, error]) => <p key={field} role="alert" className="text-sm text-red-600">{error}</p>)}
                <div className="flex justify-end gap-3"><button type="button" disabled={form.processing} onClick={closeCreate} className="btn-ghost">Batal</button><button type="submit" disabled={form.processing} className="btn-primary">{form.processing ? 'Menghantar…' : 'Hantar pengumuman'}</button></div>
            </form>
            </Modal>
            <section aria-label="Senarai pengumuman" className="overflow-hidden rounded-xl border border-green-200 bg-green-50/70">
                <div className="flex items-center justify-between gap-3 border-b border-green-200 bg-white px-5 py-4"><h2 className="font-semibold text-slate-800">Pengumuman dihantar</h2><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">{announcements.total} pengumuman</span></div>
                {!announcements.data.length && <div className="px-6 py-16 text-center"><h3 className="font-semibold text-slate-800">Belum ada pengumuman</h3><p className="mt-2 text-sm text-slate-600">Klik Tambah pengumuman untuk menghantar makluman pertama anda.</p></div>}
                <div className="space-y-4 p-3 sm:p-5">{announcements.data.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-green-900/5">
                    <div className="flex flex-col sm:flex-row">
                        {item.poster_url ? <button type="button" onClick={() => preview(item)} aria-label={`Lihat poster: ${item.title}`} className="flex h-44 shrink-0 items-center justify-center border-b border-slate-100 bg-slate-50 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 sm:h-auto sm:w-40 sm:border-b-0 sm:border-r"><img src={item.poster_url} alt={item.title} loading="lazy" className="h-36 w-full rounded-lg object-contain" /></button> : <div className="hidden w-2 shrink-0 bg-green-700 sm:block" />}
                        <div className="min-w-0 flex-1 p-5">
                            <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{item.poster_url ? 'Poster' : 'Teks'} · #{item.id}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status(item) === 'Aktif' ? 'bg-green-100 text-green-800' : status(item) === 'Dijadualkan' ? 'border border-green-200 bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{status(item)}</span></div>
                            <h3 className="break-words text-base font-bold text-slate-900">{item.title}</h3>
                            {item.body && <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{item.body}</p>}
                            <div className="mt-4 flex flex-wrap gap-1.5">{(item.audience === 'all' ? [{ id: 'all', name: 'Semua pengguna' }] : item.audience === 'roles' ? item.roles : item.users).map((entry) => <span key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{entry.name}</span>)}</div>
                            <div className="mt-4 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center">
                                <p className="text-xs leading-relaxed text-slate-500">Mula: <span className="font-medium text-slate-700">{formatDate(item.starts_at) || 'Serta-merta'}</span><br />Tamat: <span className="font-medium text-slate-700">{formatDate(item.expires_at) || 'Tiada tarikh tamat'}</span></p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {item.poster_url && <button type="button" onClick={() => preview(item)} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-100">Lihat poster</button>}
                                    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => router.put(route('admin.announcements.update', item.id), { is_active: !item.is_active }, { preserveScroll: true })}>{item.is_active ? 'Nyahaktifkan' : 'Aktifkan'}</button>
                                    <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => { if (confirm('Padam pengumuman ini?')) router.delete(route('admin.announcements.destroy', item.id), { preserveScroll: true }); }}>Padam</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>)}</div>
                <div className="mt-4 flex gap-2">{announcements.prev_page_url && <Link href={announcements.prev_page_url} className="btn-ghost">Sebelum</Link>}{announcements.next_page_url && <Link href={announcements.next_page_url} className="btn-ghost">Seterusnya</Link>}</div>
            </section>
            <Modal show={!!posterPreview} onClose={() => setPosterPreview(null)} title={`Poster: ${posterPreview?.title || ''}`} maxWidth="4xl" animate={false}>
                {posterPreview && <div className="max-h-[90vh] overflow-y-auto bg-white"><div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4"><h2 className="min-w-0 break-words font-semibold text-slate-900">{posterPreview.title}</h2><button type="button" onClick={() => setPosterPreview(null)} className="btn-ghost shrink-0">Tutup</button></div><div className="bg-slate-50 p-3 sm:p-5">{posterError ? <p role="alert" className="py-10 text-center text-sm text-red-700">Poster tidak dapat dimuatkan. Sila tutup dan cuba lagi.</p> : <img src={posterPreview.poster_url} alt={posterPreview.title} onError={() => setPosterError(true)} className="mx-auto max-h-[72vh] w-full object-contain" />}</div></div>}
            </Modal>
        </div>
    </AuthenticatedLayout>;
}
