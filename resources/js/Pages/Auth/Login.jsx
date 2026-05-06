import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({
    status,
    canResetPassword,
    defaultCredentials,
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: defaultCredentials?.email ?? '',
        password: defaultCredentials?.password ?? '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Login Admin" />

            <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    Login Admin
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    Akses dashboard semakan
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Gunakan akaun admin untuk semak data, salin arahan Telegram, dan ubah sumber Google Sheet.
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email Admin" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                        autoComplete="username"
                        placeholder="admin@jprd"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Kata Laluan" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                        autoComplete="current-password"
                        placeholder="123"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4 block">
                    <label className="flex items-center">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                        />
                        <span className="ms-2 text-sm text-slate-600">
                            Kekalkan sesi
                        </span>
                    </label>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Akaun awal admin:
                    <span className="ml-2 font-semibold text-slate-900">admin@jprd</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="font-semibold text-slate-900">123</span>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="rounded-md text-sm text-slate-500 underline hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                        >
                            Lupa kata laluan?
                        </Link>
                    )}

                    <PrimaryButton
                        className="ms-auto rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                        disabled={processing}
                    >
                        {processing ? 'Sedang masuk...' : 'Masuk'}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
