import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const mustChangePassword = auth.user?.must_change_password ?? false;

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Profile</p><h2 className="mt-0.5 heading-lg">Tetapan akaun</h2><p className="text-muted mt-0.5">Kemaskini profil dan kata laluan.</p></div>
        }>
            <Head title="Profile" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                {mustChangePassword && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        <p className="font-bold">Kata laluan anda telah direset.</p>
                        <p>Sila tukar kata laluan baru anda di bawah sebelum meneruskan.</p>
                    </div>
                )}
                <div className="card border-emerald-200 p-3"><UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} /></div>
                <div className="card border-emerald-200 p-3"><UpdatePasswordForm /></div>
            </div>
        </AuthenticatedLayout>
    );
}
