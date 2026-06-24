import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';

function UserAvatar({ name, avatar, size = 'lg' }) {
    const dimension = size === 'lg' ? 'h-20 w-20' : 'h-10 w-10';
    const textSize = size === 'lg' ? 'text-xl' : 'text-sm';

    const initials = (name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <div
            className={`${dimension} flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-green-700 to-emerald-600 ${textSize} font-bold text-white shadow-md ring-2 ring-green-500/30`}
            aria-hidden="true"
        >
            {initials || '?'}
        </div>
    );
}

export default function Login({ status, canResetPassword, defaultCredentials, lastUser }) {
    const hasLastUser = Boolean(lastUser?.email);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: defaultCredentials?.email ?? '',
        password: defaultCredentials?.password ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const switchUser = () => {
        router.post(route('login.switch'));
    };

    return (
        <GuestLayout>
            <Head title="Log Masuk" />

            {status && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-xs text-green-700">
                    {status}
                </div>
            )}

            {hasLastUser ? (
                <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 pt-1 text-center">
                        <UserAvatar name={lastUser.name} size="lg" />
                        <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-800">{lastUser.name}</p>
                            <p className="text-xs text-slate-500">{lastUser.email}</p>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <input type="hidden" name="email" value={data.email} />

                        <div>
                            <InputLabel htmlFor="password" value="Kata Laluan" className="text-xs font-semibold text-slate-600" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                isFocused
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} className="mt-1.5" />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        {canResetPassword && (
                            <div className="flex justify-end pt-1">
                                <Link
                                    href={route('password.request')}
                                    className="text-xs font-medium text-green-600 transition hover:text-green-700 hover:underline"
                                >
                                    Lupa kata laluan?
                                </Link>
                            </div>
                        )}

                        <div className="pt-1">
                            <PrimaryButton
                                className="w-full justify-center rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-700/30 transition hover:from-green-600 hover:to-emerald-500 hover:shadow-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                                disabled={processing}
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Sedang masuk...
                                    </span>
                                ) : (
                                    'Log Masuk'
                                )}
                            </PrimaryButton>
                        </div>
                    </form>

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">atau</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                        type="button"
                        onClick={switchUser}
                        className="group flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-green-600 hover:bg-green-50 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition group-hover:-translate-x-0.5">
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        </svg>
                        Switch User
                    </button>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="email" value="Alamat Email" className="text-xs font-semibold text-slate-600" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                            autoComplete="username"
                            placeholder="admin@jprd"
                            isFocused
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Kata Laluan" className="text-xs font-semibold text-slate-600" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    {canResetPassword && (
                        <div className="flex justify-end pt-1">
                            <Link
                                href={route('password.request')}
                                className="text-xs font-medium text-green-600 transition hover:text-green-700 hover:underline"
                            >
                                Lupa kata laluan?
                            </Link>
                        </div>
                    )}

                    <div className="pt-2">
                        <PrimaryButton
                            className="w-full justify-center rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-700/30 transition hover:from-green-600 hover:to-emerald-500 hover:shadow-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                            disabled={processing}
                        >
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sedang masuk...
                                </span>
                            ) : (
                                'Log Masuk'
                            )}
                        </PrimaryButton>
                    </div>
                </form>
            )}

            <div className="mt-5 text-center">
                <p className="text-[10px] text-slate-400">
                    Sila hubungi pentadbir sistem jika terlupa kata laluan.
                </p>
            </div>
        </GuestLayout>
    );
}