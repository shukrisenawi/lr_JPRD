import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function RoleCard({ role, modules }) {
    const { data, setData, put, processing, errors } = useForm({
        name: role.name,
        access_modules: role.access_modules ?? [],
    });

    const toggleModule = (moduleKey) => {
        const nextModules = data.access_modules.includes(moduleKey)
            ? data.access_modules.filter((item) => item !== moduleKey)
            : [...data.access_modules, moduleKey];

        setData('access_modules', nextModules);
    };

    const submit = (event) => {
        event.preventDefault();
        put(route('admin.access.roles.update', role.id));
    };

    return (
        <form
            onSubmit={submit}
            className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                        Group Role
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{role.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        {role.user_count} pengguna dalam group ini.
                    </p>
                </div>
                {role.is_master_admin && (
                    <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Akses penuh
                    </span>
                )}
            </div>

            <div className="mt-6">
                <InputLabel htmlFor={`role-name-${role.id}`} value="Nama group role" />
                <TextInput
                    id={`role-name-${role.id}`}
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                    disabled={role.is_master_admin}
                />
                <InputError className="mt-2" message={errors.name} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
                {modules.map((module) => {
                    const checked = data.access_modules.includes(module.key) || role.is_master_admin;

                    return (
                        <label
                            key={module.key}
                            className={`rounded-3xl border p-4 transition ${
                                checked
                                    ? 'border-cyan-300 bg-cyan-50'
                                    : 'border-slate-200 bg-slate-50'
                            } ${role.is_master_admin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleModule(module.key)}
                                    disabled={role.is_master_admin}
                                    className="mt-1 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{module.label}</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        {module.description}
                                    </p>
                                </div>
                            </div>
                        </label>
                    );
                })}
            </div>

            <InputError className="mt-2" message={errors.access_modules} />

            {!role.is_master_admin && (
                <div className="mt-6 flex justify-end">
                    <PrimaryButton
                        className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                        disabled={processing}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan akses modul'}
                    </PrimaryButton>
                </div>
            )}
        </form>
    );
}

function UserCard({ user, roles, currentUserId }) {
    const [isEditing, setIsEditing] = useState(false);
    const isCurrentUser = currentUserId === user.id;
    const userInitial = user.name?.charAt(0)?.toUpperCase() ?? '?';
    const { data, setData, put, processing, errors, reset } = useForm({
        name: user.name,
        email: user.email,
        role_id: user.role?.id ?? '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();
        put(route('admin.access.users.update', user.id), {
            onSuccess: () => {
                reset('password', 'password_confirmation');
                setIsEditing(false);
            },
        });
    };

    const cancelEdit = () => {
        setData({
            name: user.name,
            email: user.email,
            role_id: user.role?.id ?? '',
            password: '',
            password_confirmation: '',
        });
        setIsEditing(false);
    };

    const deleteUser = () => {
        if (!window.confirm(`Padam pengguna ${user.name}?`)) {
            return;
        }

        router.delete(route('admin.access.users.destroy', user.id), {
            preserveScroll: true,
        });
    };

    const impersonateUser = () => {
        if (!window.confirm(`Masuk sebagai ${user.name}? Anda boleh kembali semula sebagai master admin kemudian.`)) {
            return;
        }

        router.post(route('admin.access.users.impersonate', user.id));
    };

    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-14 w-14 rounded-2xl object-cover"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-lg font-semibold text-white">
                            {userInitial}
                        </div>
                    )}

                    <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                {user.role?.name ?? 'Tiada role'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {user.can_impersonate && (
                        <button
                            type="button"
                            onClick={impersonateUser}
                            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                        >
                            Masuk Sebagai User
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsEditing((previous) => !previous)}
                        className="rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                    >
                        {isEditing ? 'Tutup edit' : 'Edit'}
                    </button>
                    {!isCurrentUser ? (
                        <button
                            type="button"
                            onClick={deleteUser}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                            Padam
                        </button>
                    ) : (
                        <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                            Akaun semasa
                        </span>
                    )}
                </div>
            </div>

            {isEditing && (
                <form onSubmit={submit} className="mt-5 border-t border-slate-200 pt-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <InputLabel htmlFor={`edit-name-${user.id}`} value="Nama pengguna" />
                            <TextInput
                                id={`edit-name-${user.id}`}
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            />
                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div>
                            <InputLabel htmlFor={`edit-email-${user.id}`} value="Email login" />
                            <TextInput
                                id={`edit-email-${user.id}`}
                                type="email"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            />
                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div>
                            <InputLabel htmlFor={`edit-role-${user.id}`} value="Group role" />
                            <select
                                id={`edit-role-${user.id}`}
                                value={data.role_id}
                                onChange={(event) => setData('role_id', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            <InputError className="mt-2" message={errors.role_id} />
                        </div>

                        <div>
                            <InputLabel htmlFor={`edit-password-${user.id}`} value="Kata laluan baru" />
                            <TextInput
                                id={`edit-password-${user.id}`}
                                type="password"
                                value={data.password}
                                onChange={(event) => setData('password', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            />
                            <InputError className="mt-2" message={errors.password} />
                        </div>

                        <div className="md:col-span-2">
                            <InputLabel
                                htmlFor={`edit-password-confirmation-${user.id}`}
                                value="Sahkan kata laluan baru"
                            />
                            <TextInput
                                id={`edit-password-confirmation-${user.id}`}
                                type="password"
                                value={data.password_confirmation}
                                onChange={(event) => setData('password_confirmation', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <PrimaryButton
                            className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                            disabled={processing}
                        >
                            {processing ? 'Menyimpan...' : 'Simpan perubahan'}
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function AccessManagement({ roles, users, modules }) {
    const { auth } = usePage().props;
    const currentUserId = auth.user?.id ?? null;
    const [activeTab, setActiveTab] = useState('cipta-pengguna');
    const userForm = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: roles.find((role) => !role.is_master_admin)?.id ?? roles[0]?.id ?? '',
    });

    const roleForm = useForm({
        name: '',
        access_modules: [],
    });

    const submitUser = (event) => {
        event.preventDefault();
        userForm.post(route('admin.access.users.store'), {
            onSuccess: () => userForm.reset('name', 'email', 'password', 'password_confirmation'),
        });
    };

    const submitRole = (event) => {
        event.preventDefault();
        roleForm.post(route('admin.access.roles.store'), {
            onSuccess: () => roleForm.reset(),
        });
    };

    const toggleNewRoleModule = (moduleKey) => {
        const nextModules = roleForm.data.access_modules.includes(moduleKey)
            ? roleForm.data.access_modules.filter((item) => item !== moduleKey)
            : [...roleForm.data.access_modules, moduleKey];

        roleForm.setData('access_modules', nextModules);
    };

    const tabs = [
        {
            key: 'cipta-pengguna',
            label: 'Cipta Pengguna',
            description: 'Tambah user baru dan tetapkan group role.',
        },
        {
            key: 'group-role-baharu',
            label: 'Group Role Baharu',
            description: 'Cipta role baru serta pilih akses modul awal.',
        },
        {
            key: 'group-role',
            label: 'Group Role',
            description: 'Kemaskini akses modul untuk role sedia ada.',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                        Master Admin
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                        Pengurusan pengguna dan group role
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Cipta pengguna baharu, tetapkan group role, dan tentukan modul yang boleh diakses oleh setiap role selain master admin.
                    </p>
                </div>
            }
        >
            <Head title="Akses Pengguna" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-panel backdrop-blur sm:p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-3xl border px-5 py-4 text-left transition ${
                                        isActive
                                            ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60'
                                    }`}
                                >
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                        {tab.label}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {tab.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {activeTab === 'cipta-pengguna' && (
                    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <form
                            onSubmit={submitUser}
                            className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8"
                        >
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Cipta Pengguna
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                Tambah user baru dan pilih group role
                            </h3>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="user-name" value="Nama pengguna" />
                                    <TextInput
                                        id="user-name"
                                        value={userForm.data.name}
                                        onChange={(event) => userForm.setData('name', event.target.value)}
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                    <InputError className="mt-2" message={userForm.errors.name} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="user-email" value="Email login" />
                                    <TextInput
                                        id="user-email"
                                        type="email"
                                        value={userForm.data.email}
                                        onChange={(event) => userForm.setData('email', event.target.value)}
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                    <InputError className="mt-2" message={userForm.errors.email} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="user-password" value="Kata laluan" />
                                    <TextInput
                                        id="user-password"
                                        type="password"
                                        value={userForm.data.password}
                                        onChange={(event) => userForm.setData('password', event.target.value)}
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                    <InputError className="mt-2" message={userForm.errors.password} />
                                </div>

                                <div>
                                    <InputLabel
                                        htmlFor="user-password-confirmation"
                                        value="Sahkan kata laluan"
                                    />
                                    <TextInput
                                        id="user-password-confirmation"
                                        type="password"
                                        value={userForm.data.password_confirmation}
                                        onChange={(event) =>
                                            userForm.setData('password_confirmation', event.target.value)
                                        }
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-5">
                                <InputLabel htmlFor="user-role" value="Group role" />
                                <select
                                    id="user-role"
                                    value={userForm.data.role_id}
                                    onChange={(event) => userForm.setData('role_id', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                >
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError className="mt-2" message={userForm.errors.role_id} />
                            </div>

                            <div className="mt-6 flex justify-end">
                                <PrimaryButton
                                    className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                                    disabled={userForm.processing}
                                >
                                    {userForm.processing ? 'Mencipta...' : 'Cipta pengguna'}
                                </PrimaryButton>
                            </div>
                        </form>

                        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Senarai Pengguna
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                Akaun sedia ada
                            </h3>

                            <div className="mt-6 space-y-3">
                                {users.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        roles={roles}
                                        currentUserId={currentUserId}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'group-role-baharu' && (
                    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                        <form onSubmit={submitRole}>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Group Role Baharu
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                Cipta group role dan tetapkan modul awal
                            </h3>

                            <div className="mt-6">
                                <InputLabel htmlFor="role-name" value="Nama group role" />
                                <TextInput
                                    id="role-name"
                                    value={roleForm.data.name}
                                    onChange={(event) => roleForm.setData('name', event.target.value)}
                                    className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                />
                                <InputError className="mt-2" message={roleForm.errors.name} />
                            </div>

                            <div className="mt-6 grid gap-3 md:grid-cols-2">
                                {modules.map((module) => {
                                    const checked = roleForm.data.access_modules.includes(module.key);

                                    return (
                                        <label
                                            key={module.key}
                                            className={`cursor-pointer rounded-3xl border p-4 transition ${
                                                checked
                                                    ? 'border-cyan-300 bg-cyan-50'
                                                    : 'border-slate-200 bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleNewRoleModule(module.key)}
                                                    className="mt-1 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {module.label}
                                                    </p>
                                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                                        {module.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            <InputError className="mt-2" message={roleForm.errors.access_modules} />

                            <div className="mt-6 flex justify-end">
                                <PrimaryButton
                                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
                                    disabled={roleForm.processing}
                                >
                                    {roleForm.processing ? 'Mencipta...' : 'Cipta group role'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </section>
                )}

                {activeTab === 'group-role' && (
                    <section className="space-y-4">
                        {roles.map((role) => (
                            <RoleCard key={role.id} role={role} modules={modules} />
                        ))}
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
