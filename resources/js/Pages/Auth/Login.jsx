import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, router, useForm } from '@inertiajs/react';

function UserAvatar({ size = 'lg' }) {
    const dimension = size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
    const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';

    return (
        <div className="relative">
            <div
                className={`absolute inset-0 ${dimension} rounded-full bg-green-400/40 blur-md`}
                aria-hidden="true"
            />
            <div
                className={`relative ${dimension} flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 shadow-lg ring-4 ring-white/60`}
                aria-hidden="true"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${iconSize} text-white drop-shadow`}
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </div>
        </div>
    );
}

function FieldIcon({ children }) {
    return (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
            >
                {children}
            </svg>
        </span>
    );
}

function StatusBanner({ status }) {
    if (!status) return null;
    return (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 flex-shrink-0"
            >
                <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="leading-relaxed">{status}</span>
        </div>
    );
}

export default function Login({ status, defaultCredentials, lastUser }) {
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

            <StatusBanner status={status} />

            {hasLastUser ? (
                <div className="space-y-5">
                    <div className="flex flex-row items-center gap-4 pt-1">
                        {lastUser.avatar_url ? (
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 h-14 w-14 rounded-full bg-green-400/40 blur-md" aria-hidden="true" />
                                <img
                                    src={lastUser.avatar_url}
                                    alt={lastUser.name}
                                    className="relative h-14 w-14 rounded-full object-cover shadow-lg ring-4 ring-white/60"
                                />
                            </div>
                        ) : (
                            <div className="shrink-0">
                                <UserAvatar size="lg" />
                            </div>
                        )}
                        <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-semibold text-slate-800">{lastUser.name}</p>
                            <p className="truncate text-xs text-slate-500">{lastUser.email}</p>
                        </div>
                    </div>

                    <div className="relative flex items-center gap-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Sila masukkan kata laluan
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <input type="hidden" name="email" value={data.email} />

                        <div className="text-left">
                            <InputLabel
                                htmlFor="password"
                                value="Kata Laluan"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            />
                            <div className="relative">
                                <FieldIcon>
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </FieldIcon>
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                                    autoComplete="current-password"
                                    placeholder="Masukkan kata laluan anda"
                                    isFocused
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                            </div>
                            <InputError message={errors.password} className="mt-1.5" />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        <PrimaryButton
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-700/25 transition hover:from-green-800 hover:to-emerald-700 hover:shadow-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sedang masuk...
                                </>
                            ) : (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <polyline points="10 17 15 12 10 7" />
                                        <line x1="15" x2="3" y1="12" y2="12" />
                                    </svg>
                                    Log Masuk
                                </>
                            )}
                        </PrimaryButton>
                    </form>

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">atau</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                        type="button"
                        onClick={switchUser}
                        className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-green-600 hover:bg-green-50 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 transition group-hover:-translate-x-0.5"
                        >
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        </svg>
                        Tukar Pengguna
                    </button>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Hero icon */}
                    <div className="flex justify-center pt-1">
                        <div className="relative">
                            <div className="absolute inset-0 h-16 w-16 rounded-full bg-green-400/40 blur-md" aria-hidden="true" />
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 shadow-lg ring-4 ring-white/60">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-8 w-8 text-white drop-shadow"
                                >
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 text-center">
                        <h2 className="text-lg font-bold text-slate-900">Selamat Datang Kembali</h2>
                        <p className="text-xs text-slate-500">
                            Sila masukkan emel dan kata laluan anda untuk teruskan.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4 text-left">
                        <div>
                            <InputLabel
                                htmlFor="email"
                                value="Alamat Emel"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            />
                            <div className="relative">
                                <FieldIcon>
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </FieldIcon>
                                <TextInput
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                                    autoComplete="username"
                                    placeholder="nama@jprd.gov.my"
                                    isFocused
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                            </div>
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        <div>
                            <InputLabel
                                htmlFor="password"
                                value="Kata Laluan"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            />
                            <div className="relative">
                                <FieldIcon>
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </FieldIcon>
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                                    autoComplete="current-password"
                                    placeholder="Masukkan kata laluan anda"
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                            </div>
                            <InputError message={errors.password} className="mt-1.5" />
                        </div>

                        <PrimaryButton
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-700 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-700/25 transition hover:from-green-800 hover:to-emerald-700 hover:shadow-green-700/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sedang masuk...
                                </>
                            ) : (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <polyline points="10 17 15 12 10 7" />
                                        <line x1="15" x2="3" y1="12" y2="12" />
                                    </svg>
                                    Log Masuk
                                </>
                            )}
                        </PrimaryButton>
                    </form>
                </div>
            )}
        </GuestLayout>
    );
}