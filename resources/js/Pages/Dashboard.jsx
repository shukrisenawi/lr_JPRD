import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

export default function Dashboard({ sheet }) {
    const telegramBotUrl = 'https://t.me/SSDP_Kedah_Bot';
    const [selectedRow, setSelectedRow] = useState(null);
    const [copyError, setCopyError] = useState('');
    const [copiedRows, setCopiedRows] = useState(
        () =>
            new Set(
                sheet.rows
                    .filter((row) => row.is_copied)
                    .map((row) => row.id),
            ),
    );
    const [copyingRow, setCopyingRow] = useState(null);

    const copiedCount = copiedRows.size;
    const remainingCount = Math.max(sheet.rows.length - copiedCount, 0);

    const normalizedHeaders = useMemo(
        () =>
            sheet.headers.map((header) => ({
                key: header,
                label: header.replaceAll('_', ' '),
            })),
        [sheet.headers],
    );

    const handleCopy = async (row) => {
        const telegramWindow = window.open('about:blank', '_blank');

        setCopyingRow(row.id);
        setCopyError('');

        try {
            await navigator.clipboard.writeText(row.copy_text);

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
                    row_key: row.id,
                    no_kp: row.values.no_kp ?? '',
                }),
            });

            if (!response.ok) {
                throw new Error('Gagal merekod status salinan.');
            }

            setCopiedRows((previous) => new Set(previous).add(row.id));
            setSelectedRow(row.id);
            telegramWindow?.location.replace(telegramBotUrl);
        } catch (error) {
            telegramWindow?.close();
            setCopyError('Salinan tidak berjaya. Sila cuba semula.');
        } finally {
            setCopyingRow(null);
        }
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
                            Semakan data cula daripada Google Sheet
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Klik mana-mana baris untuk pilih, kemudian salin arahan Telegram secara terus. Baris yang sudah disalin akan ditandakan dengan warna berbeza.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
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
                <section className="grid gap-4 sm:grid-cols-3">
                    <StatCard label="Jumlah rekod" value={sheet.rows.length} tone="slate" />
                    <StatCard label="Sudah disalin" value={copiedCount} tone="emerald" />
                    <StatCard label="Belum disalin" value={remainingCount} tone="cyan" />
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Sumber data aktif</h3>
                            <p className="mt-1 break-all text-sm leading-6 text-slate-500">
                                {sheet.sheet_url}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Pilih baris untuk fokus kerja semasa.
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

                    <div className="mt-6 space-y-4 lg:hidden">
                        {sheet.rows.map((row) => {
                            const isSelected = selectedRow === row.id;
                            const isCopied = copiedRows.has(row.id);

                            return (
                                <div
                                    key={row.id}
                                    onClick={() => setSelectedRow(row.id)}
                                    className={`w-full rounded-3xl border p-4 text-left transition ${
                                        isSelected
                                            ? 'border-amber-300 bg-amber-100 text-amber-900'
                                            : isCopied
                                              ? 'border-emerald-200 bg-emerald-50'
                                              : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/70'
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
                                                    : isCopied
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {isCopied ? 'Sudah copy' : 'Belum copy'}
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {normalizedHeaders.map((header) => (
                                            <div key={header.key} className={`rounded-2xl px-3 py-2 ${
                                                isSelected ? 'bg-amber-50' : 'bg-white/80'
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

                                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
                                        <span className="text-sm font-medium">{row.copy_text}</span>
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void handleCopy(row);
                                            }}
                                            className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold"
                                        >
                                            {copyingRow === row.id ? 'Menyalin...' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
                                    {sheet.rows.map((row) => {
                                        const isSelected = selectedRow === row.id;
                                        const isCopied = copiedRows.has(row.id);

                                        return (
                                            <tr
                                                key={row.id}
                                                onClick={() => setSelectedRow(row.id)}
                                                className={`cursor-pointer transition ${
                                                    isSelected
                                                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200/80'
                                                        : isCopied
                                                          ? 'bg-emerald-50 hover:bg-emerald-100/80'
                                                          : 'hover:bg-emerald-50/70'
                                                }`}
                                            >
                                                <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void handleCopy(row);
                                                        }}
                                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                                            isCopied
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-900 text-white hover:bg-cyan-700'
                                                        }`}
                                                    >
                                                        {copyingRow === row.id
                                                            ? 'Menyalin...'
                                                            : isCopied
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
            </div>
        </AuthenticatedLayout>
    );
}
