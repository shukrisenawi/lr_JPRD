import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '', password: '', password_confirmation: '' });
    const submit = (e) => { e.preventDefault(); post(route('register'), { onFinish: () => reset('password', 'password_confirmation') }); };

    return (
        <GuestLayout>
            <Head title="Register" />
            <div className="mb-5"><p className="label-section">Daftar</p><h2 className="mt-0.5 heading-lg">Akaun baru</h2><p className="text-muted mt-0.5">Isi maklumat untuk daftar sebagai pengguna.</p></div>
            <form onSubmit={submit}>
                <div><InputLabel htmlFor="name" value="Name" /><TextInput id="name" name="name" value={data.name} className="input-field mt-1" autoComplete="name" isFocused onChange={(e) => setData('name', e.target.value)} required /><InputError message={errors.name} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="email" value="Email" /><TextInput id="email" type="email" name="email" value={data.email} className="input-field mt-1" autoComplete="username" onChange={(e) => setData('email', e.target.value)} required /><InputError message={errors.email} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="password" value="Password" /><TextInput id="password" type="password" name="password" value={data.password} className="input-field mt-1" autoComplete="new-password" onChange={(e) => setData('password', e.target.value)} required /><InputError message={errors.password} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="pc" value="Confirm Password" /><TextInput id="pc" type="password" name="password_confirmation" value={data.password_confirmation} className="input-field mt-1" autoComplete="new-password" onChange={(e) => setData('password_confirmation', e.target.value)} required /><InputError message={errors.password_confirmation} className="mt-1.5" /></div>
                <div className="mt-5 flex items-center justify-between">
                    <Link href={route('login')} className="text-xs text-slate-400 underline hover:text-violet-400">Already registered?</Link>
                    <PrimaryButton disabled={processing}>Register</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
