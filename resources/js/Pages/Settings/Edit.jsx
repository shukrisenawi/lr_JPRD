import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function Icon({ name, className = 'h-4 w-4' }) {
    const paths = {
        file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
        upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
        link: <><path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93" /><path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07" /></>,
        info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

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
        <section className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="label-section">Data Pemilih</p>
                    <h3 className="mt-1 text-sm font-bold text-slate-800">Fail Pemilih Semasa</h3>
                    <p className="mt-1 text-xs text-slate-500">Fail ini digunakan oleh sistem untuk uruskan data pemilih. Upload baharu akan update rekod IC yang sama dan set rekod yang tiada dalam fail baharu sebagai inaktif.</p>
                </div>
                <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 shadow-sm transition hover:bg-green-50 hover:text-green-700">
                    <Icon name="file" />
                    Panduan Upload
                </button>
            </div>

            <form onSubmit={submit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400 shadow-sm">
                        <Icon name="file" className="h-5 w-5" />
                    </div>
                    <label className="flex min-h-10 w-full max-w-md cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 shadow-sm transition hover:border-green-300 hover:bg-green-50">
                        <input
                            type="file"
                            accept=".xls,.xlsx,.csv,.ods,.html"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="sr-only"
                        />
                        <span className="rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">Choose File</span>
                        <span className="min-w-0 truncate text-xs font-medium text-slate-500">{file?.name ?? report?.name ?? 'No file chosen'}</span>
                    </label>
                </div>
                <button type="submit" disabled={!file || processing} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-green-600 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-50">
                    <Icon name="upload" />
                    {processing ? 'Naik...' : 'Muat Naik'}
                </button>
            </form>
        </section>
    );
}

export default function Edit({ settings }) {
    const { data, setData, put, processing, errors } = useForm({ google_sheet_url: settings.google_sheet_url ?? '' });
    const submit = (e) => { e.preventDefault(); put(route('settings.update')); };
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Settings</p><h2 className="mt-0.5 heading-lg">Tetapan Sistem</h2><p className="text-muted mt-0.5">Urus tetapan Google Sheet dan data pemilih semasa.</p></div>
        }>
            <Head title="Settings" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                {allowedModules.includes('laporan') && <PemilihUploadPanel report={settings.pemilih_report} />}
                {allowedModules.includes('dashboard') && (
                    <div className="card p-4">
                        <form onSubmit={submit} className="space-y-3">
                            <p className="label-section">URL Google Sheet</p>
                            <div>
                                <div className="relative">
                                    <Icon name="link" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                                    <TextInput id="url" type="url" value={data.google_sheet_url} onChange={(e) => setData('google_sheet_url', e.target.value)} className="input-field py-2 pl-9" placeholder="https://docs.google.com/spreadsheets/d/..." />
                                </div>
                                <InputError className="mt-1" message={errors.google_sheet_url} />
                            </div>
                            <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                                <Icon name="info" className="h-4 w-4 shrink-0" />
                                <span>Pautan akan disimpan ke CSV kami. Pastikan ia public.</span>
                            </div>
                            <div className="flex justify-end">
                                <PrimaryButton disabled={processing}>
                                    <Icon name="save" className="h-3.5 w-3.5" />
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
