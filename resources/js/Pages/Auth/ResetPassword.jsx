import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({ token, email, password: '', password_confirmation: '' });
    const submit = (e) => { e.preventDefault(); post(route('password.store'), { onFinish: () => reset('password', 'password_confirmation') }); };

    return (
        <GuestLayout>
            <Head title="Reset Password" />
            <div className="mb-5"><p className="label-section">Set Semula</p><h2 className="mt-0.5 heading-lg">Kata laluan baru</h2><p className="text-muted mt-0.5">Masukkan kata laluan baru.</p></div>
            <form onSubmit={submit}>
                <div><InputLabel htmlFor="email" value="Email" /><TextInput id="email" type="email" name="email" value={data.email} className="input-field mt-1" autoComplete="username" onChange={(e) => setData('email', e.target.value)} /><InputError message={errors.email} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="password" value="Password" /><TextInput id="password" type="password" name="password" value={data.password} className="input-field mt-1" autoComplete="new-password" isFocused onChange={(e) => setData('password', e.target.value)} /><InputError message={errors.password} className="mt-1.5" /></div>
                <div className="mt-4"><InputLabel htmlFor="pc" value="Confirm Password" /><TextInput id="pc" type="password" name="password_confirmation" value={data.password_confirmation} className="input-field mt-1" autoComplete="new-password" onChange={(e) => setData('password_confirmation', e.target.value)} /><InputError message={errors.password_confirmation} className="mt-1.5" /></div>
                <div className="mt-5 flex justify-end"><PrimaryButton disabled={processing}>Reset</PrimaryButton></div>
            </form>
        </GuestLayout>
    );
}
