import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';

export default function ApiKeys({ apiKeys }) {
    const { flash } = usePage().props;
    const newKey = flash?.new_api_key;
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        expires_at: '',
    });

    function handleSubmit(e) {
        e.preventDefault();
        post(route('admin.api-keys.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    }

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Pentadbiran</p>
                    <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Kunci API</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Urus kunci API untuk integrasi sistem luaran.</p>
                </div>
            }
        >
            <Head title="Kunci API" />

            <div className="mx-auto max-w-4xl space-y-4 px-3 sm:px-4 lg:px-6">
                {newKey && (
                    <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Kunci API Baharu</p>
                        <p className="mt-1 break-all font-mono text-sm font-bold text-emerald-900">{newKey}</p>
                        <p className="mt-1 text-[11px] font-medium text-emerald-600">Simpan kunci ini. Anda tidak akan dapat melihatnya semula.</p>
                    </div>
                )}

                {flash?.success && (
                    <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{flash.success}</p>
                )}

                <div className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-green-100 p-4">
                        <h3 className="text-sm font-bold text-slate-800">Senarai Kunci API</h3>
                        <button type="button" onClick={() => setShowForm(!showForm)} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700">
                            {showForm ? 'Batal' : 'Cipta Baharu'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSubmit} className="border-b border-green-100 bg-green-50/50 p-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="min-w-0 flex-1">
                                    <label htmlFor="key-name" className="mb-1 block text-xs font-bold uppercase tracking-wide text-green-700">Nama</label>
                                    <input id="key-name" type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="Contoh: n8n production" required />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="key-expires" className="mb-1 block text-xs font-bold uppercase tracking-wide text-green-700">Luput (pilihan)</label>
                                    <input id="key-expires" type="date" value={data.expires_at} onChange={e => setData('expires_at', e.target.value)} className="w-full rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                                    <InputError message={errors.expires_at} />
                                </div>
                                <button type="submit" disabled={processing} className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50">
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    )}

                    {apiKeys.length === 0 ? (
                        <p className="p-6 text-center text-xs font-medium text-slate-400">Tiada kunci API lagi.</p>
                    ) : (
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-green-100 bg-green-50/50">
                                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-green-700">Nama</th>
                                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-green-700">Kunci</th>
                                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-green-700">Guna Terakhir</th>
                                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-green-700">Luput</th>
                                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-green-700">Dicipta</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiKeys.map((k) => (
                                    <tr key={k.id} className="border-b border-green-50 hover:bg-green-50/50">
                                        <td className="px-4 py-2 font-semibold text-slate-800">{k.name}</td>
                                        <td className="px-4 py-2 font-mono text-slate-500">{k.key_preview}</td>
                                        <td className="px-4 py-2 text-slate-500">{k.last_used_at || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500">{k.expires_at || '-'}</td>
                                        <td className="px-4 py-2 text-slate-500">{k.created_at}</td>
                                        <td className="px-4 py-2 text-right">
                                            <form onSubmit={(e) => { if (!confirm('Padam kunci API ini?')) e.preventDefault(); }} method="POST" action={route('admin.api-keys.destroy', k.id)}>
                                                <input type="hidden" name="_method" value="DELETE" />
                                                <input type="hidden" name="_token" value={document.querySelector('meta[name=csrf-token]')?.content} />
                                                <button type="submit" className="rounded px-2 py-1 text-xs font-bold text-red-500 transition hover:bg-red-50">Padam</button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
