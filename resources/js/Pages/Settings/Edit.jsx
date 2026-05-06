import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Edit({ settings }) {
    const { data, setData, put, processing, errors } = useForm({
        google_sheet_url: settings.google_sheet_url ?? '',
    });

    const submit = (event) => {
        event.preventDefault();
        put(route('settings.update'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                        Settings
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                        Tetapan sumber Google Sheet
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Tukar URL Google Sheet di sini jika anda mahu sistem membaca fail lain tanpa ubah kod aplikasi.
                    </p>
                </div>
            }
        >
            <Head title="Settings" />

            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel htmlFor="google_sheet_url" value="URL Google Sheet" />
                            <TextInput
                                id="google_sheet_url"
                                type="url"
                                value={data.google_sheet_url}
                                onChange={(event) => setData('google_sheet_url', event.target.value)}
                                className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                            />
                            <InputError className="mt-2" message={errors.google_sheet_url} />
                        </div>

                        <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                            Sistem akan menukar pautan Google Sheet kepada format eksport CSV secara automatik. Pastikan fail ditetapkan sebagai public atau boleh diakses tanpa login.
                        </div>

                        <div className="flex justify-end">
                            <PrimaryButton
                                className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                                disabled={processing}
                            >
                                {processing ? 'Menyimpan...' : 'Simpan tetapan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
