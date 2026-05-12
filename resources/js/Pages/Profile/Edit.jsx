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
            <div className="mx-auto max-w-4xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="card p-5 sm:p-6"><UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} /></div>
                <div className="card p-5 sm:p-6"><UpdatePasswordForm /></div>
                <div className="card border border-rose-600/30 p-5 sm:p-6"><DeleteUserForm /></div>
            </div>
        </AuthenticatedLayout>
    );
}
