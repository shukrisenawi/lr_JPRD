import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Edit({ settings }) {
    const { data, setData, put, processing, errors } = useForm({ google_sheet_url: settings.google_sheet_url ?? '' });
    const submit = (e) => { e.preventDefault(); put(route('settings.update')); };

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Settings</p><h2 className="mt-0.5 heading-lg">Tetapan Google Sheet</h2><p className="text-muted mt-0.5">Tukar URL Google Sheet tanpa ubah kod.</p></div>
        }>
            <Head title="Settings" />
            <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-6">
                <div className="card p-5 sm:p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="url" value="URL Google Sheet" />
                            <TextInput id="url" type="url" value={data.google_sheet_url} onChange={(e) => setData('google_sheet_url', e.target.value)} className="input-field mt-1.5" placeholder="https://docs.google.com/spreadsheets/d/..." />
                            <InputError className="mt-1.5" message={errors.google_sheet_url} />
                        </div>
                        <div className="rounded-lg bg-slate-800/60 px-4 py-3 text-xs text-slate-400">Sistem tukar pautan ke CSV auto. Pastikan fail public.</div>
                        <div className="flex justify-end"><PrimaryButton className="btn-primary-lg" disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan'}</PrimaryButton></div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
