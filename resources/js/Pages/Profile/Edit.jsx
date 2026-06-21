import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, usePage } from '@inertiajs/react';
import { useRef, useEffect, useState } from 'react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const mustChangePassword = auth.user?.must_change_password ?? false;
    const [showModal, setShowModal] = useState(mustChangePassword);
    const passwordSectionRef = useRef(null);

    useEffect(() => {
        setShowModal(mustChangePassword);
    }, [mustChangePassword]);

    const handleTukarKataLaluan = () => {
        setShowModal(false);
        setTimeout(() => {
            passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstInput = passwordSectionRef.current?.querySelector('input');
            firstInput?.focus();
        }, 300);
    };

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Profile</p><h2 className="mt-0.5 heading-lg">Tetapan akaun</h2><p className="text-muted mt-0.5">Kemaskini profil dan kata laluan.</p></div>
        }>
            <Head title="Profile" />

            <Modal show={showModal} closeable={false} maxWidth="md">
                <div className="px-6 py-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="11" width="16" height="9" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                            <circle cx="12" cy="16" r="0.5" fill="currentColor" />
                            <path d="M12 12v3" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Kata Laluan Lalai</h3>
                    <p className="mt-2 text-xs text-slate-500">
                        Kata laluan anda masih menggunakan kata laluan lalai (123).
                        Sila tukar kata laluan baru di bawah sebelum meneruskan.
                    </p>
                    <div className="mt-5">
                        <button
                            type="button"
                            onClick={handleTukarKataLaluan}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                        >
                            Tukar Kata Laluan
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                {mustChangePassword && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        <p className="font-bold">Kata laluan anda masih kata laluan lalai (123).</p>
                        <p>Sila tukar kata laluan baru di bawah sebelum meneruskan.</p>
                    </div>
                )}
                <div className="card border-emerald-200 p-3"><UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} /></div>
                <div ref={passwordSectionRef} className="card border-amber-300 ring-2 ring-amber-400/50 p-3"><UpdatePasswordForm /></div>
            </div>
        </AuthenticatedLayout>
    );
}
