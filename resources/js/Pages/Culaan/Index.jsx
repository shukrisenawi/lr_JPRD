import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function buildTelegramLink(command, identity) {
    const payload = identity ? `/${command} ${identity}` : `/${command}`;

    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(payload)}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function excelTextCell(value) {
    return {
        value: value ?? '-',
        style: "mso-number-format:'\\@';",
    };
}

function Pagination({ voters, onNavigate }) {
    if (!voters || voters.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t border-slate-700/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
                Papar {voters.from ?? 0} - {voters.to ?? 0} daripada {voters.total} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page - 1)}
                    disabled={!voters.prev_page_url}
                    className="btn-ghost px-3 py-1.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Sebelum
                </button>
                {voters.links
                    ?.filter((link) => /^\d+$/.test(String(link.label)))
                    .map((link) => (
                        <button
                            key={link.label}
                            type="button"
                            onClick={() => onNavigate(Number(link.label))}
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${link.active ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                            {link.label}
                        </button>
                    ))}
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page + 1)}
                    disabled={!voters.next_page_url}
                    className="btn-ghost px-3 py-1.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Seterusnya
                </button>
            </div>
        </div>
    );
}

export default function CulaanIndex({ filters, summary, udms, localities, voters, requires_udm }) {
    const suggestionsAbort = useRef(null);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [actionError, setActionError] = useState('');
    const [pendingIds, setPendingIds] = useState([]);
    const [localVoters, setLocalVoters] = useState(voters);
    const [localSummary, setLocalSummary] = useState(summary);
    const [formState, setFormState] = useState({
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: Boolean(filters.show_marked),
    });

    useEffect(() => {
        setFormState({
            udm: filters.udm ?? '',
            locality: filters.locality ?? '',
            show_marked: Boolean(filters.show_marked),
        });
    }, [filters.locality, filters.show_marked, filters.udm]);

    useEffect(() => {
        setLocalVoters(voters);
        setLocalSummary(summary);
        setActionError('');
        setPendingIds([]);
    }, [summary, voters]);

    const rows = useMemo(() => {
        if (search.trim().length >= 2 && suggestions.length > 0) {
            return suggestions;
        }

        if (search.trim().length >= 2 && !searching) {
            return suggestions;
        }

        return localVoters.data ?? [];
    }, [localVoters.data, search, searching, suggestions]);

    const applyFilters = (nextState) => {
        router.get(route('culaan.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const goToPage = (page) => {
        applyFilters({
            ...formState,
            page,
        });
    };

    const updateFilter = (key, value) => {
        const nextState = {
            ...formState,
            [key]: value,
        };

        if (key === 'udm' && value !== formState.udm) {
            nextState.locality = '';
        }

        setFormState(nextState);
        applyFilters(nextState);
    };

    const handleSearchChange = async (event) => {
        const value = event.target.value;
        setSearch(value);
        setSearchError('');
        suggestionsAbort.current?.abort();

        if (value.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        if (!formState.udm) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        const controller = new AbortController();
        suggestionsAbort.current = controller;
        setSearching(true);

        const params = new URLSearchParams({
            q: value,
            udm: formState.udm,
            locality: formState.locality,
            show_marked: formState.show_marked ? '1' : '0',
        });

        try {
            const response = await fetch(`${route('culaan.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
                setSearchError('Carian tidak berjaya dimuatkan.');
            }
        } finally {
            setSearching(false);
        }
    };

    const updateLocalCollections = (voter, marked) => {
        setSuggestions((current) => current.filter((item) => item.id !== voter.id));

        setLocalVoters((current) => {
            const nextData = (current.data ?? []).filter((item) => item.id !== voter.id);

            return {
                ...current,
                data: nextData,
                total: Math.max(0, (current.total ?? 0) + (marked ? -1 : -1)),
                to: nextData.length > 0 ? ((current.from ?? 1) + nextData.length - 1) : null,
            };
        });

        setLocalSummary((current) => ({
            ...current,
            total: Math.max(0, (current.total ?? 0) - 1),
        }));
    };

    const sendMarkRequest = async (voter, method) => {
        setActionError('');
        setPendingIds((current) => [...current, voter.id]);

        try {
            const response = await fetch(
                method === 'POST' ? route('culaan.mark.store', voter.id) : route('culaan.mark.destroy', voter.id),
                {
                    method,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Request failed');
            }

            await response.json();
            updateLocalCollections(voter, method === 'POST');
        } catch (error) {
            setActionError('Tindakan tidak berjaya disimpan. Sila cuba lagi.');
        } finally {
            setPendingIds((current) => current.filter((id) => id !== voter.id));
        }
    };

    const markVoter = (voter) => sendMarkRequest(voter, 'POST');

    const unmarkVoter = (voter) => sendMarkRequest(voter, 'DELETE');

    const visibleTotal = search.trim().length >= 2 ? rows.length : localSummary.total;
    const shouldPromptUdm = requires_udm && !formState.udm;
    const showLocalityColumn = formState.locality === '';

    const exportToExcel = () => {
        const headers = ['No', 'IC', 'Nama', 'Alamat', 'Telefon', 'Cula'];

        if (showLocalityColumn) {
            headers.push('Lokaliti');
        }

        const titleRows = [];
        const columnLengths = headers.map((header) => String(header).length);

        const bodyRows = rows.map((voter, index) => {
            const cells = [
                { value: search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index, style: '' },
                excelTextCell(voter.no_kp || voter.old_ic || '-'),
                { value: voter.name || '-', style: '' },
                { value: voter.address || '-', style: '' },
                excelTextCell(voter.phone_mobile || voter.phone_home || '-'),
                { value: '', style: '' },
            ];

            if (showLocalityColumn) {
                cells.push({ value: voter.locality || '-', style: '' });
            }

            cells.forEach((cell, columnIndex) => {
                columnLengths[columnIndex] = Math.max(
                    columnLengths[columnIndex] ?? 0,
                    String(cell.value ?? '').length,
                );
            });

            return `<tr>${cells.map((cell) => `<td style="${cell.style}">${escapeHtml(cell.value)}</td>`).join('')}</tr>`;
        });

        if (formState.udm) {
            titleRows.push(`<tr><th colspan="${headers.length}" style="font-size:22px; text-align:center; background:#cbd5e1; padding:12px 8px;">${escapeHtml(formState.udm)}</th></tr>`);
        }

        if (formState.locality) {
            titleRows.push(`<tr><th colspan="${headers.length}" style="font-size:16px; text-align:center; background:#e2e8f0; padding:10px 8px;">${escapeHtml(formState.locality)}</th></tr>`);
        }

        const colGroup = `<colgroup>${columnLengths
            .map((length) => {
                const width = Math.max(10, Math.min(length + 2, 48));

                return `<col style="width:${width}ch;" />`;
            })
            .join('')}</colgroup>`;

        const html = `
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <style>
                        table { border-collapse: collapse; table-layout: auto; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; white-space: nowrap; }
                        th { background: #e2e8f0; font-weight: 700; }
                    </style>
                </head>
                <body>
                    <table>
                        ${colGroup}
                        <thead>
                            ${titleRows.join('')}
                            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${bodyRows.join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `culaan_${formState.udm || 'semua'}_${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Culaan</p>
                        <h2 className="mt-0.5 heading-lg">Senarai kerja pemilih belum cula</h2>
                        <p className="text-muted mt-0.5">Tapis ikut UDM dan lokaliti, kemudian kemas data atau tandakan rekod yang sudah diurus.</p>
                    </div>
                    <button type="button" onClick={exportToExcel} className="btn-ghost shrink-0 px-3 py-2 text-xs">Export Excel</button>
                </div>
            }
        >
            <Head title="Culaan" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="card p-4 sm:p-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_12rem] xl:items-end">
                        <div className="grid gap-4 xl:grid-cols-[12rem_12rem_9rem_minmax(0,1fr)]">
                            <div>
                                <InputLabel htmlFor="culaan-udm" value="UDM" />
                                <select
                                    id="culaan-udm"
                                    value={formState.udm}
                                    onChange={(event) => updateFilter('udm', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Pilih UDM dahulu</option>
                                    {udms.map((udm) => (
                                        <option key={udm} value={udm}>{udm}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="culaan-locality" value="Lokaliti" />
                                <select
                                    id="culaan-locality"
                                    value={formState.locality}
                                    onChange={(event) => updateFilter('locality', event.target.value)}
                                    className="input-field mt-1.5"
                                    disabled={!formState.udm}
                                >
                                    <option value="">Semua Lokaliti</option>
                                    {localities.map((locality) => (
                                        <option key={locality} value={locality}>{locality}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="culaan-dah-cula" value="Dah Cula" />
                                <label
                                    htmlFor="culaan-dah-cula"
                                    className="mt-1.5 inline-flex items-center rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs text-slate-300"
                                >
                                    <input
                                        id="culaan-dah-cula"
                                        type="checkbox"
                                        checked={formState.show_marked}
                                        onChange={(event) => updateFilter('show_marked', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                                    />
                                </label>
                            </div>

                            <div>
                                <InputLabel htmlFor="culaan-search" value="Cari Pemilih" />
                                <TextInput
                                    id="culaan-search"
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="input-field mt-1.5"
                                    placeholder="Nama, IC, telefon, UDM atau lokaliti"
                                    disabled={!formState.udm}
                                />
                                {searchError && <InputError className="mt-1.5" message={searchError} />}
                                {actionError && <InputError className="mt-1.5" message={actionError} />}
                                {shouldPromptUdm && <p className="mt-1.5 text-[10px] text-slate-500">Pilih UDM untuk mula lihat atau cari senarai culaan.</p>}
                            </div>
                        </div>

                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Jumlah Paparan</p>
                            <p className="mt-1 text-2xl font-black text-white">{visibleTotal}</p>
                        </div>
                    </div>
                </section>

                <section className="card p-4 sm:p-5">
                    {rows.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">
                            {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk memaparkan senarai culaan.' : 'Tiada pemilih untuk paparan ini.'}
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {rows.map((voter, index) => (
                                <div key={voter.id} className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-4 transition-all duration-1000 hover:border-white/50">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-white"><span className="mr-1.5 text-slate-500">{search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index}.</span>{voter.name}</p>
                                            <p className="mt-0.5 text-[10px] text-slate-500">{voter.address || '-'}</p>
                                        </div>
                                        {voter.is_marked && (
                                            <span className="shrink-0 rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300">
                                                Dah Ditanda
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span className="text-slate-500">IC</span>
                                            <p className="font-medium text-slate-200">{voter.no_kp || voter.old_ic || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Telefon</span>
                                            <p className="font-medium text-slate-200">{voter.phone_mobile || voter.phone_home || '-'}</p>
                                        </div>
                                        {showLocalityColumn && (
                                            <div>
                                                <span className="text-slate-500">Lokaliti</span>
                                                <p className="font-medium text-slate-200">{voter.locality || '-'}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <a
                                            href={buildTelegramLink('kemascula', voter.telegram_identity)}
                                            className="btn-ghost px-2.5 py-1.5 text-[10px]"
                                        >
                                            Kemas Cula
                                        </a>
                                        <a
                                            href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                            className="btn-ghost px-2.5 py-1.5 text-[10px]"
                                        >
                                            Kemas Tel
                                        </a>
                                        {voter.is_marked ? (
                                            <button
                                                type="button"
                                                onClick={() => unmarkVoter(voter)}
                                                disabled={pendingIds.includes(voter.id)}
                                                className="btn-danger px-2.5 py-1.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {pendingIds.includes(voter.id) ? '...' : 'Buka Semula'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => markVoter(voter)}
                                                disabled={pendingIds.includes(voter.id)}
                                                className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {pendingIds.includes(voter.id) ? '...' : 'Dah Cula'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!shouldPromptUdm && search.trim().length < 2 && (
                        <Pagination voters={localVoters} onNavigate={goToPage} />
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
