import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';

const jsonExample = `{
  "data": [
    {
      "name": "AHMAD BIN ISMAIL",
      "ic_number": "901231105123",
      "kod_cula": "KK01",
      "no_telefon": "0123456789",
      "date_of_birth": "1990-12-31",
      "umur": 35,
      "birthday_url": "https://app.example.com/storage/birthday/abc123.jpg"
    }
  ],
  "total": 1
}`;

function KeyCell({ k, copy: copyFn, copiedKey }) {
    const justCopied = copiedKey === k.id;
    return (
        <div className="flex items-center gap-1">
            <span className="min-w-0 truncate font-mono text-slate-500" style={{ maxWidth: '14ch' }}>{k.key.slice(0, 12) + '...'}</span>
            {justCopied ? (
                <span className="whitespace-nowrap text-[10px] font-bold text-blue-600">Telah disalin</span>
            ) : (
                <button type="button" onClick={function () { copyFn(k.key, k.id); }} className="shrink-0 rounded p-0.5 text-slate-400 hover:text-blue-600" title="Salin kunci">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
            )}
        </div>
    );
}

export default function ApiKeys({ apiKeys, apiUrl }) {
    const { flash } = usePage().props;
    const newKey = flash?.new_api_key;
    const [showForm, setShowForm] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);

    const copy = useCallback(async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(id);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch {}
    }, []);
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
                        <div className="mt-1 flex items-start gap-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-emerald-900">{newKey}</p>
                            <button type="button" onClick={function () { copy(newKey, 'new'); }} className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700">
                                {copiedKey === 'new' ? 'Telah disalin' : 'Salin'}
                            </button>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-emerald-600">Simpan kunci ini. Anda tidak akan dapat melihatnya semula.</p>
                    </div>
                )}

                {flash?.success && (
                    <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{flash.success}</p>
                )}

                {copiedKey && (
                    <div className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                        Berjaya disalin
                    </div>
                )}

                <div className="rounded-xl border border-blue-600 bg-blue-50 shadow-sm shadow-blue-600/20 overflow-hidden">
                    <div className="border-b border-blue-100 p-4">
                        <h3 className="text-sm font-bold text-slate-800">Cara Guna API</h3>
                    </div>
                    <div className="space-y-3 p-4 text-xs">
                        <div>
                            <p className="mb-1 font-bold uppercase tracking-wide text-blue-700">Endpoint</p>
                            <div className="flex items-center gap-2">
                                <code className="break-all rounded-md bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 shadow-sm">{apiUrl}</code>
                                <button type="button" onClick={() => copy(apiUrl + '?key=', 'url')} className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700">Salin</button>
                            </div>
                        </div>
                        <div>
                            <p className="mb-1 font-bold uppercase tracking-wide text-blue-700">Parameter</p>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-blue-200 text-left">
                                        <th className="py-1 pr-4 font-bold text-blue-700">Parameter</th>
                                        <th className="py-1 pr-4 font-bold text-blue-700">Wajib</th>
                                        <th className="py-1 font-bold text-blue-700">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-blue-100">
                                        <td className="py-1.5 pr-4 font-mono text-slate-800">key</td>
                                        <td className="py-1.5 pr-4 text-slate-600">Ya</td>
                                        <td className="py-1.5 text-slate-600">Kunci API (query string atau Bearer token)</td>
                                    </tr>
                                    <tr className="border-b border-blue-100">
                                        <td className="py-1.5 pr-4 font-mono text-slate-800">date</td>
                                        <td className="py-1.5 pr-4 text-slate-600">Tidak</td>
                                        <td className="py-1.5 text-slate-600">Tarikh (YYYY-MM-DD). Lalai: hari ini (GMT+8)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <p className="mb-1 font-bold uppercase tracking-wide text-blue-700">Contoh Response (JSON)</p>
                            <pre className="overflow-x-auto rounded-md bg-white p-3 text-xs leading-relaxed shadow-sm"><code>{jsonExample}</code></pre>
                        </div>
                        <div>
                            <p className="mb-1 font-bold uppercase tracking-wide text-blue-700">Contoh Request (curl)</p>
                            <div className="flex items-start gap-2">
                                <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-green-300 shadow-sm"><code>{`curl "${apiUrl}?key=KUNCI_ANDA"`}</code></pre>
                                <button type="button" onClick={() => copy(`curl "${apiUrl}?key="`, 'curl')} className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700">Salin</button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                        <td className="px-4 py-2"><KeyCell k={k} copy={copy} copiedKey={copiedKey} /></td>
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
