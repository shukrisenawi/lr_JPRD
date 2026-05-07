import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function StatCard({ label, value, tone = 'slate' }) {
    const tones = {
        slate: 'border-slate-200 bg-white text-slate-900',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    };

    return (
        <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>
    );
}

function TrashIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3" />
        </svg>
    );
}

function PageSection({
    page,
    copyingRow,
    deletingPage,
    selectedRowKey,
    onCopy,
    onDelete,
    onSelectRow,
}) {
    const normalizedHeaders = useMemo(
        () =>
            page.headers.map((header) => ({
                key: header,
                label: header.replaceAll('_', ' '),
            })),
        [page.headers],
    );

    const copiedCount = page.rows.filter((row) => row.is_copied).length;

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                        Page {page.page_number}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                        {page.row_count} rekod unik
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {copiedCount} sudah copy, {page.row_count - copiedCount} belum copy.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => onDelete(page.id)}
                    disabled={deletingPage === page.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <TrashIcon className="h-4 w-4" />
                    {deletingPage === page.id ? 'Memadam...' : 'Padam page'}
                </button>
            </div>

            <div className="mt-6 space-y-4 lg:hidden">
                {page.rows.map((row) => (
                    (() => {
                        const isSelected = selectedRowKey === row.row_key;

                        return (
                    <div
                        key={row.row_key}
                        onClick={() => onSelectRow(row.row_key)}
                        className={`rounded-3xl border p-4 ${
                            isSelected
                                ? 'border-amber-300 bg-amber-100 text-amber-900'
                                : row.is_copied
                                  ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-white'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                                    isSelected ? 'text-amber-700' : 'text-slate-400'
                                }`}>
                                    Rekod #{row.position}
                                </p>
                                <h4 className={`mt-2 text-base font-bold ${
                                    isSelected ? 'text-amber-950' : 'text-slate-900'
                                }`}>
                                    {row.values.nama_pemilih || 'Tiada nama'}
                                </h4>
                                <p className={`mt-1 text-sm ${
                                    isSelected ? 'text-amber-800' : 'text-slate-500'
                                }`}>
                                    No KP: {row.values.no_kp || '-'}
                                </p>
                            </div>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    isSelected
                                        ? 'bg-amber-200 text-amber-900'
                                        : row.is_copied
                                          ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {row.is_copied ? 'Sudah copy' : 'Belum copy'}
                            </span>
                        </div>

                        <div className="mt-4 space-y-2">
                            {normalizedHeaders.map((header) => (
                                <div key={header.key} className={`rounded-2xl px-3 py-2 ${
                                    isSelected ? 'bg-amber-50' : 'bg-slate-50'
                                }`}>
                                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                        isSelected ? 'text-amber-700' : 'text-slate-400'
                                    }`}>
                                        {header.label}
                                    </p>
                                    <p className={`mt-1 break-words text-sm ${
                                        isSelected ? 'text-amber-900' : 'text-slate-700'
                                    }`}>
                                        {row.values[header.key] || '-'}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white">
                            <span className="truncate text-sm font-medium">{row.copy_text}</span>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectRow(row.row_key);
                                    void onCopy(row);
                                }}
                                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                                    row.is_copied ? 'bg-emerald-600' : 'bg-cyan-500'
                                }`}
                            >
                                {copyingRow === row.row_key
                                    ? 'Menyalin...'
                                    : row.is_copied
                                      ? 'Copy semula'
                                      : 'Copy'}
                            </button>
                        </div>
                    </div>
                        );
                    })()
                ))}
            </div>

            <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-900 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                            <tr>
                                <th className="px-3 py-3">Tindakan</th>
                                {normalizedHeaders.map((header) => (
                                    <th key={header.key} className="px-3 py-3">
                                        {header.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-[13px] text-slate-700">
                            {page.rows.map((row) => {
                                const isSelected = selectedRowKey === row.row_key;

                                return (
                                <tr
                                    key={row.row_key}
                                    onClick={() => onSelectRow(row.row_key)}
                                    className={`cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200/80'
                                            : row.is_copied
                                              ? 'bg-emerald-50 hover:bg-emerald-100/80'
                                              : 'hover:bg-cyan-50/70'
                                    }`}
                                >
                                    <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onSelectRow(row.row_key);
                                                void onCopy(row);
                                            }}
                                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition ${
                                                row.is_copied
                                                    ? 'bg-emerald-600'
                                                    : 'bg-slate-900 hover:bg-cyan-700'
                                            }`}
                                        >
                                            {copyingRow === row.row_key
                                                ? 'Menyalin...'
                                                : row.is_copied
                                                  ? 'Copy semula'
                                                  : 'Copy'}
                                        </button>
                                    </td>
                                    {normalizedHeaders.map((header) => (
                                        <td key={header.key} className="px-3 py-2.5 align-top leading-5">
                                            <div className="max-w-[12rem] break-words">
                                                {row.values[header.key] || '-'}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem(autoSyncStorageKey) === 'true';
    });
    const [autoSyncZeroStartedAt, setAutoSyncZeroStartedAt] = useState(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        const value = window.localStorage.getItem(autoSyncZeroStartedAtStorageKey);

        return value ? Number(value) : null;
    });
    const [autoSyncMessage, setAutoSyncMessage] = useState('');
    const [onOffStatusValue, setOnOffStatusValue] = useState(null);
    const lastOnOffStatusValueRef = useRef(null);

    const totalRows = pages.reduce((sum, page) => sum + page.row_count, 0);
    const copiedCount = pages.reduce(
        (sum, page) => sum + page.rows.filter((row) => row.is_copied).length,
        0,
    );
    const pendingCount = Math.max(totalRows - copiedCount, 0);
    const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;

    useEffect(() => {
        if (pages.length === 0) {
            setActivePageId(null);
            return;
        }

        const hasActivePage = pages.some((page) => page.id === activePageId);

        if (!hasActivePage) {
            setActivePageId(pages[0].id);
        }
    }, [activePageId, pages]);

    useEffect(() => {
        if (!activePage) {
            setSelectedRowKey(null);
            return;
        }

        const hasSelectedRow = activePage.rows.some((row) => row.row_key === selectedRowKey);

        if (!hasSelectedRow) {
            setSelectedRowKey(activePage.rows[0]?.row_key ?? null);
        }
    }, [activePage, selectedRowKey]);

    useEffect(() => {
        if (!autoSyncEnabled) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            void monitorAutoSync();
        }, autoSyncIntervalMs);

        void monitorAutoSync();

        return () => window.clearInterval(intervalId);
    }, [autoSyncEnabled, autoSyncZeroStartedAt]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(
            autoSyncStorageKey,
            autoSyncEnabled ? 'true' : 'false',
        );
    }, [autoSyncEnabled]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (autoSyncZeroStartedAt === null) {
            window.localStorage.removeItem(autoSyncZeroStartedAtStorageKey);
            return;
        }

        window.localStorage.setItem(
            autoSyncZeroStartedAtStorageKey,
            String(autoSyncZeroStartedAt),
        );
    }, [autoSyncZeroStartedAt]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.removeItem('dashboard-auto-sync-started-at');
    }, []);

    const handleCopy = async (row) => {
        const telegramWindow = window.open('about:blank', '_blank');
        const encodedText = encodeURIComponent(row.copy_text);
        const telegramDeepLink = `tg://resolve?domain=${telegramBotUsername}&text=${encodedText}`;

        setCopyingRow(row.row_key);
        setCopyError('');

        try {
            const token = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            const response = await fetch(route('copied-records.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    row_key: row.row_key,
                    no_kp: row.values.no_kp ?? '',
                }),
            });

            if (!response.ok) {
                throw new Error('Gagal merekod status salinan.');
            }

            telegramWindow?.location.replace(telegramDeepLink);
            router.reload({ only: ['pages'] });
        } catch (error) {
            telegramWindow?.close();
            setCopyError('Salinan tidak berjaya. Sila cuba semula.');
        } finally {
            setCopyingRow(null);
        }
    };

    const runSync = async ({ silent = false } = {}) => {
        const token = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (!silent) {
            setSyncingPage(true);
        }

        try {
            const response = await fetch(route('sheet-pages.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    silent,
                }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Gagal mengambil data baharu.');
            }

            if (silent) {
                if (payload.status === 'created') {
                    setAutoSyncMessage(`Auto aktif: page ${payload.page_number} berjaya ditambah.`);
                } else {
                    setAutoSyncMessage('Auto aktif: tiada data baharu yang unik.');
                }
            } else {
                setAutoSyncMessage('');
            }

            router.reload({ only: ['pages', 'sheet', 'flash'] });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Gagal mengambil data baharu.';

            if (silent) {
                setAutoSyncMessage(`Auto aktif: ${message}`);
            }
        } finally {
            if (!silent) {
                setSyncingPage(false);
            }
        }
    };

    const stopAutoSync = ({ message, showPopup = false }) => {
        setAutoSyncEnabled(false);
        setAutoSyncZeroStartedAt(null);
        setAutoSyncMessage(message);

        if (showPopup && typeof window !== 'undefined') {
            window.alert(message);
        }
    };

    const fetchOnOffStatus = async () => {
        const response = await fetch(route('sheet-pages.on-off-status'), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || 'Gagal mendapatkan status ON/OFF.');
        }

        return payload;
    };

    const monitorAutoSync = async () => {
        try {
            const payload = await fetchOnOffStatus();
            const currentValue = String(payload.value ?? '');
            const previousValue = lastOnOffStatusValueRef.current;
            const isEnabled = payload.enabled === true;

            setOnOffStatusValue(currentValue);

            if (isEnabled) {
                const shouldResetTimer = previousValue !== '0';

                setAutoSyncZeroStartedAt((previousStartedAt) => {
                    if (shouldResetTimer || previousStartedAt === null) {
                        return Date.now();
                    }

                    return previousStartedAt;
                });

                lastOnOffStatusValueRef.current = currentValue;

                if (autoSyncZeroStartedAt !== null
                    && Date.now() - autoSyncZeroStartedAt >= autoSyncZeroDurationMs) {
                    stopAutoSync({
                        message: 'Auto ambil data telah dimatikan kerana status ON/OFF kekal 0 melebihi 15 minit.',
                        showPopup: true,
                    });

                    return;
                }

                setAutoSyncMessage('Auto aktif: status ON/OFF = 0. Sistem semak setiap 3 saat.');
                await runSync({ silent: true });

                return;
            }

            lastOnOffStatusValueRef.current = currentValue;
            setAutoSyncZeroStartedAt(null);
            setAutoSyncMessage('Auto aktif: status ON/OFF = 1. Menunggu ia kembali ke 0 untuk mula semula kiraan.');
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Gagal mendapatkan status ON/OFF.';

            setAutoSyncMessage(`Auto aktif: ${message}`);
        }
    };

    const handleSync = () => {
        void runSync();
    };

    const handleDeletePage = (pageId) => {
        setDeletingPage(pageId);

        router.delete(route('sheet-pages.destroy', pageId), {
            preserveScroll: true,
            onFinish: () => setDeletingPage(null),
        });
    };

    const handleToggleAutoSync = () => {
        setAutoSyncEnabled((previous) => {
            const nextState = !previous;

            setAutoSyncMessage(
                nextState
                    ? 'Auto ambil data aktif. Sistem akan semak status ON/OFF setiap 3 saat.'
                    : 'Auto ambil data dimatikan.'
            );

            if (!nextState) {
                setAutoSyncZeroStartedAt(null);
            }

            if (nextState) {
                lastOnOffStatusValueRef.current = onOffStatusValue;
                void monitorAutoSync();
            }

            return nextState;
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Dashboard
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            Pengurusan page data Google Sheet
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Sistem hanya ambil data unik yang belum pernah masuk mana-mana page. Jika ada data baharu, sistem akan bina page seterusnya secara berasingan.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleToggleAutoSync}
                            className={`inline-flex items-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
                                autoSyncEnabled
                                    ? 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'
                                    : 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-600'
                            }`}
                        >
                            {autoSyncEnabled ? 'Auto Ambil Data: ON' : 'Auto Ambil Data: OFF'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSync}
                            disabled={syncingPage || !!sheet.error}
                            className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {syncingPage ? 'Mengambil data...' : 'Ambil data baharu'}
                        </button>
                        <a
                            href={sheet.csv_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700"
                        >
                            Buka CSV
                        </a>
                        <Link
                            href={route('settings.edit')}
                            className="inline-flex items-center rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                        >
                            Settings
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                <section className="grid gap-4 sm:grid-cols-4">
                    <StatCard label="Jumlah page aktif" value={pages.length} tone="slate" />
                    <StatCard label="Jumlah rekod page" value={totalRows} tone="slate" />
                    <StatCard label="Sudah disalin" value={copiedCount} tone="emerald" />
                    <StatCard label="Belum disalin" value={pendingCount} tone="cyan" />
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Sumber data aktif</h3>
                            <p className="mt-1 break-all text-sm leading-6 text-slate-500">
                                {sheet.sheet_url}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {sheet.new_rows_available > 0
                                ? `${sheet.new_rows_available} data unik baharu sedia untuk dijadikan page seterusnya.`
                                : 'Tiada data baharu unik buat masa ini.'}
                        </div>
                    </div>

                    {sheet.error && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                            {sheet.error}
                        </div>
                    )}

                    {copyError && (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {copyError}
                        </div>
                    )}

                    {autoSyncMessage && (
                        <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-800">
                            {autoSyncMessage}
                        </div>
                    )}
                </section>

                {pages.length === 0 ? (
                    <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900">Belum ada page aktif</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Tekan butang "Ambil data baharu" untuk cipta page pertama dengan data unik daripada Google Sheet.
                        </p>
                    </section>
                ) : (
                    <>
                        <section className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-3 shadow-panel backdrop-blur sm:p-4">
                            <div className="flex flex-wrap gap-2">
                                {pages.map((page) => {
                                    const isActive = page.id === activePage?.id;
                                    const pageCopiedCount = page.rows.filter((row) => row.is_copied).length;

                                    return (
                                        <button
                                            key={page.id}
                                            type="button"
                                            onClick={() => setActivePageId(page.id)}
                                            className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                                                isActive
                                                    ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60'
                                            }`}
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                                Page {page.tab_number}
                                            </p>
                                            <p className="mt-1.5 text-sm font-bold text-slate-900 sm:text-base">
                                                {page.row_count} rekod
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                                {pageCopiedCount} selesai copy
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {activePage && (
                            <PageSection
                                key={activePage.id}
                                page={activePage}
                                copyingRow={copyingRow}
                                deletingPage={deletingPage}
                                selectedRowKey={selectedRowKey}
                                onCopy={handleCopy}
                                onDelete={handleDeletePage}
                                onSelectRow={setSelectedRowKey}
                            />
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
