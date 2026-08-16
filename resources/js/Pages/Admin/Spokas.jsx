import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const numberFormat = new Intl.NumberFormat('ms-MY');

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
        check: <><path d="m5 12 4 4L19 6" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
        alert: <><path d="M10.3 3.5 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
}

function SummaryCard({ label, value, tone = 'green', icon }) {
    const tones = {
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        blue: 'border-sky-200 bg-sky-50 text-sky-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider">{label}</p>
                <Icon name={icon} className="h-4 w-4" />
            </div>
            <p className="mt-1 text-2xl font-black">{numberFormat.format(value)}</p>
        </div>
    );
}

function CopyableValue({ value, label, tone = 'ic', copyKey, copiedKey, onCopy }) {
    if (value === null || value === undefined || value === '') {
        return <span className="font-mono text-slate-600">-</span>;
    }

    const text = String(value);
    const copied = copiedKey === copyKey;
    const toneClasses = tone === 'member'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100';

    return (
        <button
            type="button"
            onClick={() => onCopy(text, copyKey)}
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-left font-mono text-[10px] font-bold transition ${toneClasses} ${copied ? 'ring-2 ring-emerald-200 ring-offset-1' : ''}`}
            title={`Klik untuk salin ${label}`}
            aria-label={`Salin ${label} ${text}`}
        >
            <span>{text}</span>
            {copied && <span className="font-sans text-[10px] font-bold text-emerald-600">Disalin</span>}
        </button>
    );
}

function ResultTable({ results, kind, search, onSearch, onPage, onApprove, onReject, processing, copiedKey, onCopy, actionedRows }) {
    const visible = results?.data ?? [];
    const totalPages = results?.last_page ?? 1;
    const currentPage = results?.current_page ?? 1;
    const total = results?.total ?? 0;
    const hasPemilih = kind !== 'not_found';
    const needsDecision = kind === 'name';

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-900">{numberFormat.format(total)} rekod</p>
                    <p className="text-xs text-slate-500">Papar maksimum 50 rekod setiap halaman.</p>
                </div>
                <form onSubmit={onSearch} className="flex gap-1 sm:w-72">
                    <div className="relative min-w-0 flex-1">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={search} onChange={(event) => onSearch(event, true)} placeholder="Cari nama atau nombor..." className="input-field w-full pl-9 text-xs" />
                    </div>
                    <button type="submit" className="btn-ghost px-2 text-[11px]">Cari</button>
                </form>
            </div>

            {visible.length === 0 ? (
                <p className="p-8 text-center text-xs font-semibold text-slate-400">Tiada rekod untuk dipaparkan.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-3 py-2">Nama SPoKAS</th>
                                <th className="px-3 py-2">No. Ahli PAS</th>
                                <th className="px-3 py-2">No. K/P Baru SPoKAS</th>
                                {hasPemilih && <th className="px-3 py-2">No. K/P Baru Pemilih</th>}
                                <th className="px-3 py-2">No. K/P Lama SPoKAS</th>
                                {hasPemilih ? (
                                    <>
                                        <th className="px-3 py-2">No. K/P Lama Pemilih</th>
                                        {needsDecision && <th className="px-3 py-2">Tindakan</th>}
                                    </>
                                ) : (
                                    <th className="px-3 py-2">Sebab</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((item) => (
                                <tr key={`${kind}-${item.spokas_id}`} className={`hover:bg-emerald-50/40 ${actionedRows?.[item.id] ? 'bg-slate-100/70 opacity-60 line-through decoration-slate-400' : ''}`}>
                                    <td className="px-3 py-2 font-semibold text-slate-800">{item.name || '-'}</td>
                                    <td className="px-3 py-2">
                                        <CopyableValue value={item.member_number} label="No. Ahli" tone="member" copyKey={`${item.id}-member_number`} copiedKey={copiedKey} onCopy={onCopy} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <CopyableValue value={item.ic_birth} label="IC baru SPOKAS" copyKey={`${item.id}-ic_birth`} copiedKey={copiedKey} onCopy={onCopy} />
                                    </td>
                                    {hasPemilih && (
                                        <td className="px-3 py-2">
                                            <CopyableValue value={item.pemilih_no_kp} label="IC baru pemilih" copyKey={`${item.id}-pemilih_no_kp`} copiedKey={copiedKey} onCopy={onCopy} />
                                        </td>
                                    )}
                                    <td className="px-3 py-2">
                                        <CopyableValue value={item.ic_old} label="IC lama SPOKAS" copyKey={`${item.id}-ic_old`} copiedKey={copiedKey} onCopy={onCopy} />
                                    </td>
                                    {hasPemilih ? (
                                        <>
                                            <td className="px-3 py-2">
                                                <CopyableValue value={item.pemilih_old_ic} label="IC lama pemilih" copyKey={`${item.id}-pemilih_old_ic`} copiedKey={copiedKey} onCopy={onCopy} />
                                            </td>
                                            {needsDecision && (
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-1">
                                                        <button type="button" onClick={() => onApprove(item)} disabled={processing || Boolean(actionedRows?.[item.id])} className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Approve</button>
                                                        <button type="button" onClick={() => onReject(item)} disabled={processing || Boolean(actionedRows?.[item.id])} className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
                                                        {actionedRows?.[item.id] && <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600">{actionedRows[item.id] === 'approved' ? 'Diluluskan' : 'Ditolak'}</span>}
                                                    </div>
                                                </td>
                                            )}
                                        </>
                                    ) : (
                                        <td className="px-3 py-2 text-red-700">{item.reason}</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 50 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                    <span className="text-[11px] font-semibold text-slate-500">Halaman {currentPage} / {totalPages}</span>
                    <div className="flex gap-1">
                        <button type="button" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)} className="btn-ghost px-2 py-1 text-[11px] disabled:opacity-40">Sebelum</button>
                        <button type="button" disabled={currentPage === totalPages} onClick={() => onPage(currentPage + 1)} className="btn-ghost px-2 py-1 text-[11px] disabled:opacity-40">Seterusnya</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Spokas({ spokas_count, pemilih_count, run, results, result_counts, active_tab, search, last_migrated_at }) {
    const { post, processing } = useForm({});
    const [tab, setTab] = useState(active_tab ?? 'ic');
    const [searchValue, setSearchValue] = useState(search ?? '');
    const [copiedKey, setCopiedKey] = useState(null);
    const [decisionId, setDecisionId] = useState(null);
    const [actionedRows, setActionedRows] = useState({});
    const [decisionError, setDecisionError] = useState('');

    useEffect(() => {
        setTab(active_tab ?? 'ic');
        setSearchValue(search ?? '');
    }, [active_tab, search]);

    const loadResults = (nextTab = tab, page = 1, nextSearch = searchValue) => {
        setTab(nextTab);
        router.get(route('admin.spokas.index'), {
            tab: nextTab,
            page,
            search: nextSearch || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ['run', 'results', 'result_counts', 'active_tab', 'search', 'last_migrated_at'],
        });
    };

    const copyValue = async (value, key) => {
        let copied = false;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                copied = true;
            }
        } catch (_) {}

        if (!copied) {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = value;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                copied = document.execCommand('copy');
                textarea.remove();
            } catch (_) {}
        }

        if (!copied) return;

        setCopiedKey(key);
        setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    };

    const migrate = () => {
        if (! window.confirm('Teruskan migrasi No. Ahli PAS ke data pemilih?')) return;
        post(route('admin.spokas.migrate'), { preserveScroll: true });
    };

    const rollback = () => {
        if (! window.confirm('Kosongkan No. Ahli PAS yang sepadan dengan data SPoKAS?')) return;
        post(route('admin.spokas.rollback'), { preserveScroll: true });
    };

    const decide = async (item, decision) => {
        if (decisionId !== null || actionedRows[item.id]) return;

        setDecisionError('');
        setDecisionId(item.id);

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const endpoint = decision === 'approved'
                ? route('admin.spokas.results.approve', item.id)
                : route('admin.spokas.results.reject', item.id);
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify({}),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.message || 'Tindakan padanan nama gagal diproses.');
            }

            setActionedRows((current) => ({ ...current, [item.id]: decision }));
        } catch (error) {
            setDecisionError(error.message || 'Tindakan padanan nama gagal diproses.');
        } finally {
            setDecisionId(null);
        }
    };

    const tabs = [
        { key: 'ic', label: 'Senarai Berjaya', count: result_counts?.ic ?? 0, active: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
        { key: 'name', label: 'Nama Sama', count: result_counts?.name ?? 0, active: 'border-violet-600 bg-violet-50 text-violet-800' },
        { key: 'approved', label: 'Nama Approve', count: result_counts?.approved ?? 0, active: 'border-sky-600 bg-sky-50 text-sky-800' },
        { key: 'rejected', label: 'Nama Reject', count: result_counts?.rejected ?? 0, active: 'border-amber-600 bg-amber-50 text-amber-800' },
        { key: 'not_found', label: 'Tidak Dijumpai', count: result_counts?.not_found ?? 0, active: 'border-red-600 bg-red-50 text-red-800' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Pentadbiran</p>
                    <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">SPoKAS</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Padankan nombor ahli PAS dengan rekod pemilih.</p>
                </div>
            }
        >
            <Head title="SPoKAS" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon name="database" /></span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Migrasi No. Ahli PAS</h3>
                                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Sistem akan mengemaskini No. Ahli PAS untuk padanan IC Birth dengan No. K/P baru, atau IC lama SPoKAS dengan IC lama pemilih. Padanan nama perlu diluluskan selepas perbandingan IC.</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            {spokas_count > 0 && (
                                <button type="button" onClick={rollback} disabled={processing} className="btn-danger px-5 py-2 text-xs disabled:opacity-50">
                                    Rollback dan kosongkan No. Ahli
                                </button>
                            )}
                            <PrimaryButton type="button" onClick={migrate} disabled={processing} className="px-5 py-2">
                                {processing ? 'Sedang migrate...' : 'Migrate'}
                                {!processing && <Icon name="arrow" className="ml-2 h-4 w-4" />}
                            </PrimaryButton>
                        </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Padanan nama mesti tepat selepas normalisasi huruf besar dan jarak kosong. Semak No. K/P baru serta lama sebelum meluluskan padanan nama.</span>
                    </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                    <SummaryCard label="Rekod SPoKAS" value={spokas_count} icon="database" />
                    <SummaryCard label="Rekod Pemilih" value={pemilih_count} tone="blue" icon="user" />
                    {run && <SummaryCard label="Jumlah Dikemaskini" value={run.updated_count} tone="green" icon="check" />}
                    {run && <SummaryCard label="Tidak Dijumpai" value={result_counts?.not_found ?? 0} tone="red" icon="alert" />}
                </section>

                {last_migrated_at && <p className="text-right text-[11px] font-semibold text-slate-500">Migrasi terakhir: {last_migrated_at}</p>}

                {run ? (
                    <section className="space-y-3">
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Keputusan migrasi SPoKAS">
                            {tabs.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === item.key}
                                    onClick={() => loadResults(item.key)}
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${tab === item.key ? item.active : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                                >
                                    {item.label} <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{numberFormat.format(item.count)}</span>
                                </button>
                            ))}
                        </div>
                        {decisionError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{decisionError}</p>}
                        <ResultTable
                            results={results}
                            kind={tab}
                            search={searchValue}
                            onSearch={(event, draftOnly = false) => {
                                if (draftOnly) {
                                    setSearchValue(event.target.value);
                                    return;
                                }
                                event.preventDefault();
                                loadResults(tab, 1, searchValue);
                            }}
                            onPage={(page) => loadResults(tab, page, searchValue)}
                            processing={processing || decisionId !== null}
                            copiedKey={copiedKey}
                            onCopy={copyValue}
                            actionedRows={actionedRows}
                            onApprove={(item) => decide(item, 'approved')}
                            onReject={(item) => decide(item, 'rejected')}
                        />
                    </section>
                ) : (
                    <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <p className="text-sm font-bold text-slate-700">Belum ada keputusan migrasi</p>
                        <p className="mt-1 text-xs text-slate-500">Klik butang Migrate untuk mula padanan data.</p>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
