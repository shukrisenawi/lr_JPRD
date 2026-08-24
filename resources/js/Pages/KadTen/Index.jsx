import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        mapPin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
        phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></>,
        idCard: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3" /><path d="M14 11h3" /><path d="M7 14h10" /></>,
        download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
        file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
        target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
        lock: <><rect width="14" height="11" x="5" y="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

const matchMeta = {
    alamat: { label: 'Alamat sama', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    no_rumah: { label: 'No. rumah sama', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    localiti: { label: 'Lokaliti sama', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    udm: { label: 'UDM sama', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    manual: { label: 'Pilihan manual', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function MatchBadge({ type, score }) {
    const meta = matchMeta[type] || matchMeta.manual;

    return (
        <span className={'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ' + meta.className}>
            {meta.label}{score !== null && score !== undefined ? ` · ${score}` : ''}
        </span>
    );
}

function safeSheetName(name, fallback) {
    const cleaned = String(name || fallback).replace(/[\\/?*:[\]]/g, ' ').trim();
    return (cleaned || fallback).slice(0, 31);
}

function addressFor(voter) {
    return voter?.alamat_kediaman || voter?.address || voter?.alamat_kp || '-';
}

async function downloadKadWorkbook(kads, selectedKad = null) {
    const cards = selectedKad ? [selectedKad] : kads;
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JPRD - Kad 10';
    workbook.created = new Date();

    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    const titleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    const date = new Date();
    const dateLabel = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

    const summary = workbook.addWorksheet('Ringkasan', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    summary.views = [{ showGridLines: false }];
    summary.columns = [
        { width: 6 }, { width: 28 }, { width: 30 }, { width: 24 }, { width: 16 }, { width: 14 },
    ];
    summary.mergeCells('A1:F1');
    summary.getCell('A1').value = 'LAPORAN KAD 10';
    summary.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    summary.getCell('A1').fill = titleFill;
    summary.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    summary.getRow(1).height = 28;
    summary.mergeCells('A2:F2');
    summary.getCell('A2').value = `Tarikh cetakan: ${dateLabel}`;
    summary.getCell('A2').alignment = { horizontal: 'center' };
    summary.addRow([]);
    const summaryHeader = summary.addRow(['No', 'UDM / Lokaliti', 'Ketua', 'Status', 'Jumlah ahli', 'Minimum']);
    summaryHeader.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true };
        cell.fill = headerFill;
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    cards.forEach((kad, index) => {
        const scope = kad.level === 'cawangan' ? `${kad.parent_scope_name || '-'} / ${kad.scope_name || '-'}` : (kad.scope_name || kad.level || '-');
        const row = summary.addRow([
            index + 1,
            scope,
            kad.pemimpin?.name || '-',
            kad.is_complete ? 'Lengkap' : 'Belum cukup',
            kad.member_count || 0,
            kad.minimum_members || 10,
        ]);
        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.border = thinBorder;
            cell.alignment = { vertical: 'middle', horizontal: [1, 5, 6].includes(columnNumber) ? 'center' : 'left', wrapText: true };
        });
    });
    summary.addRow([]);
    summary.addRow(['', '', '', 'Jumlah kad', cards.length, '']);
    summary.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
    summary.headerFooter.oddFooter = 'Halaman &P daripada &N';

    const usedSheetNames = new Set(['Ringkasan']);
    cards.forEach((kad, cardIndex) => {
        const baseSheetName = safeSheetName(kad.pemimpin?.name, `Kad ${cardIndex + 1}`);
        let sheetName = baseSheetName;
        let duplicateNumber = 2;
        while (usedSheetNames.has(sheetName)) {
            const suffix = `-${duplicateNumber}`;
            sheetName = `${baseSheetName.slice(0, 31 - suffix.length)}${suffix}`;
            duplicateNumber++;
        }
        usedSheetNames.add(sheetName);
        const sheet = workbook.addWorksheet(sheetName, {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: { left: 0.25, right: 0.25, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 },
            },
        });
        sheet.views = [{ showGridLines: false }];
        sheet.columns = [
            { width: 6 }, { width: 27 }, { width: 17 }, { width: 14 }, { width: 42 },
            { width: 24 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 22 },
        ];
        const addTitle = (value, size = 12, color = 'FF0F172A') => {
            const row = sheet.addRow([value]);
            sheet.mergeCells(row.number, 1, row.number, 10);
            const cell = row.getCell(1);
            cell.font = { name: 'Calibri', size, bold: size >= 14, color: { argb: color } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            return row;
        };
        addTitle('KAD 10', 18, 'FFFFFFFF').getCell(1).fill = titleFill;
        addTitle(kad.pemimpin?.name || kad.name || 'Senarai jagaan ketua', 14);
        addTitle(`${kad.pemimpin?.no_kp || kad.pemimpin?.old_ic || '-'}${kad.pemimpin?.position_name ? ` · ${kad.pemimpin.position_name}` : ''}`, 11);
        const scope = kad.level === 'cawangan' ? `${kad.parent_scope_name || '-'} / ${kad.scope_name || '-'}` : (kad.scope_name || kad.level || '-');
        addTitle(`Skop: ${scope} | Status: ${kad.is_complete ? 'Lengkap' : 'Belum cukup'} (${kad.member_count || 0}/${kad.minimum_members || 10})`, 11);
        sheet.addRow([]);
        const header = sheet.addRow(['No', 'Nama', 'No. KP', 'No. Rumah', 'Alamat', 'UDM', 'Lokaliti', 'Telefon', 'Cula', 'Padanan']);
        header.height = 24;
        header.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
            cell.font = { name: 'Calibri', size: 10, bold: true };
            cell.fill = headerFill;
            cell.border = thinBorder;
            cell.alignment = { vertical: 'middle', horizontal: [1, 3, 4, 8, 9].includes(columnNumber) ? 'center' : 'left', wrapText: true };
        });
        (kad.members || []).forEach((member, index) => {
            const voter = member.voter || {};
            const row = sheet.addRow([
                index + 1,
                voter.name || '-',
                voter.no_kp || voter.old_ic || '-',
                voter.no_rumah || '-',
                addressFor(voter),
                voter.dm || '-',
                voter.locality || '-',
                voter.phone_mobile || voter.phone_home || '-',
                voter.cula_display_label || voter.cula_code || '-',
                member.match_reason || matchMeta[member.cluster_type]?.label || 'Pilihan manual',
            ]);
            row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
                cell.font = { name: 'Calibri', size: 10 };
                cell.border = thinBorder;
                cell.alignment = { vertical: 'middle', horizontal: [1, 3, 4, 8].includes(columnNumber) ? 'center' : 'left', wrapText: true };
            });
        });
        if (!kad.members?.length) {
            const row = sheet.addRow(['', 'Tiada ahli diagihkan.']);
            sheet.mergeCells(row.number, 1, row.number, 10);
            row.getCell(1).alignment = { horizontal: 'center' };
        }
        sheet.autoFilter = `A6:J${Math.max(6, sheet.rowCount)}`;
        sheet.headerFooter.oddFooter = 'Kad 10 | Halaman &P daripada &N';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KAD_10_${selectedKad ? 'KETUA' : 'SEMUA'}_${dateLabel}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function PemimpinSearchModal({ level = 'udm', onSelect, onClose }) {
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [query, setQuery] = useState('');
    const controller = useRef(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return undefined;
        }
        controller.current?.abort();
        const abortController = new AbortController();
        controller.current = abortController;
        setSearching(true);
        const params = new URLSearchParams({ q: query, level });
        fetch(route('kad-ten.suggest-pemimpin') + '?' + params.toString(), {
            headers: { Accept: 'application/json' },
            signal: abortController.signal,
        })
            .then(response => response.json())
            .then(payload => setResults(payload.suggestions ?? []))
            .catch(() => {})
            .finally(() => setSearching(false));

        return () => abortController.abort();
    }, [query, level]);

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-3 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Pilih ketua Kad 10</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Pilih mana-mana pemilih aktif dalam skop anda.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Icon name="x" className="h-5 w-5" /></button>
                </div>
                <div className="space-y-2 border-b border-slate-100 px-4 py-3">
                    <div className="relative">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama, No KP atau lokaliti..." className="input-field w-full pl-9 text-xs" />
                    </div>
                </div>
                <div className="max-h-80 space-y-1.5 overflow-y-auto p-4">
                    {searching ? <p className="py-4 text-center text-xs text-slate-400">Mencari pemilih...</p> : results.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">{query.trim().length < 2 ? 'Taip minimum 2 aksara.' : 'Tiada pemilih dalam skop ini.'}</p> : results.map(result => (
                        <button key={result.id} type="button" onClick={() => onSelect(result)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-green-300 hover:bg-green-50">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"><Icon name="user" className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800">{result.name}</p>
                                <p className="truncate text-[10px] text-slate-400">{result.no_kp || result.old_ic || '-'} | {result.dm || '-'} / {result.locality || '-'}</p>
                            </div>
                            <div className="shrink-0 text-right"><p className="text-[9px] text-slate-400">{result.position_name || 'Pemilih'}</p></div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AddMemberModal({ kad, onClose, onAdded }) {
    const [recommendations, setRecommendations] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoters, setSelectedVoters] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const controller = useRef(null);

    useEffect(() => {
        fetch(route('kad-ten.recommendations', kad.id), { headers: { Accept: 'application/json' } })
            .then(response => response.json())
            .then(payload => setRecommendations(payload.recommendations ?? []))
            .catch(() => setRecommendations([]))
            .finally(() => setLoading(false));
    }, [kad.id]);

    const search = (value) => {
        setQuery(value);
        controller.current?.abort();
        if (value.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        const abortController = new AbortController();
        controller.current = abortController;
        setSearching(true);
        const params = new URLSearchParams({ q: value, kad_ten_id: kad.id });
        fetch(route('kad-ten.search-pemilih') + '?' + params.toString(), { headers: { Accept: 'application/json' }, signal: abortController.signal })
            .then(response => response.json())
            .then(payload => setSuggestions(payload.suggestions ?? []))
            .catch(() => {})
            .finally(() => setSearching(false));
    };

    const rows = query.trim().length >= 2 ? suggestions : recommendations;
    const toggleSelect = (voter) => {
        setSelectedVoters(current => current.some(item => item.id === voter.id) ? current.filter(item => item.id !== voter.id) : [...current, voter]);
    };
    const selected = id => selectedVoters.some(voter => voter.id === id);

    const addSelected = () => {
        if (selectedVoters.length === 0) return;
        setAdding(true);
        router.post(route('kad-ten.members.store', kad.id), {
            pemilih_record_ids: selectedVoters.map(voter => voter.id),
            cluster_type: null,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['kads'],
            onFinish: () => setAdding(false),
            onSuccess: page => {
                onClose();
                onAdded?.();
                Swal.fire({
                    icon: 'success',
                    title: 'Berjaya',
                    text: page?.props?.flash?.success || 'Ahli berjaya ditambah.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-8 sm:pt-16" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Tambah ahli</p><p className="mt-0.5 text-[10px] text-slate-400">Cadangan disusun mengikut rumah, alamat dan lokaliti ketua.</p></div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><Icon name="x" className="h-5 w-5" /></button>
                </div>
                <div className="border-b border-slate-100 px-4 py-3">
                    <div className="relative">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={query} onChange={event => search(event.target.value)} placeholder="Cari nama, No KP, No rumah, alamat, lokaliti atau telefon..." className="input-field w-full pl-9 text-xs" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span>{query.trim().length >= 2 ? 'Hasil carian dalam skop kad' : 'Cadangan automatik untuk ketua ini'}</span>
                        <span>Kod cula: 2, 3B, 3D, 3K, 3M, 3P, 3U</span>
                    </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {(loading || searching) ? <p className="py-12 text-center text-xs text-slate-400">Mencari pemilih...</p> : rows.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center"><Icon name="search" className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-500">Tiada pemilih ditemui</p><p className="mt-1 text-[10px] text-slate-400">Cuba carian lain atau semua pemilih yang layak telah diagihkan.</p></div> : <div className="space-y-1.5">
                        {rows.map(voter => (
                            <label key={voter.id} className={'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ' + (selected(voter.id) ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300 hover:bg-green-50/50')}>
                                <input type="checkbox" checked={selected(voter.id)} onChange={() => toggleSelect(voter)} className="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-xs font-bold text-slate-800">{voter.name}</p><MatchBadge type={voter.match_type} score={voter.match_score} /></div>
                                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{voter.no_kp || voter.old_ic || '-'} | Rumah {voter.no_rumah || '-'} | {voter.dm || '-'} / {voter.locality || '-'}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{voter.match_reason || 'Padanan manual'}{voter.address ? ` | ${voter.address}` : ''}</p>
                                </div>
                                <div className="shrink-0 text-right text-[10px] text-slate-500">{voter.phone_mobile || voter.phone_home || '-'}</div>
                            </label>
                        ))}
                    </div>}
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500"><span className="font-bold text-green-700">{selectedVoters.length}</span> dipilih untuk ditambah. Minimum kad: <span className="font-bold">10 orang</span>.</p>
                    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button><button type="button" onClick={addSelected} disabled={adding || selectedVoters.length === 0} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">{adding ? 'Menambah...' : 'Tambah ahli'}</button></div>
                </div>
            </div>
        </div>
    );
}

function KadCard({ kad, cardNumber, canManage, onEdit, onDelete, onDeleteMember, onExport }) {
    const [expanded, setExpanded] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const complete = kad.member_count >= (kad.minimum_members || 10);
    const scope = kad.level === 'cawangan' ? `${kad.parent_scope_name || '-'} / ${kad.scope_name || '-'}` : (kad.scope_name || kad.level || '-');
    const keepCardOpen = () => setExpanded(true);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex w-full items-start justify-between gap-3 px-3 py-3 sm:px-4">
                <button type="button" onClick={() => setExpanded(current => !current)} className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:bg-green-50/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">{String(cardNumber).padStart(2, '0')}</span>
                        <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                        <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{kad.pemimpin?.name || kad.name || 'Kad 10'}<span className="ml-2 text-[10px] font-normal text-slate-400">· {kad.pemimpin?.no_kp || kad.pemimpin?.old_ic || '-'}</span></p><p className="mt-0.5 truncate text-[10px] text-slate-500">{scope}</p></div>
                    </div>
                </button>
                <div className="flex min-w-0 max-w-[70%] shrink-0 flex-col items-end gap-1.5 sm:max-w-none sm:flex-row sm:items-center">
                    <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + (complete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{complete ? 'Lengkap' : 'Belum cukup'} · {kad.member_count}/{kad.minimum_members || 10}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" onClick={() => onExport(kad)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-green-300 hover:text-green-700"><Icon name="download" className="h-3.5 w-3.5" /> Excel</button>
                        {canManage && <><button type="button" onClick={() => onEdit(kad)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 hover:bg-green-50"><Icon name="edit" className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => onDelete(kad)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><Icon name="trash" className="h-3.5 w-3.5" /> Padam</button></>}
                    </div>
                </div>
            </div>

            {expanded && <div className="border-t border-slate-100">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Senarai ahli</p><p className="mt-0.5 text-[10px] text-slate-400">{complete ? 'Kad sudah mencapai minimum 10 orang.' : `Masih perlu ${Math.max(0, (kad.minimum_members || 10) - kad.member_count)} orang untuk lengkap.`}</p></div>{canManage && <button type="button" onClick={() => setAddModal(true)} className="inline-flex items-center justify-center gap-1 rounded-md border border-green-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-50"><Icon name="plus" className="h-3.5 w-3.5" /> Tambah ahli</button>}</div>
                {kad.members.length === 0 ? <div className="px-3 py-8 text-center text-[10px] text-slate-400">Tiada ahli dalam kad ini.</div> : <div className="divide-y divide-slate-100">{kad.members.map((member, index) => <div key={member.id} className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4"><span className="w-5 shrink-0 pt-0.5 text-right text-[10px] font-bold text-slate-400">{index + 1}.</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{member.voter?.name || '-'}</p><p className="truncate text-[10px] text-slate-400">{member.voter?.no_kp || member.voter?.old_ic || '-'} | Rumah {member.voter?.no_rumah || '-'} | {member.voter?.dm || '-'} / {member.voter?.locality || '-'}</p><p className="mt-0.5 truncate text-[9px] text-sky-600">{member.match_reason || matchMeta[member.cluster_type]?.label || 'Pilihan manual'}</p></div><div className="hidden shrink-0 text-right text-[10px] text-slate-500 sm:block">{member.voter?.phone_mobile || member.voter?.phone_home || '-'}</div>{canManage && <button type="button" onClick={() => onDeleteMember(kad.id, member.id)} className="shrink-0 rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600" title="Buang"><Icon name="x" className="h-3.5 w-3.5" /></button>}</div>)}</div>}
            </div>}
            {addModal && <AddMemberModal kad={kad} onClose={() => setAddModal(false)} onAdded={keepCardOpen} />}
        </div>
    );
}

function EditKadModal({ kad, onClose }) {
    const form = useForm({ name: kad.pemimpin?.name || kad.name || '', pemimpin_id: kad.pemimpin?.id || '', level: kad.level === 'cawangan' ? 'cawangan' : 'udm', notes: kad.notes || '' });
    const [searchOpen, setSearchOpen] = useState(false);
    const [selectedPemimpin, setSelectedPemimpin] = useState(kad.pemimpin ? { ...kad.pemimpin, level: kad.level } : null);

    const selectPemimpin = (leader) => {
        form.setData('pemimpin_id', leader.id);
        form.setData('level', leader.level);
        form.setData('name', leader.name);
        setSelectedPemimpin(leader);
        setSearchOpen(false);
    };
    const submit = event => {
        event.preventDefault();
        form.put(route('kad-ten.update', kad.id), { preserveScroll: true, onSuccess: onClose });
    };

    return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-16 sm:pt-24" onClick={onClose}><div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Edit Kad 10</p><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><Icon name="x" className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-3 p-4"><div><label className="text-xs font-semibold text-slate-600">Ketua <span className="text-rose-500">*</span></label>{selectedPemimpin ? <div className="mt-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-green-800">{selectedPemimpin.name}</p><p className="truncate text-[10px] text-green-600">{selectedPemimpin.no_kp || selectedPemimpin.old_ic || '-'} · {selectedPemimpin.position_name || 'Pemilih'}</p></div><button type="button" onClick={() => { setSelectedPemimpin(null); form.setData('pemimpin_id', ''); form.setData('name', ''); }} className="rounded-md p-1 text-rose-400 hover:bg-rose-50"><Icon name="x" className="h-4 w-4" /></button></div> : <button type="button" onClick={() => setSearchOpen(true)} className="mt-1 w-full rounded-lg border border-dashed border-green-300 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50"><Icon name="search" className="mr-1 inline h-4 w-4" /> Cari ketua</button>}{form.errors.pemimpin_id && <p className="mt-1 text-[10px] text-rose-600">{form.errors.pemimpin_id}</p>}</div><div><label className="text-xs font-semibold text-slate-600">Nota</label><textarea value={form.data.notes} onChange={event => form.setData('notes', event.target.value)} className="input-field mt-1 w-full text-xs" rows="2" placeholder="Catatan tambahan" /></div><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button><button type="submit" disabled={form.processing} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">{form.processing ? 'Menyimpan...' : 'Simpan'}</button></div></form></div>{searchOpen && <PemimpinSearchModal level={kad.level === 'cawangan' ? 'cawangan' : 'udm'} onSelect={selectPemimpin} onClose={() => setSearchOpen(false)} />}</div>;
}

export default function KadTenIndex({ kads = [], scopes = {}, filters = {}, can_manage: canManage = false }) {
    const { auth } = usePage().props;
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editKad, setEditKad] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [selectedPemimpin, setSelectedPemimpin] = useState(null);
    const [pemimpinSearchOpen, setPemimpinSearchOpen] = useState(false);
    const [udmFilter, setUdmFilter] = useState(filters.udm || '');
    const createForm = useForm({ name: '', pemimpin_id: '', level: 'udm', notes: '' });
    const userLevel = auth?.user?.access_level || 'jprd';

    const selectPemimpin = (leader) => {
        setSelectedPemimpin(leader);
        createForm.setData('pemimpin_id', leader.id);
        createForm.setData('level', leader.level);
        createForm.setData('name', leader.name);
        setPemimpinSearchOpen(false);
    };
    const submitCreate = event => {
        event.preventDefault();
        if (!createForm.data.pemimpin_id) {
            createForm.setError('pemimpin_id', 'Sila pilih seorang ketua.');
            return;
        }
        createForm.post(route('kad-ten.store'), { preserveScroll: true, onSuccess: () => { createForm.reset(); setSelectedPemimpin(null); setCreateModalOpen(false); } });
    };
    const handleDelete = kad => {
        if (window.confirm(`Padam ${kad.pemimpin?.name || kad.name || 'Kad 10'}? Semua ahli akan dibuang.`)) router.delete(route('kad-ten.destroy', kad.id), { preserveScroll: true });
    };
    const handleDeleteMember = (kadId, memberId) => {
        if (window.confirm('Buang ahli ini daripada kad?')) router.delete(route('kad-ten.members.destroy', [kadId, memberId]), { preserveScroll: true, preserveState: true });
    };
    const exportWorkbook = async kad => {
        setExporting(true);
        try { await downloadKadWorkbook(kads, kad); } catch { window.alert('Eksport Excel gagal. Sila cuba lagi.'); } finally { setExporting(false); }
    };
    const totalMembers = kads.reduce((total, kad) => total + (kad.member_count || 0), 0);
    const completeKads = kads.filter(kad => kad.is_complete).length;
    const applyUdmFilter = value => {
        setUdmFilter(value);
        router.get(route('kad-ten.index'), value ? { udm: value } : {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return <AuthenticatedLayout header={<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="label-section">Kad 10</p><h2 className="mt-0.5 heading-lg">Agihan ahli di bawah ketua</h2><p className="mt-1 text-xs font-medium text-slate-500">Cari padanan terdekat berdasarkan rumah, alamat dan lokaliti.</p></div><div className="flex flex-wrap gap-2">{kads.length > 0 && <button type="button" disabled={exporting} onClick={() => exportWorkbook(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-bold text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-50"><Icon name="download" className="h-4 w-4" /> {exporting ? 'Menyedia...' : 'Eksport semua'}</button>}{canManage ? <button type="button" onClick={() => setCreateModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-500"><Icon name="plus" className="h-4 w-4" /> Cipta Kad 10</button> : <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"><Icon name="lock" className="h-3.5 w-3.5" /> Paparan JPRD</span>}</div></div>}>
        <Head title="Kad 10" />
        <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
            {!canManage && <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-slate-700">Tapis pemantauan mengikut UDM</p><p className="mt-0.5 text-[10px] text-slate-400">JPRD boleh melihat satu UDM atau semua UDM.</p></div><select value={udmFilter} onChange={event => applyUdmFilter(event.target.value)} className="input-field w-full text-xs sm:w-64"><option value="">Semua UDM</option>{(scopes.udm || []).map(scope => <option key={scope.key} value={scope.key}>{scope.name}</option>)}</select></div>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah kad</p><p className="mt-1 text-xl font-black text-slate-800">{kads.length}</p></div><div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Lengkap</p><p className="mt-1 text-xl font-black text-green-800">{completeKads}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Belum cukup</p><p className="mt-1 text-xl font-black text-amber-800">{Math.max(0, kads.length - completeKads)}</p></div><div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah ahli</p><p className="mt-1 text-xl font-black text-slate-800">{totalMembers}</p></div></div>
            <div className="flex gap-1 border-b border-slate-200"><button type="button" className="rounded-t-lg border-x border-t border-slate-200 bg-white px-4 py-2 text-xs font-bold text-green-700">Kad 10</button><button type="button" onClick={() => router.get(route('kad-ten.senarai-pemilih'))} className="rounded-t-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-green-50 hover:text-green-700">Senarai pemilih belum diagih</button></div>
            {!kads.length ? <div className="rounded-xl border border-dashed border-green-300 bg-white py-14 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700"><Icon name="users" className="h-8 w-8" /></div><p className="mt-4 text-sm font-bold text-slate-600">Belum ada Kad 10</p><p className="mx-auto mt-1 max-w-md px-4 text-xs text-slate-400">{canManage ? 'Cipta kad, pilih mana-mana pemilih sebagai ketua, kemudian pilih ahli yang paling hampir untuk dijaga.' : 'JPRD boleh memantau Kad 10 yang telah diwujudkan oleh UDM.'}</p>{canManage && <button type="button" onClick={() => setCreateModalOpen(true)} className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500">Cipta Kad 10 pertama</button>}</div> : <div className="grid gap-3">{kads.map((kad, index) => <KadCard key={kad.id} kad={kad} cardNumber={index + 1} canManage={canManage && userLevel === 'udm'} onEdit={setEditKad} onDelete={handleDelete} onDeleteMember={handleDeleteMember} onExport={exportWorkbook} />)}</div>}
        </div>

        {createModalOpen && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 pt-16 sm:pt-24" onClick={() => setCreateModalOpen(false)}><div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Cipta Kad 10</p><p className="mt-0.5 text-[10px] text-slate-400">Nama ketua digunakan sebagai rujukan kad.</p></div><button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><Icon name="x" className="h-5 w-5" /></button></div><form onSubmit={submitCreate} className="space-y-3 p-4"><div><label className="text-xs font-semibold text-slate-600">Ketua <span className="text-rose-500">*</span></label>{selectedPemimpin ? <div className="mt-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-green-800">{selectedPemimpin.name}</p><p className="truncate text-[10px] text-green-600">{selectedPemimpin.no_kp || selectedPemimpin.old_ic || '-'} · {selectedPemimpin.position_name || 'Pemilih'}</p></div><button type="button" onClick={() => { setSelectedPemimpin(null); createForm.setData('pemimpin_id', ''); createForm.setData('name', ''); }} className="rounded-md p-1 text-rose-400 hover:bg-rose-50"><Icon name="x" className="h-4 w-4" /></button></div> : <button type="button" onClick={() => setPemimpinSearchOpen(true)} className="mt-1 w-full rounded-lg border border-dashed border-green-300 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50"><Icon name="search" className="mr-1 inline h-4 w-4" /> Cari & pilih ketua</button>}{createForm.errors.pemimpin_id && <p className="mt-1 text-[10px] text-rose-600">{createForm.errors.pemimpin_id}</p>}</div><div><label className="text-xs font-semibold text-slate-600">Nota</label><textarea value={createForm.data.notes} onChange={event => createForm.setData('notes', event.target.value)} className="input-field mt-1 w-full text-xs" rows="2" placeholder="Catatan tambahan" /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button><button type="submit" disabled={createForm.processing} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50">{createForm.processing ? 'Mencipta...' : 'Cipta kad'}</button></div></form></div>{pemimpinSearchOpen && <PemimpinSearchModal onSelect={selectPemimpin} onClose={() => setPemimpinSearchOpen(false)} />}</div>}
        {editKad && <EditKadModal kad={editKad} onClose={() => setEditKad(null)} />}
    </AuthenticatedLayout>;
}
