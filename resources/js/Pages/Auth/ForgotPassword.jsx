import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });
    const submit = (e) => { e.preventDefault(); post(route('password.email')); };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />
            <div className="mb-5"><p className="label-section">Lupa Kata Laluan</p><h2 className="mt-0.5 heading-lg">Set semula</h2><p className="text-muted mt-0.5">Masukkan email untuk reset link.</p></div>
            {status && <div className="flash-success mb-4">{status}</div>}
            <form onSubmit={submit}>
                <div><InputLabel htmlFor="email" value="Email" /><TextInput id="email" type="email" name="email" value={data.email} className="input-field mt-1" isFocused onChange={(e) => setData('email', e.target.value)} /><InputError message={errors.email} className="mt-1.5" /></div>
                <div className="mt-5 flex justify-end"><PrimaryButton disabled={processing}>Email Reset Link</PrimaryButton></div>
            </form>
        </GuestLayout>
    );
}
