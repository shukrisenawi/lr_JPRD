import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function DashboardUdm({ udm }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-slate-800">Dashboard UDM</h2>}>
            <Head title="Dashboard UDM" />
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-green-800">Dashboard UDM</h1>
                    <p className="mt-2 text-sm text-slate-600">UDM: {udm || 'Belum ditetapkan'}</p>
                    <p className="mt-4 text-sm text-slate-500">Halaman dashboard khas UDM. Kandungan akan ditambah kemudian.</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
