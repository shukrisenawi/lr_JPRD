import InputError from '@/Components/InputError';
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

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function estimateExcelWidth(value) {
    const text = String(value ?? '').trim();

    if (text === '') {
        return 8;
    }

    return Array.from(text).reduce((total, character) => {
        if (/[A-Z0-9]/.test(character)) {
            return total + 1.15;
        }

        if (/[a-z]/.test(character)) {
            return total + 1;
        }

        if (character === ' ') {
            return total + 0.55;
        }

        return total + 1.05;
    }, 2);
}

function excelTextCell(value) {
    return {
        value: value ?? '-',
        type: 'String',
    };
}

function Pagination({ voters, onNavigate }) {
    if (!voters || voters.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {voters.from ?? 0} - {voters.to ?? 0} daripada {voters.total} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page - 1)}
                    disabled={!voters.prev_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${link.active ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700'}`}
                        >
                            {link.label}
                        </button>
                    ))}
                <button
                    type="button"
                    onClick={() => onNavigate(voters.current_page + 1)}
                    disabled={!voters.next_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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
        const columnLengths = headers.map((header) => estimateExcelWidth(header));

        const dataRows = rows.map((voter, index) => {
            const cells = [
                { value: search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index, type: 'Number' },
                excelTextCell(voter.no_kp || voter.old_ic || '-'),
                { value: voter.name || '-', type: 'String' },
                { value: voter.address || '-', type: 'String' },
                excelTextCell(voter.phone_mobile || voter.phone_home || '-'),
                { value: '', type: 'String' },
            ];

            if (showLocalityColumn) {
                cells.push({ value: voter.locality || '-', type: 'String' });
            }

            cells.forEach((cell, columnIndex) => {
                columnLengths[columnIndex] = Math.max(
                    columnLengths[columnIndex] ?? 0,
                    estimateExcelWidth(cell.value),
                );
            });

            return cells;
        });

        if (formState.udm) {
            titleRows.push({
                value: formState.udm,
                styleId: 'titleMain',
            });
        }

        if (formState.locality) {
            titleRows.push({
                value: formState.locality,
                styleId: 'titleSub',
            });
        }

        const columnXml = columnLengths
            .map((length) => {
                const width = Math.max(70, Math.min(length * 7.2, 420));

                return `<Column ss:AutoFitWidth="1" ss:Width="${width}"/>`;
            })
            .join('');

        const titleRowXml = titleRows
            .map((title) => `
                <Row>
                    <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="${title.styleId}">
                        <Data ss:Type="String">${escapeXml(title.value)}</Data>
                    </Cell>
                </Row>
            `)
            .join('');

        const headerRowXml = `
            <Row>
                ${headers.map((header) => `
                    <Cell ss:StyleID="header">
                        <Data ss:Type="String">${escapeXml(header)}</Data>
                    </Cell>
                `).join('')}
            </Row>
        `;

        const bodyRowsXml = dataRows
            .map((cells) => `
                <Row>
                    ${cells.map((cell) => `
                        <Cell ss:StyleID="cell">
                            <Data ss:Type="${cell.type}">${escapeXml(cell.value)}</Data>
                        </Cell>
                    `).join('')}
                </Row>
            `)
            .join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
            <Alignment ss:Vertical="Center"/>
            <Borders/>
            <Font ss:FontName="Calibri" ss:Size="11"/>
            <Interior/>
            <NumberFormat/>
            <Protection/>
        </Style>
        <Style ss:ID="titleMain">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/>
            <Interior ss:Color="#CBD5E1" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="titleSub">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/>
            <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="header">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
            <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="cell">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
    </Styles>
    <Worksheet ss:Name="Culaan">
        <Table>
            ${columnXml}
            ${titleRowXml}
            ${headerRowXml}
            ${bodyRowsXml}
        </Table>
    </Worksheet>
</Workbook>`;

        const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `culaan_${formState.udm || 'semua'}_${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AuthenticatedLayout
            variant="light"
            header={
                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Culaan</p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Senarai kerja pemilih belum cula</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">Tapisan ikut UDM dan lokasi, kemudian kemas data atau tandakan rekod yang sudah diurus.</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportToExcel}
                        className="hidden shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700 sm:inline-flex"
                    >
                        <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-black text-white">X</span>
                        Export Excel
                    </button>
                </div>
            }
        >
            <Head title="Culaan" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-stretch">
                    <div className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20 overflow-hidden sm:p-4">
                        <div className="grid gap-3 xl:grid-cols-[12rem_12rem_5rem_minmax(0,1fr)] xl:items-end">
                            <div>
                                <label htmlFor="culaan-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
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
                                <label htmlFor="culaan-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
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
                                <label htmlFor="culaan-dah-cula" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Dah Cula</label>
                                <label
                                    htmlFor="culaan-dah-cula"
                                    className="input-field mt-1.5 inline-flex items-center px-3 py-2"
                                >
                                    <input
                                        id="culaan-dah-cula"
                                        type="checkbox"
                                        checked={formState.show_marked}
                                        onChange={(event) => updateFilter('show_marked', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500"
                                    />
                                </label>
                            </div>

                            <div>
                                <label htmlFor="culaan-search" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Cari Pemilih</label>
                                <div className="relative mt-1.5">
                                    <input
                                    id="culaan-search"
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="input-field pr-8"
                                    placeholder="Nama, IC, telefon..."
                                    disabled={!formState.udm}
                                    />
                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-green-600">⌕</span>
                                </div>
                                {searchError && <InputError className="mt-1" message={searchError} />}
                                {actionError && <InputError className="mt-1" message={actionError} />}
                                {shouldPromptUdm && <p className="mt-1 text-xs font-medium text-slate-500">Pilih UDM untuk mula lihat atau cari senarai culaan.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-green-600 bg-white px-4 py-3 shadow-sm shadow-green-600/20 overflow-hidden">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg text-green-700">●●</div>
                        <div className="min-w-0 flex-1 text-right">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-green-700">Jumlah Paparan</p>
                            <p className="mt-0.5 text-2xl font-black leading-none text-slate-800">{visibleTotal}</p>
                        </div>
                    </div>
                </section>

                <section>
                    {rows.length === 0 ? (
                        <p className="rounded-xl border border-green-600 bg-white py-6 text-center text-xs font-medium text-slate-500 shadow-sm shadow-green-600/20 overflow-hidden">
                            {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk memaparkan senarai culaan.' : 'Tiada pemilih untuk paparan ini.'}
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {rows.map((voter, index) => (
                                <div key={voter.id} className="rounded-xl border border-green-600 bg-white p-3 shadow-sm shadow-green-600/20 overflow-hidden transition-all duration-1000 hover:border-white/50">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-500 text-xs font-black text-white shadow-sm">
                                            {search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold leading-5 text-slate-800">{voter.name}</p>
                                            <p className="mt-0.5 text-xs font-medium uppercase leading-4 tracking-[0.03em] text-slate-500">{voter.address || '-'}</p>
                                        </div>
                                        {voter.is_marked && (
                                            <span className="shrink-0 rounded-md bg-lime-100 px-2 py-0.5 text-xs font-bold text-lime-700">
                                                Dah Ditanda
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="font-semibold text-green-700">IC</span>
                                            <p className="mt-0.5 font-bold text-slate-800">{voter.no_kp || voter.old_ic || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-green-700">Telefon</span>
                                            <p className="mt-0.5 font-bold text-slate-800">{voter.phone_mobile || voter.phone_home || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-green-700">Umur</span>
                                            <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                        </div>
                                        {showLocalityColumn && (
                                            <div className="col-span-3">
                                                <span className="font-semibold text-green-700">Lokaliti</span>
                                                <p className="mt-0.5 font-bold text-slate-800">{voter.locality || '-'}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <a
                                            href={buildTelegramLink('kemascula', voter.telegram_identity)}
                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                        >
                                            Kemas Cula
                                        </a>
                                        <a
                                            href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700"
                                        >
                                            Kemas Tel
                                        </a>
                                        {voter.is_marked ? (
                                            <button
                                                type="button"
                                                onClick={() => unmarkVoter(voter)}
                                                disabled={pendingIds.includes(voter.id)}
                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-rose-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {pendingIds.includes(voter.id) ? '...' : 'Buka Semula'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => markVoter(voter)}
                                                disabled={pendingIds.includes(voter.id)}
                                                className="inline-flex flex-1 items-center justify-center rounded-md bg-green-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
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
