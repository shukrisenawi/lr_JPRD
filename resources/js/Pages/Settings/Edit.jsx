import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function PemilihUploadPanel({ report }) {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('pemilih_file', file);

        router.post(route('settings.pemilih-upload'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="label-section">Data Pemilih</p>
                    <h3 className="heading-md">Fail Pemilih Semasa</h3>
                    <p className="mt-1 text-xs text-slate-400">Fail ini digunakan oleh keseluruhan sistem. Upload baharu akan update rekod IC yang sama dan set rekod yang tiada dalam fail baharu sebagai xaktif.</p>
                </div>
                <span className="badge-slate shrink-0">{report?.exists ? report.name : 'Belum ada fail'}</span>
            </div>

            <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                    type="file"
                    accept=".xls,.xlsx,.csv,.ods,.html"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-violet-500"
                />
                <button type="submit" disabled={!file || processing} className="btn-primary shrink-0">
                    {processing ? 'Naik...' : 'Muat Naik'}
                </button>
            </form>
        </section>
    );
}

export default function Edit({ settings }) {
    const { data, setData, put, processing, errors } = useForm({ google_sheet_url: settings.google_sheet_url ?? '' });
    const submit = (e) => { e.preventDefault(); put(route('settings.update')); };

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Settings</p><h2 className="mt-0.5 heading-lg">Tetapan Sistem</h2><p className="text-muted mt-0.5">Urus tetapan Google Sheet dan data pemilih semasa.</p></div>
        }>
            <Head title="Settings" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                <PemilihUploadPanel report={settings.pemilih_report} />
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
