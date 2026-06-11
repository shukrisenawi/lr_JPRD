import AvatarLightbox from '@/Components/AvatarLightbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function Icon({ name, className = 'h-4 w-4' }) {
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
        clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
        mapPin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function FieldIcon({ name }) {
    return <Icon name={name} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />;
}

function toggleModule(data, setData, mod) {
    if (mod.children?.length) {
        const allChildKeys = mod.children.map(c => c.key);
        const anyChildChecked = allChildKeys.some(k => data.access_modules.includes(k));
        setData('access_modules', anyChildChecked
            ? data.access_modules.filter(k => !allChildKeys.includes(k))
            : [...data.access_modules, ...allChildKeys.filter(k => !data.access_modules.includes(k))]
        );
    } else {
        setData('access_modules', data.access_modules.includes(mod.key)
            ? data.access_modules.filter(i => i !== mod.key)
            : [...data.access_modules, mod.key]);
    }
}

function ModuleCheckbox({ m, data, setData, disabled }) {
    if (m.children?.length) {
        const anyChildChecked = m.children.some(c => data.access_modules.includes(c.key)) || disabled;
        return (
            <div key={m.key} className={`rounded-md border transition ${anyChildChecked ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}>
                <label className={`flex items-center gap-2 p-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={anyChildChecked} onChange={() => toggleModule(data, setData, m)} disabled={disabled} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                    <p className="text-xs font-bold text-slate-900">{m.label}</p>
                </label>
                {anyChildChecked && (
                    <div className="space-y-1 px-2 pb-2">
                        {m.children.map(c => {
                            const childChecked = data.access_modules.includes(c.key) || disabled;
                            return (
                                <label key={c.key} className={`flex items-center gap-2 rounded-md border p-1.5 transition ${childChecked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                    <input type="checkbox" checked={childChecked} onChange={() => toggleModule(data, setData, c)} disabled={disabled} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                    <p className="text-xs font-bold text-slate-900">{c.label}</p>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    const checked = data.access_modules.includes(m.key) || disabled;
    return (
        <label key={m.key} className={`rounded-md border p-2 transition ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50'} ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
            <div className="flex items-center gap-2">
                <input type="checkbox" checked={checked} onChange={() => toggleModule(data, setData, m)} disabled={disabled} className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                <p className="text-xs font-bold text-slate-900">{m.label}</p>
            </div>
        </label>
    );
}

function RoleCard({ role, modules }) {
    const { data, setData, put, processing, errors } = useForm({ name: role.name, access_modules: role.access_modules ?? [] });
    const submit = (e) => { e.preventDefault(); put(route('admin.access.roles.update', role.id)); };

    return (
        <form onSubmit={submit} className="card p-3">
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Group Role</p><h3 className="mt-0.5 text-sm font-bold text-slate-950">{role.name}</h3><p className="text-xs text-slate-500">{role.user_count} pengguna</p></div>
                {role.is_master_admin && <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">Akses penuh</span>}
            </div>
            <div className="mt-3"><InputLabel htmlFor={`rn-${role.id}`} value="Nama" /><TextInput id={`rn-${role.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} className="input-field mt-1" disabled={role.is_master_admin} /><InputError className="mt-1" message={errors.name} /></div>
            <div className="mt-3 grid gap-1.5 grid-cols-2">
                {modules.map((m) => <ModuleCheckbox key={m.key} m={m} data={data} setData={setData} disabled={role.is_master_admin} />)}
            </div>
            <InputError className="mt-1.5" message={errors.access_modules} />
            {!role.is_master_admin && <div className="mt-3 flex justify-end"><PrimaryButton disabled={processing} className="px-4 py-1.5 text-xs">{processing ? '...' : 'Simpan'}</PrimaryButton></div>}
        </form>
    );
}

function ScopeDisplay({ accessLevel, scopeKey, udms, cawangans }) {
    if (accessLevel === 'jprd' || !scopeKey) {
        return <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"><Icon name="shield" className="h-3 w-3" />JPRD</span>;
    }
    if (accessLevel === 'udm') {
        return <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700"><Icon name="mapPin" className="h-3 w-3" />UDM: {scopeKey}</span>;
    }
    const caw = cawangans.find(c => c.key === scopeKey);
    const label = caw ? `${caw.name} (${caw.dm})` : scopeKey;
    return <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700"><Icon name="mapPin" className="h-3 w-3" />Cawangan: {label}</span>;
}

function ScopeSelect({ data, setData, errors, udms, cawangans, prefix = '' }) {
    const level = data.access_level ?? 'jprd';
    const scopeKey = data.scope_key ?? '';

    const handleLevelChange = (value) => {
        setData('access_level', value);
        setData('scope_key', value === 'jprd' ? '' : '');
    };

    return (
        <>
            <div>
                <InputLabel htmlFor={`${prefix}al`} value="Peringkat Akses" />
                <div className="relative mt-1">
                    <FieldIcon name="shield" />
                    <select id={`${prefix}al`} value={level} onChange={(e) => handleLevelChange(e.target.value)} className="input-field pl-10">
                        <option value="jprd">JPRD (Semua Data)</option>
                        <option value="udm">UDM</option>
                        <option value="cawangan">Cawangan</option>
                    </select>
                </div>
                <InputError className="mt-1" message={errors.access_level} />
            </div>
            {level === 'udm' && (
                <div>
                    <InputLabel htmlFor={`${prefix}sk`} value="Pilih UDM" />
                    <div className="relative mt-1">
                        <FieldIcon name="mapPin" />
                        <select id={`${prefix}sk`} value={scopeKey} onChange={(e) => setData('scope_key', e.target.value)} className="input-field pl-10">
                            <option value="">-- Pilih UDM --</option>
                            {udms.map((dm) => <option key={dm} value={dm}>{dm}</option>)}
                        </select>
                    </div>
                    <InputError className="mt-1" message={errors.scope_key} />
                </div>
            )}
            {level === 'cawangan' && (
                <div>
                    <InputLabel htmlFor={`${prefix}sk`} value="Pilih Cawangan" />
                    <div className="relative mt-1">
                        <FieldIcon name="mapPin" />
                        <select id={`${prefix}sk`} value={scopeKey} onChange={(e) => setData('scope_key', e.target.value)} className="input-field pl-10">
                            <option value="">-- Pilih Cawangan --</option>
                            {cawangans.map((c) => <option key={c.key} value={c.key}>{c.name} ({c.dm})</option>)}
                        </select>
                    </div>
                    <InputError className="mt-1" message={errors.scope_key} />
                </div>
            )}
        </>
    );
}

function UserCard({ user, roles, currentUserId, udms, cawangans }) {
    const [editing, setEditing] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const isMe = currentUserId === user.id;
    const init = user.name?.charAt(0)?.toUpperCase() ?? '?';
    const fmtDate = (d) => d ? d.split('-').reverse().join('/') : '';
    const isExpired = user.expires_at && new Date(user.expires_at) < new Date(new Date().toDateString());
    const { data, setData, put, processing, errors, reset } = useForm({
        name: user.name,
        email: user.email,
        role_id: user.role?.id ?? '',
        access_level: user.access_level ?? 'jprd',
        scope_key: user.scope_key ?? '',
        password: '',
        password_confirmation: '',
        expires_at: user.expires_at ?? ''
    });
    const submit = (e) => { e.preventDefault(); put(route('admin.access.users.update', user.id), { onSuccess: () => { reset('password', 'password_confirmation'); setEditing(false); } }); };
    const cancel = () => {
        setData({
            name: user.name,
            email: user.email,
            role_id: user.role?.id ?? '',
            access_level: user.access_level ?? 'jprd',
            scope_key: user.scope_key ?? '',
            password: '',
            password_confirmation: '',
            expires_at: user.expires_at ?? ''
        });
        setEditing(false);
    };
    const del = () => { if (window.confirm(`Padam ${user.name}?`)) router.delete(route('admin.access.users.destroy', user.id), { preserveScroll: true }); };
    const imp = () => { if (window.confirm(`Masuk sebagai ${user.name}?`)) router.post(route('admin.access.users.impersonate', user.id), {}, { replace: true }); };
    const resetPw = () => { if (window.confirm(`Reset kata laluan ${user.name} kepada 123?`)) router.post(route('admin.access.users.reset-password', user.id), {}, { preserveScroll: true }); };

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    {user.avatar_url ? <img src={user.avatar_url} alt={user.name} className="h-10 w-10 cursor-pointer rounded-full object-cover ring-2 ring-emerald-50" onClick={() => setLightboxSrc(user.avatar_url)} /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-400 text-sm font-black text-white shadow-sm">{init}</div>}
                    {lightboxSrc && <AvatarLightbox src={lightboxSrc} alt={user.name} onClose={() => setLightboxSrc(null)} />}
                    <div>
                        <p className="text-sm font-bold text-slate-950">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700"><Icon name={user.role?.is_master_admin ? 'crown' : 'shield'} className="h-3 w-3" />{user.role?.name ?? 'Tiada'}</span>
                        <ScopeDisplay accessLevel={user.access_level} scopeKey={user.scope_key} udms={udms} cawangans={cawangans} />
                        {user.expires_at && <span className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><Icon name="clock" className="h-3 w-3" />{isExpired ? 'Luput' : fmtDate(user.expires_at)}</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {user.can_impersonate && <button onClick={imp} title="Masuk sebagai" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-300 bg-white text-amber-600 transition hover:bg-amber-50"><Icon name="login" className="h-3.5 w-3.5" /></button>}
                    {!isMe && <button onClick={resetPw} title="Reset kata laluan kepada 123" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-sky-300 bg-white text-sky-600 transition hover:bg-sky-50"><Icon name="lock" className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => setEditing((p) => !p)} title={editing ? 'Tutup' : 'Edit'} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-green-300 bg-white text-green-700 transition hover:bg-green-50"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                    {!isMe ? <button onClick={del} title="Padam" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-300 bg-white text-red-600 transition hover:bg-red-50"><Icon name="trash" className="h-3.5 w-3.5" /></button> : <span title="Akaun saya" className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-green-700 to-green-600 text-white"><Icon name="user" className="h-3.5 w-3.5" /></span>}
                </div>
            </div>
            {editing && (
                <form onSubmit={submit} className="mt-3 border-t border-slate-200 pt-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div><InputLabel htmlFor={`en-${user.id}`} value="Nama" /><TextInput id={`en-${user.id}`} value={data.name} onChange={(e) => setData('name', e.target.value)} className="input-field mt-1" /><InputError className="mt-1" message={errors.name} /></div>
                        <div><InputLabel htmlFor={`ee-${user.id}`} value="Email" /><TextInput id={`ee-${user.id}`} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="input-field mt-1" /><InputError className="mt-1" message={errors.email} /></div>
                        <div><InputLabel htmlFor={`er-${user.id}`} value="Role" /><select id={`er-${user.id}`} value={data.role_id} onChange={(e) => setData('role_id', e.target.value)} className="input-field mt-1">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><InputError className="mt-1" message={errors.role_id} /></div>
                        <ScopeSelect data={data} setData={setData} errors={errors} udms={udms} cawangans={cawangans} prefix={`eu-${user.id}-`} />
                        <div><InputLabel htmlFor={`ep-${user.id}`} value="Password" /><TextInput id={`ep-${user.id}`} type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} className="input-field mt-1" /><InputError className="mt-1" message={errors.password} /></div>
                        <div><InputLabel htmlFor={`epc-${user.id}`} value="Sahkan Password" /><TextInput id={`epc-${user.id}`} type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} className="input-field mt-1" /></div>
                        <div><InputLabel htmlFor={`eea-${user.id}`} value="Akaun Luput Pada (optional)" /><TextInput id={`eea-${user.id}`} type="date" value={data.expires_at} onChange={(e) => setData('expires_at', e.target.value)} className="input-field mt-1" /><InputError className="mt-1" message={errors.expires_at} /></div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2"><button onClick={cancel} className="btn-ghost text-xs">Batal</button><PrimaryButton disabled={processing} className="px-4 py-1.5 text-xs">{processing ? '...' : 'Simpan'}</PrimaryButton></div>
                </form>
            )}
        </div>
    );
}

const levelMeta = {
    jprd: { label: 'JPRD', bg: 'bg-green-100', text: 'text-green-700' },
    udm: { label: 'UDM', bg: 'bg-sky-100', text: 'text-sky-700' },
    cawangan: { label: 'Cawangan', bg: 'bg-purple-100', text: 'text-purple-700' },
};

const levelOrder = ['jprd', 'udm', 'cawangan'];

export default function AccessManagement({ roles, users, modules, udms, cawangans }) {
    const { auth } = usePage().props;
    const myId = auth.user?.id ?? null;
    const [tab, setTab] = useState('cipta-pengguna');

    const groupedUsers = useMemo(() => {
        const groups = {};
        users.forEach((u) => {
            const lvl = u.access_level ?? 'jprd';
            if (!groups[lvl]) groups[lvl] = [];
            groups[lvl].push(u);
        });
        return groups;
    }, [users]);
    const uf = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: roles.find((r) => !r.is_master_admin)?.id ?? roles[0]?.id ?? '',
        access_level: 'jprd',
        scope_key: '',
        expires_at: ''
    });
    const rf = useForm({ name: '', access_modules: [] });
    const tu = (e) => { e.preventDefault(); uf.post(route('admin.access.users.store'), { onSuccess: () => uf.reset('name', 'email', 'password', 'password_confirmation', 'expires_at') }); };
    const tr = (e) => { e.preventDefault(); rf.post(route('admin.access.roles.store'), { onSuccess: () => rf.reset() }); };

    const tabs = [
        { key: 'cipta-pengguna', label: 'Cipta Pengguna', desc: 'Tambah user baru.', icon: 'userPlus' },
        { key: 'group-role-baharu', label: 'Group Role Baru', desc: 'Cipta role baru.', icon: 'users' },
        { key: 'group-role', label: 'Group Role', desc: 'Kemaskini akses modul.', icon: 'shield' },
    ];

    return (
        <AuthenticatedLayout header={
            <div><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Master Admin</p><h2 className="mt-0.5 text-lg font-bold text-slate-950">Pengurusan Pengguna & Role</h2><p className="mt-0.5 text-xs text-slate-500">Urus akses pengguna dan modul.</p></div>
        }>
            <Head title="Akses Pengguna" />
            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="grid gap-2 sm:grid-cols-3">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left shadow-sm transition ${tab === t.key ? 'border-transparent bg-gradient-to-r from-green-700 to-green-500 text-white shadow-green-900/10' : 'border-emerald-100 bg-white text-slate-700 hover:border-green-200 hover:bg-green-50/60'}`}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tab === t.key ? 'bg-white/90 text-green-700' : 'bg-green-50 text-green-700'}`}><Icon name={t.icon} className="h-5 w-5" /></span>
                                <span><span className={`block text-xs font-bold ${tab === t.key ? 'text-white' : 'text-slate-900'}`}>{t.label}</span><span className={`mt-0.5 block text-xs ${tab === t.key ? 'text-green-50' : 'text-slate-500'}`}>{t.desc}</span></span>
                            </button>
                        ))}
                </div>

                {tab === 'cipta-pengguna' && (
                    <section className="space-y-3">
                        <form onSubmit={tu} className="card p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Cipta Pengguna</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-950">Tambah user baru</h3>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div><InputLabel htmlFor="un" value="Nama" /><div className="relative mt-1"><FieldIcon name="user" /><TextInput id="un" value={uf.data.name} onChange={(e) => uf.setData('name', e.target.value)} className="input-field pl-10" placeholder="Masukkan nama" /></div><InputError className="mt-1" message={uf.errors.name} /></div>
                                <div><InputLabel htmlFor="ue" value="Email" /><div className="relative mt-1"><FieldIcon name="mail" /><TextInput id="ue" type="email" value={uf.data.email} onChange={(e) => uf.setData('email', e.target.value)} className="input-field pl-10" placeholder="Masukkan email" /></div><InputError className="mt-1" message={uf.errors.email} /></div>
                                <div><InputLabel htmlFor="up" value="Password" /><div className="relative mt-1"><FieldIcon name="lock" /><TextInput id="up" type="password" value={uf.data.password} onChange={(e) => uf.setData('password', e.target.value)} className="input-field pl-10" placeholder="Masukkan password" /></div><InputError className="mt-1" message={uf.errors.password} /></div>
                                <div><InputLabel htmlFor="upc" value="Sahkan Password" /><div className="relative mt-1"><FieldIcon name="lock" /><TextInput id="upc" type="password" value={uf.data.password_confirmation} onChange={(e) => uf.setData('password_confirmation', e.target.value)} className="input-field pl-10" placeholder="Sahkan password" /></div></div>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div><InputLabel htmlFor="ur" value="Role" /><div className="relative mt-1"><FieldIcon name="shield" /><select id="ur" value={uf.data.role_id} onChange={(e) => uf.setData('role_id', e.target.value)} className="input-field pl-10">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div><InputError className="mt-1" message={uf.errors.role_id} /></div>
                                <ScopeSelect data={uf.data} setData={uf.setData} errors={uf.errors} udms={udms} cawangans={cawangans} prefix="u-" />
                            </div>
                            <div className="mt-3"><InputLabel htmlFor="uea" value="Akaun Luput Pada (optional)" /><div className="relative mt-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg><TextInput id="uea" type="date" value={uf.data.expires_at} onChange={(e) => uf.setData('expires_at', e.target.value)} className="input-field pl-10" /></div><InputError className="mt-1" message={uf.errors.expires_at} /></div>
                            <div className="mt-3 flex justify-center"><PrimaryButton disabled={uf.processing} className="px-4 py-1.5 text-xs">{uf.processing ? '...' : 'Cipta'}</PrimaryButton></div>
                        </form>
                        <div className="card p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Pengguna</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-950">Akaun sedia ada</h3>
                            <div className="mt-3 space-y-4">
                                {levelOrder.map((lvl) => {
                                    const list = groupedUsers[lvl];
                                    if (!list?.length) return null;
                                    const meta = levelMeta[lvl];
                                    return (
                                        <div key={lvl}>
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className={'inline-block rounded-md px-2 py-0.5 text-xs font-bold ' + meta.bg + ' ' + meta.text}>{meta.label}</span>
                                                <span className="text-xs text-slate-400">({list.length} pengguna)</span>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {list.map((u) => <UserCard key={u.id} user={u} roles={roles} currentUserId={myId} udms={udms} cawangans={cawangans} />)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {tab === 'group-role-baharu' && (
                    <section className="card p-3">
                        <form onSubmit={tr}>
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Role Baru</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-950">Cipta group role</h3>
                            <div className="mt-3"><InputLabel htmlFor="rn" value="Nama" /><TextInput id="rn" value={rf.data.name} onChange={(e) => rf.setData('name', e.target.value)} className="input-field mt-1" /><InputError className="mt-1" message={rf.errors.name} /></div>
                            <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                {modules.map((m) => <ModuleCheckbox key={m.key} m={m} data={rf.data} setData={rf.setData} disabled={false} />)}
                            </div>
                            <InputError className="mt-1.5" message={rf.errors.access_modules} />
                            <div className="mt-3 flex justify-end"><PrimaryButton disabled={rf.processing} className="px-4 py-1.5 text-xs">{rf.processing ? '...' : 'Cipta'}</PrimaryButton></div>
                        </form>
                    </section>
                )}

                {tab === 'group-role' && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{roles.map((r) => <RoleCard key={r.id} role={r} modules={modules} />)}</section>}
            </div>
        </AuthenticatedLayout>
    );
}
