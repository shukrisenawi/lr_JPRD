import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const hari = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
function fmtDate(d) { if (!d) return ''; const m = d.match(/^(\d{2})-(\d{2})-(\d{4})/); if (!m) return d; const dt = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(dt.getTime()) ? d : `${hari[dt.getDay()]}, ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
function Icon({ name, className = 'h-4 w-4' }) {
    const paths = {
        file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
        upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
        link: <><path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93" /><path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07" /></>,
        info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
        download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
        database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function PemilihUploadPanel({ report }) {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const submit = (e) => {
        e.preventDefault();
        if (!file) return;

        setError('');
        setProgress(0);
        setProcessing(true);

        const formData = new FormData();
        formData.append('pemilih_file', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            setProcessing(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                window.location.reload();
            } else {
                let msg = 'Muat naik gagal. Sila cuba lagi.';
                try {
                    const res = JSON.parse(xhr.responseText);
                    msg = res.message ?? msg;
                } catch (_) {}
                setError(msg);
                setProgress(0);
            }
        });

        xhr.addEventListener('error', () => {
            setProcessing(false);
            setProgress(0);
            setError('Sambungan gagal. Sila cuba lagi.');
        });

        xhr.addEventListener('abort', () => {
            setProcessing(false);
            setProgress(0);
        });

        xhr.open('POST', route('settings.pemilih-upload'));
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Accept', 'application/json');
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            xhr.setRequestHeader('X-CSRF-TOKEN', token);
        }
        xhr.send(formData);
    };

    return (
        <section className="card p-4">
            <div>
                <p className="label-section">Data Pemilih</p>
                <h3 className="mt-1 text-sm font-bold text-slate-800">Fail Pemilih Semasa</h3>
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
                            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); setProgress(0); }}
                            className="sr-only"
                        />
                        <span className="rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">Choose File</span>
                        <span className="min-w-0 truncate text-xs font-medium text-slate-500">{file?.name ?? report?.name ?? 'No file chosen'}</span>
                    </label>
                </div>
                <button type="submit" disabled={!file || processing} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-green-600 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-50">
                    <Icon name="upload" />
                    {processing ? `${progress}%` : 'Muat Naik'}
                </button>
            </form>

            {processing && (
                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Memuat naik...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Fail sedang diproses. Jangan tutup halaman ini.</p>
                </div>
            )}

            {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
            {(report?.uploaded_by || report?.uploaded_at) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    {report?.name && (
                        <span className="font-bold text-slate-700">
                            Fail semasa: <span className="text-green-700">{report.name}</span>
                        </span>
                    )}
                    {report?.uploaded_by && (
                        <span className="text-slate-500">
                            Oleh: <span className="font-bold text-slate-700">{report.uploaded_by}</span>
                        </span>
                    )}
                    {report?.uploaded_at && (
                        <span className="text-slate-500">
                            Pada: <span className="font-bold text-slate-700">{fmtDate(report.uploaded_at)}</span>
                        </span>
                    )}
                </div>
            )}
        </section>
    );
}

function DatabaseBackupPanel({ isMasterAdmin }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');

    const handleImport = (e) => {
        e.preventDefault();
        if (!file) return;

        setError('');
        setImporting(true);

        const formData = new FormData();
        formData.append('backup_file', file);

        const xhr = new XMLHttpRequest();

        xhr.addEventListener('load', () => {
            setImporting(false);
            if (xhr.status >= 200 && xhr.status < 300) {
                window.location.reload();
            } else {
                let msg = 'Import gagal. Sila cuba lagi.';
                try {
                    const res = JSON.parse(xhr.responseText);
                    msg = res.message ?? msg;
                } catch (_) {}
                setError(msg);
            }
        });

        xhr.addEventListener('error', () => {
            setImporting(false);
            setError('Sambungan gagal. Sila cuba lagi.');
        });

        xhr.open('POST', route('settings.database.import'));
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Accept', 'application/json');
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            xhr.setRequestHeader('X-CSRF-TOKEN', token);
        }
        xhr.send(formData);
    };

    return (
        <section className="card p-4">
            <div>
                <p className="label-section">Pangkalan Data</p>
                <h3 className="mt-1 text-sm font-bold text-slate-800">Backup &amp; Restore</h3>
            </div>

            <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Icon name="database" className="h-5 w-5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">Eksport pangkalan data (SQL)</span>
                    </div>
                    <a
                        href={route('settings.database.export')}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-blue-700 to-blue-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-blue-600 hover:to-blue-400"
                    >
                        <Icon name="download" className="h-3.5 w-3.5" />
                        Export
                    </a>
                </div>

                {isMasterAdmin && (
                    <form onSubmit={handleImport} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
                            <input
                                type="file"
                                accept=".sql"
                                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }}
                                className="text-xs"
                            />
                            <button
                                type="submit"
                                disabled={!file || importing}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-600 to-amber-400 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-amber-500 hover:to-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Icon name="upload" />
                                {importing ? 'Memulihkan...' : 'Import'}
                            </button>
                        </div>
                        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
                    </form>
                )}
            </div>
        </section>
    );
}

export default function Edit({ settings }) {
    const { data, setData, put, processing, errors } = useForm({ google_sheet_url: settings.google_sheet_url ?? '' });
    const submit = (e) => { e.preventDefault(); put(route('settings.update')); };
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];
    const isMasterAdmin = auth.user?.is_master_admin ?? false;

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Settings</p><h2 className="mt-0.5 heading-lg">Tetapan Sistem</h2><p className="text-muted mt-0.5">Urus tetapan Google Sheet dan data pemilih semasa.</p></div>
        }>
            <Head title="Settings" />
            <div className="mx-auto max-w-4xl space-y-3 px-3 sm:px-4 lg:px-6">
                {allowedModules.includes('laporan') && <PemilihUploadPanel report={settings.pemilih_report} />}
                {isMasterAdmin && <DatabaseBackupPanel isMasterAdmin={isMasterAdmin} />}
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
