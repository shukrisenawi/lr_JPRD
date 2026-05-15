import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

function PageSection({ page, copyingRow, deletingPage, selectedRowKey, onCopy, onDelete, onSelectRow }) {
    const normalizedHeaders = useMemo(
        () => page.headers.map((header) => ({ key: header, label: header.replaceAll('_', ' ') })),
        [page.headers],
    );
    const copiedCount = page.rows.filter((row) => row.is_copied).length;

    return (
        <section className="card-accent overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Page {page.page_number}</div>
                    <span className="text-xs font-bold text-slate-800">{page.row_count} rekod</span>
                    <span className="text-[10px] font-medium text-green-700">{copiedCount} sudah copy</span>
                </div>
                <button onClick={() => onDelete(page.id)} disabled={deletingPage === page.id} className="btn-danger px-2.5 py-1.5 text-[10px]">
                    {deletingPage === page.id ? 'Memadam...' : 'Padam'}
                </button>
            </div>

            <div className="space-y-2 p-4 lg:hidden">
                {page.rows.map((row) => {
                    const isSelected = selectedRowKey === row.row_key;
                    return (
                        <div key={row.row_key} onClick={() => onSelectRow(row.row_key)}
                            className={`rounded-lg border p-3 transition ${isSelected ? 'border-green-300 bg-green-50' : row.is_copied ? 'border-green-200 bg-green-50/60' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Rekod #{row.position}</p>
                                    <p className="mt-0.5 text-sm font-black text-slate-950">{row.values.nama_pemilih || 'Tiada nama'}</p>
                                    <p className="text-xs text-slate-600">No KP: {row.values.no_kp || '-'}</p>
                                </div>
                                <span className={`shrink-0 ${isSelected ? 'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-green-600 text-white' : row.is_copied ? 'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-green-600 text-white' : 'inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-700'}`}>
                                    {row.is_copied ? 'Sudah copy' : 'Belum copy'}
                                </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {normalizedHeaders.map((header) => (
                                    <div key={header.key} className={`rounded px-2.5 py-1.5 ${isSelected ? 'bg-white' : 'bg-slate-50'}`}>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{header.label}</p>
                                        <p className="mt-0.5 break-words text-xs text-slate-700">{row.values[header.key] || '-'}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                <span className="truncate text-xs text-slate-600">{row.copy_text}</span>
                                <button onClick={(e) => { e.stopPropagation(); onSelectRow(row.row_key); void onCopy(row); }}
                                    className={`rounded px-2.5 py-1 text-[10px] font-bold text-white ${row.is_copied ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}>
                                    {copyingRow === row.row_key ? 'Menyalin...' : row.is_copied ? 'Copy semula' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="table-header">
                        <tr>
                            <th className="table-head-cell">Tindakan</th>
                            {normalizedHeaders.map((header) => (
                                <th key={header.key} className="table-head-cell">{header.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="table-body">
                        {page.rows.map((row) => {
                            const isSelected = selectedRowKey === row.row_key;
                            return (
                                <tr key={row.row_key} onClick={() => onSelectRow(row.row_key)}
                                    className={`cursor-pointer ${isSelected ? 'bg-green-50 text-green-900' : row.is_copied ? 'bg-green-50/40' : 'table-row'}`}>
                                    <td className="table-cell whitespace-nowrap">
                                        <button onClick={(e) => { e.stopPropagation(); onSelectRow(row.row_key); void onCopy(row); }}
                                            className={`rounded px-2.5 py-1 text-[10px] font-bold text-white transition ${row.is_copied ? 'bg-green-600' : 'bg-green-700 hover:bg-green-600'}`}>
                                            {copyingRow === row.row_key ? 'Menyalin...' : row.is_copied ? 'Copy semula' : 'Copy'}
                                        </button>
                                    </td>
                                    {normalizedHeaders.map((header) => (
                                        <td key={header.key} className="table-cell align-top">
                                            <div className="max-w-[12rem] break-words">{row.values[header.key] || '-'}</div>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default function Dashboard({ sheet, pages }) {
    const telegramBotUsername = 'SSDP_Kedah_Bot';
    const autoSyncIntervalMs = 3000;
    const autoSyncZeroDurationMs = 900000;
    const autoSyncStorageKey = 'dashboard-auto-sync-enabled';
    const autoSyncZeroStartedAtStorageKey = 'dashboard-auto-sync-zero-started-at';
    const [copyError, setCopyError] = useState('');
    const [copyingRow, setCopyingRow] = useState(null);
    const [syncingPage, setSyncingPage] = useState(false);
    const [deletingPage, setDeletingPage] = useState(null);
    const [activePageId, setActivePageId] = useState(() => pages[0]?.id ?? null);
    const [selectedRowKey, setSelectedRowKey] = useState(null);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(autoSyncStorageKey) === 'true');
    const [autoSyncZeroStartedAt, setAutoSyncZeroStartedAt] = useState(() => {
        if (typeof window === 'undefined') return null;
        const v = window.localStorage.getItem(autoSyncZeroStartedAtStorageKey);
        return v ? Number(v) : null;
    });
    const [autoSyncMessage, setAutoSyncMessage] = useState('');
    const [onOffStatusValue, setOnOffStatusValue] = useState(null);
    const lastOnOffStatusValueRef = useRef(null);

    const totalRows = pages.reduce((s, p) => s + p.row_count, 0);
    const copiedCount = pages.reduce((s, p) => s + p.rows.filter((r) => r.is_copied).length, 0);
    const pendingCount = Math.max(totalRows - copiedCount, 0);
    const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;

    useEffect(() => {
        if (pages.length === 0) { setActivePageId(null); return; }
        if (!pages.some((p) => p.id === activePageId)) setActivePageId(pages[0].id);
    }, [activePageId, pages]);

    useEffect(() => {
        if (!activePage) { setSelectedRowKey(null); return; }
        if (!activePage.rows.some((r) => r.row_key === selectedRowKey)) setSelectedRowKey(activePage.rows[0]?.row_key ?? null);
    }, [activePage, selectedRowKey]);

    useEffect(() => {
        if (!autoSyncEnabled) return undefined;
        const id = window.setInterval(() => void monitorAutoSync(), autoSyncIntervalMs);
        void monitorAutoSync();
        return () => window.clearInterval(id);
    }, [autoSyncEnabled, autoSyncZeroStartedAt]);

    useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem(autoSyncStorageKey, autoSyncEnabled ? 'true' : 'false'); }, [autoSyncEnabled]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (autoSyncZeroStartedAt === null) { window.localStorage.removeItem(autoSyncZeroStartedAtStorageKey); return; }
        window.localStorage.setItem(autoSyncZeroStartedAtStorageKey, String(autoSyncZeroStartedAt));
    }, [autoSyncZeroStartedAt]);
    useEffect(() => { if (typeof window !== 'undefined') window.localStorage.removeItem('dashboard-auto-sync-started-at'); }, []);

    const handleCopy = async (row) => {
        const telegramWindow = window.open('about:blank', '_blank');
        const deepLink = `tg://resolve?domain=${telegramBotUsername}&text=${encodeURIComponent(row.copy_text)}`;
        setCopyingRow(row.row_key); setCopyError('');
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('copied-records.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                body: JSON.stringify({ row_key: row.row_key, no_kp: row.values.no_kp ?? '' }),
            });
            if (!res.ok) throw new Error();
            telegramWindow?.location.replace(deepLink);
            router.reload({ only: ['pages'] });
        } catch { telegramWindow?.close(); setCopyError('Salinan tidak berjaya.'); }
        finally { setCopyingRow(null); }
    };

    const runSync = async ({ silent = false } = {}) => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!silent) setSyncingPage(true);
        try {
            const res = await fetch(route('sheet-pages.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                body: JSON.stringify({ silent }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.message || 'Gagal.');
            if (silent) setAutoSyncMessage(payload.status === 'created' ? `Auto: page ${payload.page_number} ditambah.` : 'Auto: tiada data baru.');
            else setAutoSyncMessage('');
            router.reload({ only: ['pages', 'sheet', 'flash'] });
        } catch (e) {
            if (silent) setAutoSyncMessage(`Auto: ${e instanceof Error ? e.message : 'Gagal'}`);
        } finally { if (!silent) setSyncingPage(false); }
    };

    const stopAutoSync = ({ message, showPopup = false }) => {
        setAutoSyncEnabled(false); setAutoSyncZeroStartedAt(null); setAutoSyncMessage(message);
        if (showPopup && typeof window !== 'undefined') window.alert(message);
    };

    const fetchOnOffStatus = async () => {
        const res = await fetch(route('sheet-pages.on-off-status'), { method: 'GET', headers: { Accept: 'application/json' } });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || 'Gagal.');
        return payload;
    };

    const monitorAutoSync = async () => {
        try {
            const payload = await fetchOnOffStatus();
            const currentValue = String(payload.value ?? '');
            const prev = lastOnOffStatusValueRef.current;
            const enabled = payload.enabled === true;
            setOnOffStatusValue(currentValue);
            if (enabled) {
                setAutoSyncZeroStartedAt((p) => (prev !== '0' || p === null ? Date.now() : p));
                lastOnOffStatusValueRef.current = currentValue;
                if (autoSyncZeroStartedAt !== null && Date.now() - autoSyncZeroStartedAt >= autoSyncZeroDurationMs) {
                    stopAutoSync({ message: 'Auto dimatikan: status ON/OFF=0 melebihi 15 minit.', showPopup: true });
                    return;
                }
                setAutoSyncMessage('Auto aktif: semak setiap 3 saat.');
                await runSync({ silent: true });
                return;
            }
            lastOnOffStatusValueRef.current = currentValue;
            setAutoSyncZeroStartedAt(null);
            setAutoSyncMessage('Auto aktif: ON/OFF=1, tunggu 0.');
        } catch (e) { setAutoSyncMessage(`Auto: ${e instanceof Error ? e.message : 'Ralat'}`); }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="label-section">Dashboard</p>
                        <h2 className="mt-0.5 heading-lg">Pengurusan Page Data</h2>
                        <p className="text-muted mt-0.5">Ambil data unik dari Google Sheet dan urus setiap page secara berasingan.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => setAutoSyncEnabled((p) => !p)}
                            className={`rounded-lg border px-4 py-2 text-xs font-black transition ${autoSyncEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-300 bg-white text-amber-600 hover:bg-amber-50'}`}>
                            Auto: {autoSyncEnabled ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={() => void runSync()} disabled={syncingPage || !!sheet.error} className="btn-emerald">{syncingPage ? 'Mengambil...' : 'Ambil data'}</button>
                        <a href={sheet.csv_url} target="_blank" rel="noreferrer" className="btn-ghost">CSV</a>
                        <Link href={route('settings.edit')} className="btn-primary">Settings</Link>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Page Aktif" value={pages.length} color="violet" />
                    <StatCard label="Jumlah Rekod" value={totalRows} color="slate" />
                    <StatCard label="Sudah Disalin" value={copiedCount} color="emerald" />
                    <StatCard label="Belum Disalin" value={pendingCount} color="cyan" />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="heading-md">Sumber Data</h3>
                            <p className="truncate text-sm font-medium text-slate-600">{sheet.sheet_url}</p>
                        </div>
                        <span className="badge-slate shrink-0">{sheet.new_rows_available > 0 ? `${sheet.new_rows_available} baru` : 'Tiada baru'}</span>
                    </div>
                    {sheet.error && <div className="flash-warning mx-4 mb-3">{sheet.error}</div>}
                    {copyError && <div className="flash-error mx-4 mb-3">{copyError}</div>}
                    {autoSyncMessage && <div className="flash-info mx-4 mb-3">{autoSyncMessage}</div>}
                </div>

                {pages.length === 0 ? (
                    <div className="card-dashed">
                        <p className="text-base font-black text-slate-950">Belum ada page aktif</p>
                        <p className="mt-1 text-sm text-slate-600">Tekan "Ambil data" untuk mula.</p>
                    </div>
                ) : (
                    <>
                        <div className="card">
                            <div className="flex flex-wrap gap-3 p-3">
                                {pages.map((page) => {
                                    const isActive = page.id === activePage?.id;
                                    return (
                                        <button key={page.id} onClick={() => setActivePageId(page.id)}
                                            className={`rounded-lg border px-2.5 py-2 text-left transition ${isActive ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${isActive ? 'text-white' : 'text-green-700'}`}>Page {page.tab_number}</p>
                                            <p className={`mt-0.5 text-xs font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>{page.row_count} rekod</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {activePage && (
                            <PageSection
                                key={activePage.id} page={activePage}
                                copyingRow={copyingRow} deletingPage={deletingPage}
                                selectedRowKey={selectedRowKey}
                                onCopy={handleCopy}
                                onDelete={(id) => { setDeletingPage(id); router.delete(route('sheet-pages.destroy', id), { preserveScroll: true, onFinish: () => setDeletingPage(null) }); }}
                                onSelectRow={setSelectedRowKey}
                            />
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
