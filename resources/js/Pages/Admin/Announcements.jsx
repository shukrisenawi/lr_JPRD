import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Announcements({ announcements, roles, users }) {
    const form = useForm({ title: '', type: 'text', body: '', poster: null, audience: 'all', role_ids: [], user_ids: [] });
    const [search, setSearch] = useState('');
    const [fileKey, setFileKey] = useState(0);
    const toggle = (field, id) => form.setData(field, form.data[field].includes(id) ? form.data[field].filter((value) => value !== id) : [...form.data[field], id]);
    const submit = (event) => {
        event.preventDefault();
        form.post(route('admin.announcements.store'), { forceFormData: true, onSuccess: () => { form.reset(); setFileKey((key) => key + 1); } });
    };
    const input = 'mt-1 w-full rounded-lg border-slate-300 text-sm';

    return <AuthenticatedLayout header={<h1 className="text-lg font-bold">Pengumuman</h1>}>
        <Head title="Pengumuman" />
        <div className="mx-auto max-w-7xl space-y-6 px-4">
            <div><h2 className="text-xl font-bold">Hantar pengumuman</h2><p className="mt-1 text-sm text-slate-500">Teks atau poster akan dipaparkan sebagai popup kepada penerima ketika masuk halaman.</p></div>
            <form onSubmit={submit} className="space-y-4 rounded-xl border border-green-200 bg-white p-5">
                <label className="block text-sm font-medium">Tajuk<input required maxLength={255} className={input} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} /></label>
                <label className="block text-sm font-medium">Jenis<select className={input} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}><option value="text">Teks</option><option value="poster">Poster</option></select></label>
                {form.data.type === 'poster' && <label className="block text-sm font-medium">Poster (JPG, PNG atau WebP, maksimum 5 MB)<input key={fileKey} type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" onChange={(e) => form.setData('poster', e.target.files[0])} /></label>}
                <label className="block text-sm font-medium">{form.data.type === 'text' ? 'Mesej' : 'Keterangan (pilihan)'}<textarea required={form.data.type === 'text'} rows={5} maxLength={20000} className={input} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} /></label>
                <label className="block text-sm font-medium">Penerima<select className={input} value={form.data.audience} onChange={(e) => form.setData('audience', e.target.value)}><option value="all">Semua pengguna</option><option value="roles">Mengikut peranan (role)</option><option value="users">Pengguna individu / personal</option></select></label>
                {form.data.audience !== 'all' && <fieldset className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Pilih penerima</legend>
                    {form.data.audience === 'users' && <input type="search" aria-label="Cari penerima" placeholder="Cari nama atau e-mel" className={input} value={search} onChange={(e) => setSearch(e.target.value)} />}
                    <div className="mt-2 max-h-60 overflow-y-auto">{(form.data.audience === 'roles' ? roles : users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))).map((entry) => {
                        const field = form.data.audience === 'roles' ? 'role_ids' : 'user_ids';
                        return <label key={entry.id} className="flex items-center gap-3 p-2 text-sm"><input type="checkbox" checked={form.data[field].includes(entry.id)} onChange={() => toggle(field, entry.id)} className="rounded border-slate-300 text-green-700" /><span>{entry.name}{entry.email && <span className="ml-2 text-xs text-slate-500">{entry.email}</span>}</span></label>;
                    })}</div>
                </fieldset>}
                {Object.entries(form.errors).map(([field, error]) => <p key={field} role="alert" className="text-sm text-red-600">{error}</p>)}
                <button type="submit" disabled={form.processing} className="btn-primary">{form.processing ? 'Menghantar…' : 'Hantar pengumuman'}</button>
            </form>
            <section className="rounded-xl border border-green-200 bg-white p-5"><h2 className="font-bold">Senarai pengumuman</h2>
                {!announcements.data.length && <p className="py-6 text-sm text-slate-500">Belum ada pengumuman.</p>}
                {announcements.data.map((item) => <article key={item.id} className="space-y-2 border-b border-slate-100 py-4 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{item.title}</h3><span className="text-xs text-slate-500">{item.is_active ? 'Aktif' : 'Tidak aktif'}</span></div>
                    <p className="text-sm text-slate-500">Penerima: {item.audience === 'all' ? 'Semua pengguna' : (item.audience === 'roles' ? item.roles : item.users).map((entry) => entry.name).join(', ')}</p>
                    {item.poster_url && <a href={item.poster_url} target="_blank" rel="noreferrer" className="text-sm text-green-700 underline">Lihat poster</a>}
                    {item.body && <p className="line-clamp-3 whitespace-pre-wrap text-sm">{item.body}</p>}
                    <div className="flex gap-3"><button type="button" className="btn-ghost" onClick={() => router.put(route('admin.announcements.update', item.id), { is_active: !item.is_active }, { preserveScroll: true })}>{item.is_active ? 'Nyahaktifkan' : 'Aktifkan'}</button><button type="button" className="text-sm text-red-600" onClick={() => { if (confirm('Padam pengumuman ini?')) router.delete(route('admin.announcements.destroy', item.id), { preserveScroll: true }); }}>Padam</button></div>
                </article>)}
                <div className="mt-4 flex gap-2">{announcements.prev_page_url && <Link href={announcements.prev_page_url} className="btn-ghost">Sebelum</Link>}{announcements.next_page_url && <Link href={announcements.next_page_url} className="btn-ghost">Seterusnya</Link>}</div>
            </section>
        </div>
    </AuthenticatedLayout>;
}
