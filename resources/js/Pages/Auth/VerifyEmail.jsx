import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});
    const submit = (e) => { e.preventDefault(); post(route('verification.send')); };

    return (
        <GuestLayout>
            <Head title="Email Verification" />
            <div className="mb-5"><p className="label-section">Verifikasi Email</p><h2 className="mt-0.5 heading-lg">Sahkan email anda</h2><p className="text-muted mt-0.5">Klik pautan yang dihantar ke email anda.</p></div>
            {status === 'verification-link-sent' && <div className="flash-success mb-4">Pautan baru telah dihantar.</div>}
            <form onSubmit={submit}>
                <div className="flex items-center justify-between gap-3">
                    <PrimaryButton disabled={processing}>Resend Verification</PrimaryButton>
                    <Link href={route('logout')} method="post" as="button" className="text-xs text-slate-400 underline hover:text-violet-400">Log Out</Link>
                </div>
            </form>
        </GuestLayout>
    );
}
