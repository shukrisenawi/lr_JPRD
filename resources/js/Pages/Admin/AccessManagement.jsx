import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        userPlus: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        shield: <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" /><path d="m9 12 2 2 4-4" /></>,
        mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
        lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
        crown: <><path d="m2 6 5 5 5-8 5 8 5-5-3 12H5L2 6Z" /><path d="M5 21h14" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function FieldIcon({ name }) {
    return <Icon name={name} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />;
}

function RoleCard({ role, modules }) {
    const { data, setData, put, processing, errors } = useForm({ name: role.name, access_modules: role.access_modules ?? [] });
    const toggle = (k) => setData('access_modules', data.access_modules.includes(k) ? data.access_modules.filter((i) => i !== k) : [...data.access_modules, k]);
    const submit = (e) => { e.preventDefault(); put(route('admin.access.roles.update', role.id)); };

    return (
        <form onSubmit={submit} className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div><p className="label-section">Group Role</p><h3 className="mt-1 text-xl font-black text-slate-950">{role.name}</h3><p className="mt-1 text-sm font-medium text-slate-500">{role.user_count} pengguna</p></div>
                {role.is_master_admin && <span className="badge-amber">Akses penuh</span>}
            </div>
            <div className="mt-4"><InputLabel htmlFor={`rn-${role.id}`} value="Nama" /><TextInput id={`rn-${role.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} className="input-field mt-1.5" disabled={role.is_master_admin} /><InputError className="mt-1.5" message={errors.name} /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {modules.map((m) => {
                    const checked = data.access_modules.includes(m.key) || role.is_master_admin;
                    return (
                        <label key={m.key} className={`rounded-lg border p-3 transition ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50'} ${role.is_master_admin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                            <div className="flex items-start gap-2.5">
                                <input type="checkbox" checked={checked} onChange={() => toggle(m.key)} disabled={role.is_master_admin} className="mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                <div><p className="text-xs font-bold text-slate-900">{m.label}</p><p className="text-xs text-slate-500">{m.description}</p></div>
                            </div>
                        </label>
                    );
                })}
            </div>
            <InputError className="mt-2" message={errors.access_modules} />
            {!role.is_master_admin && <div className="mt-4 flex justify-end"><PrimaryButton disabled={processing}>{processing ? '...' : 'Simpan'}</PrimaryButton></div>}
        </form>
    );
}

function UserCard({ user, roles, currentUserId }) {
    const [editing, setEditing] = useState(false);
    const isMe = currentUserId === user.id;
    const init = user.name?.charAt(0)?.toUpperCase() ?? '?';
    const { data, setData, put, processing, errors, reset } = useForm({ name: user.name, email: user.email, role_id: user.role?.id ?? '', password: '', password_confirmation: '' });
    const submit = (e) => { e.preventDefault(); put(route('admin.access.users.update', user.id), { onSuccess: () => { reset('password', 'password_confirmation'); setEditing(false); } }); };
    const cancel = () => { setData({ name: user.name, email: user.email, role_id: user.role?.id ?? '', password: '', password_confirmation: '' }); setEditing(false); };
    const del = () => { if (window.confirm(`Padam ${user.name}?`)) router.delete(route('admin.access.users.destroy', user.id), { preserveScroll: true }); };
    const imp = () => { if (window.confirm(`Masuk sebagai ${user.name}?`)) router.post(route('admin.access.users.impersonate', user.id), {}, { replace: true }); };

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="h-16 w-16 rounded-full object-cover ring-4 ring-emerald-50" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-400 text-2xl font-black text-white shadow-sm">{init}</div>}
                    <div><p className="text-lg font-black text-slate-950">{user.name}</p><p className="mt-1 text-sm font-medium text-slate-500">{user.email}</p><span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1 text-xs font-black text-green-700"><Icon name={user.role?.is_master_admin ? 'crown' : 'shield'} className="h-3.5 w-3.5" />{user.role?.name ?? 'Tiada'}</span></div>
                </div>
                <div className="flex flex-wrap gap-3">
                    {user.can_impersonate && <button onClick={imp} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-600 transition hover:bg-amber-50"><Icon name="login" className="h-4 w-4" />Masuk Sebagai</button>}
                    <button onClick={() => setEditing((p) => !p)} className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-bold text-green-700 transition hover:bg-green-50"><Icon name="edit" className="h-4 w-4" />{editing ? 'Tutup' : 'Edit'}</button>
                    {!isMe ? <button onClick={del} className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"><Icon name="trash" className="h-4 w-4" />Padam</button> : <span className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-700 to-green-600 px-4 py-2 text-sm font-bold text-white"><Icon name="user" className="h-4 w-4" />Akaun saya</span>}
                </div>
            </div>
            {editing && (
                <form onSubmit={submit} className="divider mt-4 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><InputLabel htmlFor={`en-${user.id}`} value="Nama" /><TextInput id={`en-${user.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={errors.name} /></div>
                        <div><InputLabel htmlFor={`ee-${user.id}`} value="Email" /><TextInput id={`ee-${user.id}`} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={errors.email} /></div>
                        <div><InputLabel htmlFor={`er-${user.id}`} value="Role" /><select id={`er-${user.id}`} value={data.role_id} onChange={(e) => setData('role_id', e.target.value)} className="input-field mt-1.5">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><InputError className="mt-1.5" message={errors.role_id} /></div>
                        <div><InputLabel htmlFor={`ep-${user.id}`} value="Password" /><TextInput id={`ep-${user.id}`} type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={errors.password} /></div>
                        <div className="sm:col-span-2"><InputLabel htmlFor={`epc-${user.id}`} value="Sahkan Password" /><TextInput id={`epc-${user.id}`} type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} className="input-field mt-1.5" /></div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2"><button onClick={cancel} className="btn-ghost">Batal</button><PrimaryButton disabled={processing}>{processing ? '...' : 'Simpan'}</PrimaryButton></div>
                </form>
            )}
        </div>
    );
}

export default function AccessManagement({ roles, users, modules }) {
    const { auth } = usePage().props;
    const myId = auth.user?.id ?? null;
    const [tab, setTab] = useState('cipta-pengguna');
    const uf = useForm({ name: '', email: '', password: '', password_confirmation: '', role_id: roles.find((r) => !r.is_master_admin)?.id ?? roles[0]?.id ?? '' });
    const rf = useForm({ name: '', access_modules: [] });
    const tu = (e) => { e.preventDefault(); uf.post(route('admin.access.users.store'), { onSuccess: () => uf.reset('name', 'email', 'password', 'password_confirmation') }); };
    const tr = (e) => { e.preventDefault(); rf.post(route('admin.access.roles.store'), { onSuccess: () => rf.reset() }); };

    const tabs = [
        { key: 'cipta-pengguna', label: 'Cipta Pengguna', desc: 'Tambah user baru.', icon: 'userPlus' },
        { key: 'group-role-baharu', label: 'Group Role Baru', desc: 'Cipta role baru.', icon: 'users' },
        { key: 'group-role', label: 'Group Role', desc: 'Kemaskini akses modul.', icon: 'shield' },
    ];

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Master Admin</p><h2 className="mt-0.5 heading-lg">Pengurusan Pengguna & Role</h2><p className="text-muted mt-0.5">Urus akses pengguna dan modul.</p></div>
        }>
            <Head title="Akses Pengguna" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="grid gap-4 sm:grid-cols-3">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-4 rounded-lg border px-5 py-5 text-left shadow-sm transition ${tab === t.key ? 'border-green-600 bg-gradient-to-r from-green-700 to-green-500 text-white shadow-green-900/10' : 'border-emerald-100 bg-white text-slate-700 hover:border-green-200 hover:bg-green-50/60'}`}>
                                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${tab === t.key ? 'bg-white/90 text-green-700' : 'bg-green-50 text-green-700'}`}><Icon name={t.icon} className="h-7 w-7" /></span>
                                <span><span className={`block text-xs font-black uppercase tracking-[0.12em] ${tab === t.key ? 'text-white' : 'text-slate-900'}`}>{t.label}</span><span className={`mt-1 block text-sm font-medium ${tab === t.key ? 'text-green-50' : 'text-slate-500'}`}>{t.desc}</span></span>
                            </button>
                        ))}
                </div>

                {tab === 'cipta-pengguna' && (
                    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <form onSubmit={tu} className="card p-5 sm:p-6">
                            <p className="label-section">Cipta Pengguna</p>
                            <h3 className="mt-1 text-2xl font-black text-slate-950">Tambah user baru</h3>
                            <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                <div><InputLabel htmlFor="un" value="Nama" /><div className="relative mt-1.5"><FieldIcon name="user" /><TextInput id="un" value={uf.data.name} onChange={(e) => uf.setData('name', e.target.value)} className="input-field pl-10" placeholder="Masukkan nama" /></div><InputError className="mt-1.5" message={uf.errors.name} /></div>
                                <div><InputLabel htmlFor="ue" value="Email" /><div className="relative mt-1.5"><FieldIcon name="mail" /><TextInput id="ue" type="email" value={uf.data.email} onChange={(e) => uf.setData('email', e.target.value)} className="input-field pl-10" placeholder="Masukkan email" /></div><InputError className="mt-1.5" message={uf.errors.email} /></div>
                                <div><InputLabel htmlFor="up" value="Password" /><div className="relative mt-1.5"><FieldIcon name="lock" /><TextInput id="up" type="password" value={uf.data.password} onChange={(e) => uf.setData('password', e.target.value)} className="input-field pl-10" placeholder="Masukkan password" /></div><InputError className="mt-1.5" message={uf.errors.password} /></div>
                                <div><InputLabel htmlFor="upc" value="Sahkan Password" /><div className="relative mt-1.5"><FieldIcon name="lock" /><TextInput id="upc" type="password" value={uf.data.password_confirmation} onChange={(e) => uf.setData('password_confirmation', e.target.value)} className="input-field pl-10" placeholder="Sahkan password" /></div></div>
                            </div>
                            <div className="mt-5"><InputLabel htmlFor="ur" value="Role" /><div className="relative mt-1.5"><FieldIcon name="shield" /><select id="ur" value={uf.data.role_id} onChange={(e) => uf.setData('role_id', e.target.value)} className="input-field pl-10">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div><InputError className="mt-1.5" message={uf.errors.role_id} /></div>
                            <div className="mt-5 flex justify-end"><PrimaryButton disabled={uf.processing} className="px-5 py-2.5">{uf.processing ? '...' : 'Cipta'}</PrimaryButton></div>
                        </form>
                        <div className="card p-5 sm:p-6">
                            <p className="label-section">Pengguna</p>
                            <h3 className="mt-1 text-2xl font-black text-slate-950">Akaun sedia ada</h3>
                            <div className="mt-5 space-y-4">{users.map((u) => <UserCard key={u.id} user={u} roles={roles} currentUserId={myId} />)}</div>
                        </div>
                    </section>
                )}

                {tab === 'group-role-baharu' && (
                    <section className="card p-5 sm:p-6">
                        <form onSubmit={tr}>
                            <p className="label-section">Role Baru</p>
                            <h3 className="mt-0.5 heading-md">Cipta group role</h3>
                            <div className="mt-4"><InputLabel htmlFor="rn" value="Nama" /><TextInput id="rn" value={rf.data.name} onChange={(e) => rf.setData('name', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={rf.errors.name} /></div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {modules.map((m) => {
                                    const checked = rf.data.access_modules.includes(m.key);
                                    return (
                                        <label key={m.key} className={`cursor-pointer rounded-lg border p-3 transition ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50'}`}>
                                            <div className="flex items-start gap-2.5">
                                                <input type="checkbox" checked={checked} onChange={() => rf.setData('access_modules', rf.data.access_modules.includes(m.key) ? rf.data.access_modules.filter((i) => i !== m.key) : [...rf.data.access_modules, m.key])} className="mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                                <div><p className="text-xs font-bold text-slate-900">{m.label}</p><p className="text-xs text-slate-500">{m.description}</p></div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError className="mt-2" message={rf.errors.access_modules} />
                            <div className="mt-4 flex justify-end"><PrimaryButton disabled={rf.processing}>{rf.processing ? '...' : 'Cipta'}</PrimaryButton></div>
                        </form>
                    </section>
                )}

                {tab === 'group-role' && <section className="space-y-4">{roles.map((r) => <RoleCard key={r.id} role={r} modules={modules} />)}</section>}
            </div>
        </AuthenticatedLayout>
    );
}
