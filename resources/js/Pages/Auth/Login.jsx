import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword, defaultCredentials }) {
    const { data, setData, post, processing, errors, reset } = useForm({ email: defaultCredentials?.email ?? '', password: defaultCredentials?.password ?? '', remember: false });
    const submit = (e) => { e.preventDefault(); post(route('login'), { onFinish: () => reset('password') }); };

    return (
        <GuestLayout>
            <Head title="Login Admin" />
            <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">Login Admin</p><h2 className="mt-0.5 text-lg font-extrabold text-slate-800">Akses dashboard</h2><p className="mt-0.5 text-xs text-slate-500">Guna akaun admin untuk semak data dan urus sistem.</p></div>
            {status && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{status}</div>}
            <form onSubmit={submit}>
                <div><InputLabel htmlFor="email" value="Email Admin" /><TextInput id="email" type="email" name="email" value={data.email} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500" autoComplete="username" placeholder="admin@jprd" isFocused onChange={(e) => setData('email', e.target.value)} /><InputError message={errors.email} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="password" value="Kata Laluan" /><TextInput id="password" type="password" name="password" value={data.password} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500" autoComplete="current-password" placeholder="123" onChange={(e) => setData('password', e.target.value)} /><InputError message={errors.password} className="mt-1.5" /></div>
                <div className="mt-3"><label className="flex items-center"><Checkbox name="remember" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} /><span className="ml-2 text-xs text-slate-500">Kekalkan sesi</span></label></div>
                <div className="mt-5 flex items-center justify-between gap-3">
                    {canResetPassword && <Link href={route('password.request')} className="text-xs text-slate-400 underline hover:text-green-600">Lupa kata laluan?</Link>}
                    <PrimaryButton className="ml-auto" disabled={processing}>{processing ? 'Masuk...' : 'Masuk'}</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
