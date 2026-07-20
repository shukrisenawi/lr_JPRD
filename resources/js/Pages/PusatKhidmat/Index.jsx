import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

function StatCard({ label, value, color = 'slate' }) {
    const colors = {
        slate: { card: 'border-slate-200 bg-white', icon: 'bg-slate-100 text-slate-600', symbol: '▤' },
        violet: { card: 'border-slate-200 bg-white', icon: 'bg-green-100 text-green-700', symbol: '▧' },
        emerald: { card: 'border-lime-100 bg-white', icon: 'bg-lime-100 text-lime-700', symbol: '✓' },
        cyan: { card: 'border-sky-100 bg-white', icon: 'bg-sky-100 text-sky-700', symbol: '◷' },
    };
    const theme = colors[color] ?? colors.slate;

    return (
        <div className={`flex items-center gap-5 rounded-lg border p-4 shadow-sm ${theme.card}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${theme.icon}`}>{theme.symbol}</div>
            <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black leading-none text-slate-800">{value}</p>
            </div>
        </div>
    );
}

function RecordCard({ record, headers }) {
    const [expanded, setExpanded] = useState(false);
    const pemilih = record.pemilih;

    return (
        <div className={`rounded-lg border p-4 transition ${record.linked ? 'border-green-200 bg-green-50/60' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600">#{record.position}</span>
                        <span className="text-sm font-black text-slate-950">{record.payload?.nama || record.payload?.name || record.payload?.nama_pemilih || 'Tiada nama'}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">No KP: {record.no_kp || '-'}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${record.linked ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {record.linked ? 'Dipaut' : 'Tiada pautan'}
                </span>
            </div>

            {record.linked && pemilih && (
                <div className="mt-2 rounded-lg bg-white p-3 border border-green-100">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-green-700">Data Pemilih</p>
                    <div className="mt-1 grid grid-cols-2 gap-1.5 text-xs">
                        <div><span className="text-slate-500">Nama:</span> <span className="font-bold text-slate-800">{pemilih.name || '-'}</span></div>
                        <div><span className="text-slate-500">DM:</span> <span className="font-bold text-slate-800">{pemilih.dm || '-'}</span></div>
                        <div><span className="text-slate-500">Localiti:</span> <span className="font-bold text-slate-800">{pemilih.locality || '-'}</span></div>
                        <div><span className="text-slate-500">No Rumah:</span> <span className="font-bold text-slate-800">{pemilih.no_rumah || '-'}</span></div>
                        <div><span className="text-slate-500">Cula:</span> <span className="font-bold text-slate-800">{pemilih.cula_display_label || pemilih.cula_code || '-'}</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className={`font-bold ${pemilih.status === 'aktif' ? 'text-green-700' : 'text-red-600'}`}>{pemilih.status || '-'}</span></div>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="mt-2 text-xs font-bold text-green-700 hover:text-green-600"
            >
                {expanded ? 'Sembunyi butiran' : 'Lihat butiran'}
            </button>

            {expanded && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {headers.map((header) => (
                        <div key={header} className="rounded bg-slate-50 px-2.5 py-1.5">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{header.replaceAll('_', ' ')}</p>
                            <p className="mt-0.5 break-words text-xs text-slate-700">{record.payload[header] || '-'}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PusatKhidmatIndex({ sheet_url: initialSheetUrl, records: initialRecords, total_count: initialTotal }) {
    const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlInput, setUrlInput] = useState(initialSheetUrl);
    const [savingUrl, setSavingUrl] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');
    const [records, setRecords] = useState(initialRecords);
    const [totalCount, setTotalCount] = useState(initialTotal);
    const [newCount, setNewCount] = useState(null);
    const [updatedCount, setUpdatedCount] = useState(null);

    const headers = records.length > 0 ? Object.keys(records[0].payload) : [];

    const handleSync = async () => {
        setSyncing(true);
        setMessage('');
        setNewCount(null);
        setUpdatedCount(null);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('pusat-khidmat.sync'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
            });
            const payload = await res.json();

            if (!res.ok) throw new Error(payload.message || 'Gagal.');

            setRecords(payload.records);
            setTotalCount(payload.total_count);
            setNewCount(payload.new_count);
            setUpdatedCount(payload.updated_count);
            setMessage(payload.message);
            setMessageType('success');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Ralat tidak diketahui.');
            setMessageType('error');
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveUrl = async () => {
        setSavingUrl(true);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('pusat-khidmat.sheet-url'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                body: JSON.stringify({ url: urlInput }),
            });
            const payload = await res.json();

            if (!res.ok) throw new Error(payload.message || 'Gagal.');

            setSheetUrl(urlInput);
            setEditingUrl(false);
            setMessage(payload.message);
            setMessageType('success');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Ralat tidak diketahui.');
            setMessageType('error');
        } finally {
            setSavingUrl(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="label-section">Operasi</p>
                        <h2 className="mt-0.5 heading-lg">Data Pusat Khidmat</h2>
                        <p className="text-muted mt-0.5">Ambil data dari Google Sheet dan pautkan dengan rekod pemilih melalui No Kad Pengenalan.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => { setEditingUrl(!editingUrl); if (!editingUrl) setUrlInput(sheetUrl); }}
                            className="btn-ghost"
                        >
                            {editingUrl ? 'Batal' : 'Tukar URL'}
                        </button>
                        <button type="button" onClick={handleSync} disabled={syncing} className="btn-emerald">
                            {syncing ? 'Mengambil...' : 'Get Data'}
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Pusat Khidmat" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                {editingUrl && (
                    <div className="card">
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label htmlFor="sheet-url-input" className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">URL Google Sheet</label>
                                <input
                                    id="sheet-url-input"
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                />
                            </div>
                            <button type="button" onClick={handleSaveUrl} disabled={savingUrl} className="btn-primary">
                                {savingUrl ? 'Menyimpan...' : 'Simpan URL'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Jumlah Rekod" value={totalCount} color="slate" />
                    <StatCard label="Baru Ditambah" value={newCount !== null ? newCount : '-'} color="emerald" />
                    <StatCard label="Dikemaskini" value={updatedCount !== null ? updatedCount : '-'} color="violet" />
                    <StatCard label="Dipaut Pemilih" value={records.filter((r) => r.linked).length} color="cyan" />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="heading-md">Sumber Data</h3>
                            <p className="truncate text-sm font-medium text-slate-600">{sheetUrl}</p>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`${messageType === 'success' ? 'flash-success' : messageType === 'error' ? 'flash-error' : 'flash-info'}`}>
                        {message}
                    </div>
                )}

                {records.length === 0 ? (
                    <div className="card-dashed">
                        <p className="text-base font-black text-slate-950">Tiada data</p>
                        <p className="mt-1 text-sm text-slate-600">Tekan "Get Data" untuk mula mengambil data dari Google Sheet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {records.map((record) => (
                            <RecordCard key={record.id} record={record} headers={headers} />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
