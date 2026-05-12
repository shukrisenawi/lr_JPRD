import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function RoleCard({ role, modules }) {
    const { data, setData, put, processing, errors } = useForm({ name: role.name, access_modules: role.access_modules ?? [] });
    const toggle = (k) => setData('access_modules', data.access_modules.includes(k) ? data.access_modules.filter((i) => i !== k) : [...data.access_modules, k]);
    const submit = (e) => { e.preventDefault(); put(route('admin.access.roles.update', role.id)); };

    return (
        <form onSubmit={submit} className="card p-5">
            <div className="flex items-start justify-between gap-3">
                <div><p className="label-section">Group Role</p><h3 className="mt-0.5 heading-md">{role.name}</h3><p className="text-xs text-slate-400">{role.user_count} pengguna</p></div>
                {role.is_master_admin && <span className="badge-amber">Akses penuh</span>}
            </div>
            <div className="mt-4"><InputLabel htmlFor={`rn-${role.id}`} value="Nama" /><TextInput id={`rn-${role.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} className="input-field mt-1.5" disabled={role.is_master_admin} /><InputError className="mt-1.5" message={errors.name} /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {modules.map((m) => {
                    const checked = data.access_modules.includes(m.key) || role.is_master_admin;
                    return (
                        <label key={m.key} className={`rounded-lg border p-3 transition ${checked ? 'border-violet-500/40 bg-violet-500/10' : 'border-slate-700 bg-slate-800/60'} ${role.is_master_admin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                            <div className="flex items-start gap-2.5">
                                <input type="checkbox" checked={checked} onChange={() => toggle(m.key)} disabled={role.is_master_admin} className="mt-0.5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500" />
                                <div><p className="text-xs font-bold text-white">{m.label}</p><p className="text-[10px] text-slate-400">{m.description}</p></div>
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
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                    {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">{init}</div>}
                    <div><p className="text-sm font-bold text-white">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p><span className="badge-violet mt-1.5 inline-block">{user.role?.name ?? 'Tiada'}</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {user.can_impersonate && <button onClick={imp} className="btn-amber px-2.5 py-1.5 text-[10px]">Masuk Sebagai</button>}
                    <button onClick={() => setEditing((p) => !p)} className="btn-ghost px-2.5 py-1.5 text-[10px]">{editing ? 'Tutup' : 'Edit'}</button>
                    {!isMe ? <button onClick={del} className="btn-danger px-2.5 py-1.5 text-[10px]">Padam</button> : <span className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[10px] font-bold text-slate-400">Akaun saya</span>}
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
        { key: 'cipta-pengguna', label: 'Cipta Pengguna', desc: 'Tambah user baru.' },
        { key: 'group-role-baharu', label: 'Group Role Baru', desc: 'Cipta role baru.' },
        { key: 'group-role', label: 'Group Role', desc: 'Kemaskini akses modul.' },
    ];

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Master Admin</p><h2 className="mt-0.5 heading-lg">Pengurusan Pengguna & Role</h2><p className="text-muted mt-0.5">Urus akses pengguna dan modul.</p></div>
        }>
            <Head title="Akses Pengguna" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="card p-1.5">
                    <div className="grid gap-1.5 sm:grid-cols-3">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg border px-3 py-2.5 text-left transition ${tab === t.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
                                <p className="label-section">{t.label}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {tab === 'cipta-pengguna' && (
                    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <form onSubmit={tu} className="card p-5">
                            <p className="label-section">Cipta Pengguna</p>
                            <h3 className="mt-0.5 heading-md">Tambah user baru</h3>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div><InputLabel htmlFor="un" value="Nama" /><TextInput id="un" value={uf.data.name} onChange={(e) => uf.setData('name', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={uf.errors.name} /></div>
                                <div><InputLabel htmlFor="ue" value="Email" /><TextInput id="ue" type="email" value={uf.data.email} onChange={(e) => uf.setData('email', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={uf.errors.email} /></div>
                                <div><InputLabel htmlFor="up" value="Password" /><TextInput id="up" type="password" value={uf.data.password} onChange={(e) => uf.setData('password', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={uf.errors.password} /></div>
                                <div><InputLabel htmlFor="upc" value="Sahkan Password" /><TextInput id="upc" type="password" value={uf.data.password_confirmation} onChange={(e) => uf.setData('password_confirmation', e.target.value)} className="input-field mt-1.5" /></div>
                            </div>
                            <div className="mt-4"><InputLabel htmlFor="ur" value="Role" /><select id="ur" value={uf.data.role_id} onChange={(e) => uf.setData('role_id', e.target.value)} className="input-field mt-1.5">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><InputError className="mt-1.5" message={uf.errors.role_id} /></div>
                            <div className="mt-4 flex justify-end"><PrimaryButton disabled={uf.processing}>{uf.processing ? '...' : 'Cipta'}</PrimaryButton></div>
                        </form>
                        <div className="card p-5">
                            <p className="label-section">Pengguna</p>
                            <h3 className="mt-0.5 heading-md">Akaun sedia ada</h3>
                            <div className="mt-4 space-y-2">{users.map((u) => <UserCard key={u.id} user={u} roles={roles} currentUserId={myId} />)}</div>
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
                                        <label key={m.key} className={`cursor-pointer rounded-lg border p-3 transition ${checked ? 'border-violet-500/40 bg-violet-500/10' : 'border-slate-700 bg-slate-800/60'}`}>
                                            <div className="flex items-start gap-2.5">
                                                <input type="checkbox" checked={checked} onChange={() => rf.setData('access_modules', rf.data.access_modules.includes(m.key) ? rf.data.access_modules.filter((i) => i !== m.key) : [...rf.data.access_modules, m.key])} className="mt-0.5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500" />
                                                <div><p className="text-xs font-bold text-white">{m.label}</p><p className="text-[10px] text-slate-400">{m.description}</p></div>
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
