import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Profile</p><h2 className="mt-0.5 heading-lg">Tetapan akaun</h2><p className="text-muted mt-0.5">Kemaskini profil dan kata laluan.</p></div>
        }>
            <Head title="Profile" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="card border-emerald-200 p-3"><UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} /></div>
                <div className="card border-emerald-200 p-3"><UpdatePasswordForm /></div>
            </div>
        </AuthenticatedLayout>
    );
}
