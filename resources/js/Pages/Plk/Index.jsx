import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { orderUdms } from '@/Utils/udmOrder';
import { useEffect, useMemo, useState } from 'react';

const numberFormat = new Intl.NumberFormat('ms-MY');
const moneyFormat = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' });

function formatNumber(value) {
    return numberFormat.format(value ?? 0);
}

function formatMoney(value) {
    return moneyFormat.format(Number(value ?? 0));
}

function calculateAmount(row, code, rates) {
    return Number(row.counts?.[code] || 0) * Number(rates[code] || 0);
}

function telegramLink(command, identity) {
    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(`/${command} ${identity}`)}`;
}

function openTelegram(command, voter) {
    const identity = voter.telegram_identity || voter.no_kp;
    if (!identity) return;

    const popup = window.open('about:blank', '_blank');
    if (popup) popup.location.replace(telegramLink(command, identity));
}

function TabButton({ active, label, count, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition sm:px-4 ${active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}
        >
            {label}
            {count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {formatNumber(count)}
                </span>
            )}
        </button>
    );
}

function CulaCodeTab({ active, code, count, onClick }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}
        >
            {code}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {formatNumber(count)}
            </span>
        </button>
    );
}

function UdmCulaCards({ rows, codes, onSelectUdm }) {
    if (!rows?.length) return null;

    return (
        <section className="space-y-2 border-b border-slate-100 p-3">
            <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Ringkasan pemilih mengikut UDM</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">Pilih kad UDM untuk menapis senarai pemilih.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {orderUdms(rows).map((row) => (
                    <button
                        key={row.udm}
                        type="button"
                        onClick={() => onSelectUdm(row.udm)}
                        aria-label={`Papar senarai pemilih UDM ${row.udm}`}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                        <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black text-slate-800">{row.udm}</span>
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800">{formatNumber(row.total)} pemilih</span>
                        </span>
                        <span className="mt-2 grid grid-cols-3 gap-1.5">
                            {codes.map((code) => (
                                <span key={code.code} className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                                    <span className="block text-[9px] font-black text-slate-500">{code.code}</span>
                                    <span className="mt-0.5 block text-xs font-bold text-slate-800">{formatNumber(row.counts?.[code.code])}</span>
                                </span>
                            ))}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}

function Pagination({ voters, onPage }) {
    if (!voters || voters.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {formatNumber(voters.from)}–{formatNumber(voters.to)} daripada {formatNumber(voters.total)} pemilih
            </p>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => onPage(voters.current_page - 1)} disabled={!voters.prev_page_url} className="btn-outline px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">Sebelum</button>
                <span className="text-xs font-semibold text-slate-500">{voters.current_page} / {voters.last_page}</span>
                <button type="button" onClick={() => onPage(voters.current_page + 1)} disabled={!voters.next_page_url} className="btn-outline px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">Seterusnya</button>
            </div>
        </div>
    );
}

function VoterTable({ voters, checkedTab, hideCulaCode, verifyingIds, onVerify, onRequestUnverify, onPage }) {
    if (!voters?.data?.length) {
        return (
            <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="10" /></svg>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">{checkedTab ? 'Tiada pemilih yang telah disemak.' : 'Tiada pemilih PLK dalam tapisan ini.'}</p>
                <p className="mt-1 text-xs text-slate-500">Cuba ubah carian atau pilihan UDM.</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className={`w-full border-collapse text-left ${hideCulaCode ? 'min-w-[800px]' : 'min-w-[940px]'}`}>
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Maklumat pemilih</th>
                            {!hideCulaCode && <th className="px-4 py-3">Kod Cula</th>}
                            <th className="px-4 py-3">UDM / Lokaliti</th>
                            <th className="px-4 py-3">Telefon</th>
                            {checkedTab && <th className="px-4 py-3">Disemak</th>}
                            <th className="px-4 py-3 text-right">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {voters.data.map((voter) => (
                            <tr key={voter.id} className="align-top transition hover:bg-emerald-50/40">
                                <td className="px-4 py-3">
                                    <p className="max-w-[280px] text-xs font-bold uppercase leading-relaxed text-slate-800">{voter.name || 'Nama tidak direkodkan'}</p>
                                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">No. KP: {voter.no_kp || '-'}</p>
                                </td>
                                {!hideCulaCode && (
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800">{voter.cula_code}</span>
                                        <p className="mt-1 max-w-[160px] text-[10px] leading-relaxed text-slate-500">{voter.cula_label}</p>
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    <p className="text-xs font-semibold text-slate-700">{voter.dm || 'UDM tidak dinyatakan'}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">{voter.locality || '-'}</p>
                                </td>
                                <td className="px-4 py-3 text-xs font-medium text-slate-700">{voter.phone || '-'}</td>
                                {checkedTab && (
                                    <td className="px-4 py-3">
                                        <p className="text-[11px] font-semibold text-emerald-700">{voter.verified_at || '-'}</p>
                                        <p className="mt-0.5 text-[10px] text-slate-500">{voter.verified_by || ''}</p>
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    <div className="flex min-w-[290px] flex-wrap justify-end gap-1.5">
                                        {!voter.verified_at ? (
                                            <button
                                                type="button"
                                                onClick={() => onVerify(voter)}
                                                disabled={verifyingIds.includes(voter.id)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                                                {verifyingIds.includes(voter.id) ? 'Menyimpan…' : 'Maklumat betul'}
                                            </button>
                                        ) : (
                                            <>
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                                                    {checkedTab ? 'Sudah disemak' : 'Maklumat betul'}
                                                </span>
                                                {checkedTab && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRequestUnverify(voter)}
                                                        className="inline-flex items-center rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 transition hover:bg-rose-50"
                                                    >
                                                        Batalkan semakan
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        <button type="button" onClick={() => openTelegram('kemascula', voter)} disabled={!voter.telegram_identity} className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-40">Cula</button>
                                        <button type="button" onClick={() => openTelegram('kemastel', voter)} disabled={!voter.telegram_identity} className="inline-flex items-center rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-40">Tukar tel</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination voters={voters} onPage={onPage} />
        </>
    );
}

function CostTable({ rows, codes, rates }) {
    const orderedRows = useMemo(() => orderUdms(rows), [rows]);
    const overall = useMemo(() => rows.reduce((sum, row) => sum + codes.reduce((rowSum, code) => rowSum + calculateAmount(row, code.code, rates), 0), 0), [rows, codes, rates]);
    const totalVoters = useMemo(() => rows.reduce((sum, row) => sum + codes.reduce((count, code) => count + Number(row.counts?.[code.code] || 0), 0), 0), [rows, codes]);

    return (
        <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Jumlah UDM</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{formatNumber(rows.length)}</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Jumlah pemilih PLK</p>
                    <p className="mt-1 text-xl font-black text-sky-900">{formatNumber(totalVoters)}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Jumlah bayaran</p>
                    <p className="mt-1 text-xl font-black text-emerald-900">{formatMoney(overall)}</p>
                </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3">UDM</th>
                            {codes.map((code) => <th key={code.code} className="px-3 py-3 text-right">{code.code}</th>)}
                            <th className="bg-emerald-50 px-4 py-3 text-right text-emerald-800">Jumlah UDM</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orderedRows.map((row) => (
                            <tr key={row.udm} className="hover:bg-emerald-50/40">
                                <th className="sticky left-0 bg-white px-4 py-3 text-xs font-bold text-slate-800">{row.udm}</th>
                                {codes.map((code) => (
                                    <td key={code.code} className="px-3 py-3 text-right">
                                        <p className="text-xs font-bold text-slate-800">{formatMoney(calculateAmount(row, code.code, rates))}</p>
                                        <p className="mt-0.5 text-[10px] text-slate-500">{formatNumber(row.counts?.[code.code])} × {formatMoney(rates[code.code])}</p>
                                    </td>
                                ))}
                                <td className="bg-emerald-50/60 px-4 py-3 text-right text-xs font-black text-emerald-800">{formatMoney(row.total)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={codes.length + 2} className="px-4 py-10 text-center text-xs font-medium text-slate-500">Tiada pemilih PLK ditemui.</td></tr>
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                            <tr>
                                <th className="sticky left-0 bg-slate-50 px-4 py-3 text-xs font-black text-slate-800">Jumlah</th>
                                {codes.map((code) => {
                                    const quantity = rows.reduce((sum, row) => sum + Number(row.counts?.[code.code] || 0), 0);
                                    const amount = rows.reduce((sum, row) => sum + calculateAmount(row, code.code, rates), 0);
                                    return <td key={code.code} className="px-3 py-3 text-right"><p className="text-xs font-black text-slate-800">{formatMoney(amount)}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{formatNumber(quantity)} pemilih</p></td>;
                                })}
                                <td className="bg-emerald-100 px-4 py-3 text-right text-xs font-black text-emerald-900">{formatMoney(overall)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </>
    );
}

export default function PlkIndex({ active_tab: activeTab, filters, udms, summary, voters, codes, code_counts: codeCounts = {}, udm_cula_counts: udmCulaCounts = [], rates: initialRates, cost_rows: costRows }) {
    const { errors = {} } = usePage().props;
    const [search, setSearch] = useState(filters.q || '');
    const [selectedUdm, setSelectedUdm] = useState(filters.udm || '');
    const [rates, setRates] = useState(initialRates || {});
    const [verifyingIds, setVerifyingIds] = useState([]);
    const [savingRates, setSavingRates] = useState(false);
    const [verificationToCancel, setVerificationToCancel] = useState(null);
    const [cancelingVerification, setCancelingVerification] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    useEffect(() => setSearch(filters.q || ''), [filters.q]);
    useEffect(() => setSelectedUdm(filters.udm || ''), [filters.udm]);
    useEffect(() => setRates(initialRates || {}), [initialRates]);

    const navigate = (next = {}) => {
        router.get(route('plk.index'), {
            tab: activeTab,
            udm: selectedUdm,
            q: search,
            cula_code: filters.cula_code || '',
            ...next,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const visitTab = (tab) => navigate({ tab, cula_code: tab === 'senarai' ? (filters.cula_code || '') : '', page: 1 });
    const visitCulaCode = (code) => navigate({ tab: 'senarai', cula_code: code, page: 1 });

    const verifyVoter = (voter) => {
        setVerifyingIds((current) => [...current, voter.id]);
        router.post(route('plk.verify', voter.id), {}, {
            preserveScroll: true,
            onFinish: () => setVerifyingIds((current) => current.filter((id) => id !== voter.id)),
        });
    };

    const cancelVerification = () => {
        if (!verificationToCancel) return;

        setCancelingVerification(true);
        router.delete(route('plk.unverify', verificationToCancel.id), {
            preserveScroll: true,
            onSuccess: () => setVerificationToCancel(null),
            onFinish: () => setCancelingVerification(false),
        });
    };

    const saveRates = (event) => {
        event.preventDefault();
        setSavingRates(true);
        router.put(route('plk.rates.update'), { rates }, {
            preserveScroll: true,
            onFinish: () => setSavingRates(false),
        });
    };

    const onPage = (page) => navigate({ page });

    const exportToExcel = async () => {
        if (exporting) return;

        setExporting(true);
        setExportError('');

        try {
            const params = new URLSearchParams({
                tab: activeTab,
                udm: selectedUdm,
                q: filters.q || '',
                cula_code: activeTab === 'senarai' ? (filters.cula_code || '') : '',
            });
            const response = await fetch(`${route('plk.export')}?${params.toString()}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) throw new Error('Export data gagal dimuat turun.');

            const payload = await response.json();
            const exportVoters = payload.voters || [];
            const udmGroups = new Map();

            exportVoters.forEach((voter) => {
                const udm = String(voter.dm || '').trim() || 'UDM TIDAK DINYATAKAN';
                const locality = String(voter.locality || '').trim() || 'TANPA LOKALITI';
                if (!udmGroups.has(udm)) udmGroups.set(udm, new Map());
                const localities = udmGroups.get(udm);
                if (!localities.has(locality)) localities.set(locality, []);
                localities.get(locality).push(voter);
            });

            const headers = ['Bil.', 'Nama', 'No. KP', 'Telefon', 'Kod Cula', 'UDM', 'Lokaliti'];
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'JPrD Jeneri';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Senarai PLK', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    margins: { left: 0.3, right: 0.3, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 },
                },
            });
            worksheet.views = [{ showGridLines: false }];
            [8, 32, 18, 18, 12, 26, 26].forEach((width, index) => {
                worksheet.getColumn(index + 1).width = width;
            });

            const border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            };
            const addMergedRow = (text, { size = 12, color = 'FF14532D', fill = 'FFECFDF5' } = {}) => {
                const row = worksheet.addRow([text]);
                worksheet.mergeCells(row.number, 1, row.number, headers.length);
                row.height = size > 12 ? 26 : 22;
                const cell = row.getCell(1);
                cell.font = { name: 'Calibri', size, bold: true, color: { argb: color } };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
                return row;
            };
            const addHeaderRow = () => {
                const row = worksheet.addRow(headers);
                row.height = 21;
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F2937' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                    cell.border = border;
                });
            };
            const addVoterRow = (voter, number, udm, locality) => {
                const row = worksheet.addRow([
                    number,
                    voter.name || '-',
                    voter.no_kp || '-',
                    voter.phone || '-',
                    voter.cula_code || '-',
                    udm,
                    locality,
                ]);
                row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: [1, 3, 4, 5].includes(columnNumber) ? 'center' : 'left',
                        wrapText: [2, 6, 7].includes(columnNumber),
                    };
                    cell.border = border;
                });
            };

            const date = new Date();
            const dateLabel = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            addMergedRow('SENARAI PEMILIH PLK', { size: 16, color: 'FFFFFFFF', fill: 'FF047857' });
            addMergedRow(`Dijana pada ${dateLabel}`, { size: 10, color: 'FF475569', fill: 'FFF8FAFC' });

            const sortedUdms = orderUdms([...udmGroups.keys()]);
            if (sortedUdms.length === 0) {
                addMergedRow('Tiada pemilih untuk tapisan ini.', { size: 11, color: 'FF64748B', fill: 'FFFFFFFF' });
            }

            sortedUdms.forEach((udm, udmIndex) => {
                const localities = udmGroups.get(udm);
                const localityNames = [...localities.keys()].sort((a, b) => a.localeCompare(b, 'ms', { numeric: true }));
                addMergedRow(`UDM: ${udm}`, { size: 14, color: 'FFFFFFFF', fill: 'FF047857' });

                let number = 1;
                localityNames.forEach((locality) => {
                    addMergedRow(`Lokaliti: ${locality}`, { size: 11, color: 'FF14532D', fill: 'FFD1FAE5' });
                    addHeaderRow();
                    localities.get(locality)
                        .slice()
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ms', { numeric: true }))
                        .forEach((voter) => {
                            addVoterRow(voter, number++, udm, locality);
                        });
                });

                if (udmIndex < sortedUdms.length - 1) worksheet.lastRow?.addPageBreak();
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Senarai_PLK_${dateLabel}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            setExportError(error.message || 'Eksport Excel tidak berjaya. Sila cuba lagi.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <AuthenticatedLayout header={
            <div>
                <p className="label-section">Operasi / PLK</p>
                <h2 className="mt-0.5 heading-lg">Semakan pemilih PLK</h2>
                <p className="mt-1 text-xs text-slate-500">Urus maklumat pemilih berkod 3B, 3D, 3K, 3M, 3P dan 3U serta kiraan kos mengikut UDM.</p>
            </div>
        }>
            <Head title="PLK" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Jumlah PLK</p>
                        <p className="mt-1 text-lg font-black text-slate-800 sm:text-xl">{formatNumber(summary.total)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Belum disemak</p>
                        <p className="mt-1 text-lg font-black text-amber-900 sm:text-xl">{formatNumber(summary.pending)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Sudah disemak</p>
                        <p className="mt-1 text-lg font-black text-emerald-900 sm:text-xl">{formatNumber(summary.checked)}</p>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-50/70 p-1.5">
                        <TabButton active={activeTab === 'senarai'} label="Senarai pemilih PLK" count={summary.total} onClick={() => visitTab('senarai')} />
                        <TabButton active={activeTab === 'disemak'} label="Pemilih sudah semak" count={summary.checked} onClick={() => visitTab('disemak')} />
                        <TabButton active={activeTab === 'kos'} label="Kiraan kos" onClick={() => visitTab('kos')} />
                    </div>

                    {activeTab !== 'kos' ? (
                        <>
                            <form onSubmit={(event) => { event.preventDefault(); navigate({ q: search, udm: selectedUdm, page: 1 }); }} className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
                                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, No. KP, telefon atau lokaliti" className="input-field min-w-0 flex-1 text-xs" />
                                <select value={selectedUdm} onChange={(event) => { setSelectedUdm(event.target.value); navigate({ udm: event.target.value, page: 1 }); }} className="input-field text-xs sm:w-56">
                                    <option value="">Semua UDM</option>
                                    {orderUdms(udms).map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                </select>
                                <button type="submit" className="btn-primary justify-center px-4 py-2 text-xs">Cari</button>
                                <button type="button" onClick={exportToExcel} disabled={exporting} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50">
                                    {exporting ? 'Menyediakan Excel…' : 'Eksport Excel'}
                                </button>
                            </form>
                            {exportError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{exportError}</p>}
                            {activeTab === 'senarai' && (
                                <div role="tablist" aria-label="Tapisan kod Cula" className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2">
                                    <CulaCodeTab active={!filters.cula_code} code="Semua" count={summary.total} onClick={() => visitCulaCode('')} />
                                    {codes.map((code) => (
                                        <CulaCodeTab
                                            key={code.code}
                                            active={filters.cula_code === code.code}
                                            code={code.code}
                                            count={codeCounts[code.code] || 0}
                                            onClick={() => visitCulaCode(code.code)}
                                        />
                                    ))}
                                </div>
                            )}
                            {activeTab === 'senarai' && selectedUdm === '' && (
                                <UdmCulaCards
                                    rows={udmCulaCounts}
                                    codes={codes || []}
                                    onSelectUdm={(udm) => navigate({ udm, page: 1 })}
                                />
                            )}
                            <VoterTable voters={voters} checkedTab={activeTab === 'disemak'} hideCulaCode={activeTab === 'senarai' && Boolean(filters.cula_code)} verifyingIds={verifyingIds} onVerify={verifyVoter} onRequestUnverify={setVerificationToCancel} onPage={onPage} />
                        </>
                    ) : (
                        <div className="p-3 sm:p-4">
                            <form onSubmit={saveRates}>
                                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-emerald-950">Kadar bayaran bagi setiap kod Cula</p>
                                        <p className="mt-0.5 text-[11px] text-emerald-800">Tetapkan kadar seorang. Kadar ini digunakan untuk mengira jumlah bayaran setiap UDM.</p>
                                    </div>
                                    <button type="submit" disabled={savingRates} className="btn-primary shrink-0 px-4 py-2 text-xs disabled:opacity-50">{savingRates ? 'Menyimpan…' : 'Simpan kadar'}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                    {codes.map((code) => (
                                        <label key={code.code} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-black text-slate-800">{code.code}</span>
                                                <span className="text-right text-[9px] font-medium leading-tight text-slate-400">{code.label}</span>
                                            </span>
                                            <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                                                <span className="text-xs font-bold text-slate-400">RM</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={rates[code.code] ?? 0}
                                                    onChange={(event) => setRates((current) => ({ ...current, [code.code]: event.target.value }))}
                                                    aria-label={`Kadar bayaran ${code.code}`}
                                                    className="w-full border-0 bg-transparent px-0 py-2 text-right text-sm font-bold text-slate-800 focus:outline-none focus:ring-0"
                                                />
                                            </span>
                                            {errors[`rates.${code.code}`] && <span className="mt-1 block text-[10px] text-rose-600">{errors[`rates.${code.code}`]}</span>}
                                        </label>
                                    ))}
                                </div>
                            </form>
                            <CostTable rows={costRows || []} codes={codes || []} rates={rates} />
                        </div>
                    )}
                </section>
            </div>
            {verificationToCancel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="plk-unverify-title"
                        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="M12 9v4m0 4h.01" /><path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                        </div>
                        <h3 id="plk-unverify-title" className="mt-3 text-base font-black text-slate-900">Batalkan semakan?</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            Tanda semakan untuk <strong>{verificationToCancel.name || 'pemilih ini'}</strong> akan dibatalkan dan rekod akan kembali ke senarai pemilih.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setVerificationToCancel(null)} disabled={cancelingVerification} className="btn-outline px-3 py-2 text-xs disabled:opacity-50">Kekalkan</button>
                            <button type="button" onClick={cancelVerification} disabled={cancelingVerification} className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60">
                                {cancelingVerification ? 'Membatalkan…' : 'Ya, batalkan semakan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
