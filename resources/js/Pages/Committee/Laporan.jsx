import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function escapeXml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const memberExportColumns = ['Bil', 'Jawatan', 'Nama', 'No. KP', 'Peringkat', 'No. Tel', 'Kumpulan'];

function buildMemberRows(members, groups = []) {
    return members.map((member, index) => {
        const group = groups.find((item) => item.id === member.committee_group_id);
        const scope = member.parent_scope_name ? `${member.parent_scope_name} / ${member.scope_name || '-'}` : (member.scope_name || '-');

        return [
            index + 1,
            member.position?.name || '-',
            member.voter?.name || '-',
            member.voter?.no_kp || member.voter?.old_ic || '-',
            scope,
            member.voter?.phone_mobile || member.voter?.phone_home || '-',
            group?.name || 'Tanpa Kumpulan',
        ];
    });
}

function buildMemberListText(title, members, groups = []) {
    return [
        '*' + title + '*',
        '',
        ...members.map((member, index) => {
            const group = groups.find((item) => item.id === member.committee_group_id);
            const scope = member.parent_scope_name ? `${member.parent_scope_name} / ${member.scope_name || '-'}` : (member.scope_name || '-');
            const position = member.position?.name || 'Tanpa Jawatan';
            const name = member.voter?.name || '-';

            return `${index + 1}. ${name} — ${position} — ${scope} — ${group?.name || 'Tanpa Kumpulan'}`;
        }),
    ].join('\n');
}

function downloadExcel(filename, title, columns, rows) {
    const widths = columns.map((_, index) => {
        if (index === 0) return 30;
        if (index === 2) return 420;
        if (index === 5) return 130;
        return 160;
    });
    const alignments = columns.map((_, index) => (index === 0 || index === 1 || index === 3 || index === 4 || index === 5 ? 'center' : 'left'));
    const colXml = widths.map((width) => `<Column ss:AutoFitWidth="1" ss:Width="${width}"/>`).join('');
    const titleXml = `<Row><Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="titleMain"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`;
    const headerXml = '<Row>' + columns.map((column, index) => `<Cell ss:StyleID="${alignments[index] === 'center' ? 'headerCenter' : 'header'}"><Data ss:Type="String">${escapeXml(column)}</Data></Cell>`).join('') + '</Row>';
    const bodyXml = rows.map((row) => '<Row>' + row.map((value, index) => `<Cell ss:StyleID="${alignments[index] === 'center' ? 'cellCenter' : 'cell'}"><Data ss:Type="${index === 0 ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`).join('') + '</Row>').join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style>
<Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
<Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
<Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
<Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style>
</Styles>
<Worksheet ss:Name="Jawatankuasa"><Table>${colXml}${titleXml}${headerXml}${bodyXml}</Table></Worksheet>
</Workbook>`;
    const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Use the legacy fallback below when clipboard permissions are unavailable.
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
}

function ExportButtons({ text, onExport }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!await copyToClipboard(text)) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                title="Salin senarai"
            >
                <Icon name={copied ? 'check' : 'copy'} className="h-3 w-3" />
                {copied ? 'Disalin' : 'Copy'}
            </button>
            <button
                type="button"
                onClick={onExport}
                className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                title="Eksport Excel"
            >
                <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">X</span>
                Excel
            </button>
        </div>
    );
}

const levelMeta = {
    jprd: { label: 'JPRD', bg: 'bg-green-100', text: 'text-green-700' },
    udm: { label: 'UDM', bg: 'bg-sky-100', text: 'text-sky-700' },
    cawangan: { label: 'Cawangan', bg: 'bg-purple-100', text: 'text-purple-700' },
};

const levelOptions = [
    { key: 'jprd', label: 'JPRD' },
    { key: 'udm', label: 'UDM' },
    { key: 'cawangan', label: 'Cawangan' },
    { key: 'udm-jawatan', label: 'Kumpulan Jawatan UDM' },
    { key: 'udm-kumpulan', label: 'Pilih Kumpulan UDM' },
];

function DetailPopup({ scope, members, level, groups, highlight, onClose, onAvatarClick }) {
    const [copiedGroupId, setCopiedGroupId] = useState(null);
    if (!scope) return null;

    const groupedByGroup = {};
    members.forEach((m) => {
        const gid = m.committee_group_id || 'tanpa-kumpulan';
        const grp = groups.find((g) => g.id === m.committee_group_id);
        if (!groupedByGroup[gid]) groupedByGroup[gid] = { groupName: grp?.name || 'Tanpa Kumpulan', members: [], sortOrder: grp?.sort_order ?? 999, group: grp };
        groupedByGroup[gid].members.push(m);
    });

    Object.values(groupedByGroup).forEach((g) => {
        g.members.sort((a, b) => (a.position?.sort_order ?? 999) - (b.position?.sort_order ?? 999));
    });

    const sortedGroups = Object.entries(groupedByGroup).sort(([, a], [, b]) => a.sortOrder - b.sortOrder);

    const buildGroupText = (g) => {
        const lines = [];
        lines.push('*' + g.groupName + '*');
        lines.push('');
        const byPos = {};
        g.members.forEach((m) => {
            const pname = m.position?.name || 'Tanpa Jawatan';
            if (!byPos[pname]) byPos[pname] = [];
            byPos[pname].push(m);
        });
        Object.entries(byPos).forEach(([pname, ms]) => {
            lines.push('*' + pname + '*');
            ms.forEach((m, i) => {
                if (ms.length === 1) {
                    lines.push(m.voter?.name || '-');
                } else {
                    lines.push((i + 1) + '. ' + (m.voter?.name || '-'));
                }
            });
            lines.push('');
        });
        return lines.join('\n');
    };

    const handleCopyGroup = async (gid, g) => {
        const text = buildGroupText(g);
        const flash = (ok) => {
            if (!ok) return;
            setCopiedGroupId(gid);
            setTimeout(() => setCopiedGroupId((cur) => (cur === gid ? null : cur)), 2000);
        };
        try {
            await navigator.clipboard.writeText(text);
            flash(true);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            flash(ok);
        }
    };

    const isMatching = (name) => {
        if (!highlight || !highlight.trim()) return false;
        return name?.toLowerCase().includes(highlight.toLowerCase());
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            {levelMeta[level]?.label ?? level} — {scope.parent_scope_name ? `${scope.parent_scope_name} / ` : ''}{scope.name}
                        </p>
                        <p className="text-xs text-slate-500">{members.length} orang ahli jawatankuasa</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-4">
                    {members.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada ahli jawatankuasa.</p>
                    ) : (
                        <div className="space-y-3">
                            {sortedGroups.map(([gid, g]) => (
                                <div key={gid} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{g.groupName}</p>
                                            <p className="text-[10px] text-slate-400">{g.members.length} ahli{(() => {
                                                const latest = Math.max(...g.members.map((m) => new Date(m.updated_at).getTime()), 0);
                                                if (!latest) return '';
                                                const d = new Date(latest);
                                                const dd = String(d.getDate()).padStart(2, '0');
                                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                const yy = d.getFullYear();
                                                const hh = String(d.getHours()).padStart(2, '0');
                                                const mi = String(d.getMinutes()).padStart(2, '0');
                                                return ' — kemaskini: ' + dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
                                            })()}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyGroup(gid, g)}
                                            className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                            title="Salin senarai untuk WhatsApp"
                                        >
                                            <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">{copiedGroupId === gid ? <Icon name="check" className="h-2.5 w-2.5" /> : 'C'}</span>
                                            {copiedGroupId === gid ? 'Disalin' : 'Copy'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
                                                const align = ['center', 'center', 'left', 'center'];
                                                const widths = [30, 150, 520, 100];
                                                const dataRows = g.members.map((m, i) => [
                                                    { value: i + 1, type: 'Number', align: 'center' },
                                                    { value: m.position?.name ?? '-', type: 'String', align: 'center' },
                                                    { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
                                                    { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
                                                ]);
                                                const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
                                                const titleXml = '<Row><Cell ss:MergeAcross="' + (cols.length - 1) + '" ss:StyleID="titleMain"><Data ss:Type="String">' + escapeXml(g.groupName) + ' — ' + (levelMeta[level]?.label ?? level) + '</Data></Cell></Row>';
                                                const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
                                                const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');
                                         const xml = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style></Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>' + titleXml + headerXml + bodyXml + '</Table></Worksheet></Workbook>';
                                                 const workbookXml = xml.replace(
                                                     '</Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>',
                                                     '</Styles><Worksheet ss:Name="AJK"><Table>' + colXml,
                                                 );
                                                 const blob = new Blob(['\uFEFF' + workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                const scopePart = scope.parent_scope_name ? scope.parent_scope_name.replace(/[\/\s]+/g, '_') + '_' + scope.name.replace(/[\/\s]+/g, '_') : scope.name.replace(/[\/\s]+/g, '_');
                                                link.download = 'AJK_' + g.groupName.replace(/[\/\s]+/g, '_') + '_' + (levelMeta[level]?.label ?? level) + '_' + scopePart + '.xls';
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                        >
                                            <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">X</span>
                                            Excel
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                        {g.members.map((m) => {
                                            const match = isMatching(m.voter?.name);
                                            return (
                                            <div key={m.id} className={'flex items-center gap-3 rounded-lg px-3 py-2 transition ' + (match ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-slate-50 hover:bg-slate-100')}>
                                                <div className="h-8 w-8 shrink-0">
                                                    {m.voter?.avatar_url ? (
                                                        <img src={m.voter.avatar_url} alt="" className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => onAvatarClick?.(m.voter.avatar_url)} />
                                                    ) : (
                                                        <div className={'flex h-8 w-8 items-center justify-center rounded-full ' + (match ? 'bg-amber-200 text-amber-800' : 'bg-green-100 text-green-700')}>
                                                            <Icon name="user" className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={'text-xs font-bold ' + (match ? 'text-amber-900' : 'text-slate-800')}>{m.voter?.name}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        <span>{m.voter?.no_kp || m.voter?.old_ic || '-'}</span>
                                                        {(m.voter?.phone_mobile || m.voter?.phone_home) && <span className="ml-2 text-slate-500"><Icon name="phone" className="mr-0.5 inline h-2 w-2 align-middle" />{m.voter?.phone_mobile || m.voter?.phone_home}</span>}
                                                    </p>
                                                    <span className="mt-0.5 inline-block rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">{m.position?.name}</span>
                                                    {m.notes && <p className="mt-0.5 text-[9px] text-amber-600">{m.notes}</p>}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UdmPositionPopup({ position, members, groups, onClose, onAvatarClick }) {
    if (!position) return null;

    const title = 'UDM — ' + position.name;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">{title}</p>
                        <p className="text-xs text-slate-500">{members.length} orang ahli</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {members.length > 0 && (
                            <ExportButtons
                                text={buildMemberListText(title, members, groups)}
                                onExport={() => downloadExcel('AJK_UDM_' + position.name.replace(/[\/\s]+/g, '_') + '.xls', title, memberExportColumns, buildMemberRows(members, groups))}
                            />
                        )}
                        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Icon name="x" className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto p-4">
                    {members.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada ahli.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 transition">
                                    <div className="h-8 w-8 shrink-0">
                                        {m.voter?.avatar_url ? (
                                            <img src={m.voter.avatar_url} alt="" className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => onAvatarClick?.(m.voter.avatar_url)} />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                                                <Icon name="user" className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800">{m.voter?.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                            <span>{m.voter?.no_kp || m.voter?.old_ic || '-'}</span>
                                            {(m.voter?.phone_mobile || m.voter?.phone_home) && <span className="ml-2 text-slate-500"><Icon name="phone" className="mr-0.5 inline h-2 w-2 align-middle" />{m.voter?.phone_mobile || m.voter?.phone_home}</span>}
                                        </p>
                                        <span className="mt-0.5 inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{m.scope_name || 'Tiada UDM'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CommitteeLaporan({ memberships, scopes, groups }) {
    const [activeTab, setActiveTab] = useState('jprd');
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [detailScope, setDetailScope] = useState(null);
    const [detailPosition, setDetailPosition] = useState(null);
    const [detailGroup, setDetailGroup] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPositionIds, setSelectedPositionIds] = useState([]);
    const [copiedGroupFlag, setCopiedGroupFlag] = useState(false);

    const handleCopyGroupText = async (groupName, members) => {
        const lines = [];
        lines.push('*' + groupName + '*');
        lines.push('');
        const byPos = {};
        members.forEach((m) => {
            const pname = m.position?.name || 'Tanpa Jawatan';
            if (!byPos[pname]) byPos[pname] = [];
            byPos[pname].push(m);
        });
        Object.entries(byPos).forEach(([pname, ms]) => {
            lines.push('*' + pname + '*');
            ms.forEach((m, i) => {
                if (ms.length === 1) {
                    lines.push(m.voter?.name || '-');
                } else {
                    lines.push((i + 1) + '. ' + (m.voter?.name || '-'));
                }
            });
            lines.push('');
        });
        const text = lines.join('\n');
        const flash = (ok) => {
            if (!ok) return;
            setCopiedGroupFlag(true);
            setTimeout(() => setCopiedGroupFlag(false), 2000);
        };
        try {
            await navigator.clipboard.writeText(text);
            flash(true);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            flash(ok);
        }
    };

    useEffect(() => {
        setSelectedPositionIds([]);
    }, [activeTab]);

    const currentScopes = scopes[activeTab] ?? [];

    const udmMembers = useMemo(() => {
        return memberships.filter((m) => m.level === 'udm');
    }, [memberships]);

    const positionStats = useMemo(() => {
        const posMap = {};
        udmMembers.forEach((m) => {
            const pid = m.position?.id || 'tanpa-jawatan';
            const pname = m.position?.name || 'Tanpa Jawatan';
            if (!posMap[pid]) posMap[pid] = { id: pid, name: pname, members: [] };
            posMap[pid].members.push(m);
        });
        return Object.values(posMap).sort((a, b) => a.name.localeCompare(b.name));
    }, [udmMembers]);

    const udmPositionStats = useMemo(() => {
        const posMap = {};
        udmMembers.forEach((m) => {
            const pid = m.position?.id || 'tanpa-jawatan';
            const pname = m.position?.name || 'Tanpa Jawatan';
            if (!posMap[pid]) posMap[pid] = { id: pid, name: pname, members: [] };
            posMap[pid].members.push(m);
        });
        return Object.values(posMap).sort((a, b) => a.name.localeCompare(b.name));
    }, [udmMembers]);

    const mergedPositionMembers = useMemo(() => {
        if (selectedPositionIds.length === 0) return [];
        const result = [];
        selectedPositionIds.forEach((pid) => {
            const pos = udmPositionStats.find((p) => String(p.id) === String(pid));
            if (pos) result.push(...pos.members);
        });
        const seen = new Set();
        return result.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });
    }, [selectedPositionIds, udmPositionStats]);

    const filteredMergedMembers = useMemo(() => {
        if (activeTab !== 'udm-kumpulan' || !searchQuery.trim()) return mergedPositionMembers;
        const q = searchQuery.toLowerCase();
        return mergedPositionMembers.filter((m) => {
            if (m.voter?.name?.toLowerCase().includes(q)) return true;
            if ((m.voter?.no_kp || m.voter?.old_ic || '').includes(q)) return true;
            if (m.voter?.phone_mobile?.includes(q)) return true;
            if (m.voter?.phone_home?.includes(q)) return true;
            if (m.position?.name?.toLowerCase().includes(q)) return true;
            if (m.scope_name?.toLowerCase().includes(q)) return true;
            return false;
        });
    }, [mergedPositionMembers, searchQuery, activeTab]);

    const scopeStats = useMemo(() => {
        return currentScopes.map((scope) => {
            const scopeMembers = memberships.filter((m) => m.level === activeTab && m.scope_key === scope.key);
            const groupSet = new Set();
            scopeMembers.forEach((m) => {
                const g = groups.find((g) => g.id === m.committee_group_id);
                groupSet.add(g?.name ?? 'Tanpa Kumpulan');
            });
            return {
                ...scope,
                totalMembers: scopeMembers.length,
                groupNames: [...groupSet],
                members: scopeMembers,
            };
        });
    }, [currentScopes, memberships, activeTab]);

    const jprdGroupStats = useMemo(() => {
        const jprdMembers = memberships.filter((m) => m.level === 'jprd');
        const groupMap = {};
        jprdMembers.forEach((m) => {
            const gid = m.committee_group_id || 'tanpa-kumpulan';
            const grp = groups.find((g) => g.id === m.committee_group_id);
            if (!groupMap[gid]) {
                groupMap[gid] = { groupName: grp?.name || 'Tanpa Kumpulan', members: [], sortOrder: grp?.sort_order ?? 999 };
            }
            groupMap[gid].members.push(m);
        });
        Object.values(groupMap).forEach((g) => {
            g.members.sort((a, b) => (a.position?.sort_order ?? 999) - (b.position?.sort_order ?? 999));
        });
        let result = Object.entries(groupMap)
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([, v]) => v);
        if (activeTab === 'jprd' && searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.map((g) => ({ ...g, members: g.members.filter((m) => m.voter?.name?.toLowerCase().includes(q) || (m.voter?.no_kp || m.voter?.old_ic || '').includes(q) || m.voter?.phone_mobile?.includes(q) || m.voter?.phone_home?.includes(q) || m.position?.name?.toLowerCase().includes(q)) })).filter((g) => g.members.length > 0);
        }
        return result;
    }, [memberships, groups, searchQuery, activeTab]);

    const filteredScopeStats = useMemo(() => {
        if (activeTab === 'jprd' || activeTab === 'udm-jawatan' || activeTab === 'udm-kumpulan') return [];
        let list = scopeStats;
        if (activeTab === 'cawangan') {
            list = list.filter((scope) => scope.totalMembers > 0);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((scope) => {
                if (scope.name.toLowerCase().includes(q)) return true;
                if (scope.parent_scope_name && scope.parent_scope_name.toLowerCase().includes(q)) return true;
                if (scope.members.some((m) => m.voter?.name?.toLowerCase().includes(q))) return true;
                if (scope.groupNames.some((g) => g.toLowerCase().includes(q))) return true;
                return false;
            });
        }
        return [...list].sort((a, b) => {
            const aLatest = Math.max(...a.members.map((m) => new Date(m.updated_at).getTime()), 0);
            const bLatest = Math.max(...b.members.map((m) => new Date(m.updated_at).getTime()), 0);
            return bLatest - aLatest;
        });
    }, [scopeStats, searchQuery, activeTab]);

    const filteredPositionStats = useMemo(() => {
        if (activeTab !== 'udm-jawatan') return [];
        let list = positionStats.filter((p) => p.members.length > 0);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((p) => {
                if (p.name.toLowerCase().includes(q)) return true;
                if (p.members.some((m) => m.voter?.name?.toLowerCase().includes(q))) return true;
                if (p.members.some((m) => m.scope_name?.toLowerCase().includes(q))) return true;
                return false;
            });
        }
        return list;
    }, [positionStats, searchQuery, activeTab]);

    const currentTabMembers = activeTab === 'jprd'
        ? jprdGroupStats.flatMap((group) => group.members)
        : activeTab === 'udm-jawatan'
            ? filteredPositionStats.flatMap((position) => position.members)
            : activeTab === 'udm-kumpulan'
                ? filteredMergedMembers
                : filteredScopeStats.flatMap((scope) => scope.members);
    const currentTabLabel = levelOptions.find((option) => option.key === activeTab)?.label ?? activeTab.toUpperCase();
    const currentTabTitle = 'Senarai AJK ' + currentTabLabel;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Jawatankuasa</p>
                        <h2 className="mt-0.5 heading-lg">Senarai AJK mengikut peringkat</h2>
                    </div>
                </div>
            }
        >
            <Head title="Senarai AJK" />

            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap gap-1 border-b border-slate-200 px-4 py-3 bg-slate-50/50">
                        {levelOptions.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => setActiveTab(opt.key)}
                                className={'rounded-lg px-3 py-1.5 text-xs font-bold transition ' + (activeTab === opt.key ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700')}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="border-b border-slate-200 px-4 py-3">
                        <div className="relative">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama ahli, peringkat atau kumpulan..."
                                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-green-300 focus:ring-1 focus:ring-green-300"
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                    <Icon name="x" className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4">
                        {currentTabMembers.length > 0 && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-100 bg-green-50/50 px-3 py-2">
                                <p className="text-xs font-bold text-green-800">{currentTabTitle} ({currentTabMembers.length} orang)</p>
                                <ExportButtons
                                    text={buildMemberListText(currentTabTitle, currentTabMembers, groups)}
                                    onExport={() => downloadExcel('AJK_' + currentTabLabel.replace(/[\/\s]+/g, '_') + '.xls', currentTabTitle, memberExportColumns, buildMemberRows(currentTabMembers, groups))}
                                />
                            </div>
                        )}
                        {activeTab === 'udm-jawatan' ? (
                            filteredPositionStats.length === 0 ? (
                                <p className="py-8 text-center text-xs text-slate-400">Tiada jawatan dengan ahli UDM.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {filteredPositionStats.map((pos) => (
                                        <div key={pos.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800">{pos.name}</p>
                                                <p className="mt-0.5 text-[10px] text-green-600">{pos.members.length} orang</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailPosition(pos)}
                                                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-100"
                                                >
                                                    Jawatankuasa
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : activeTab === 'udm-kumpulan' ? (
                            <div>
                                <p className="mb-3 text-xs font-bold text-slate-700">Pilih satu atau lebih jawatan untuk melihat ahli gabungan:</p>
                                <div className="mb-6 flex flex-wrap gap-2">
                                    {udmPositionStats.map((p) => {
                                        const isSelected = selectedPositionIds.includes(String(p.id));
                                        return (
                                            <label
                                                key={p.id}
                                                className={'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ' + (isSelected ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50')}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        setSelectedPositionIds((prev) =>
                                                            prev.includes(String(p.id))
                                                                ? prev.filter((id) => id !== String(p.id))
                                                                : [...prev, String(p.id)]
                                                        );
                                                    }}
                                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{p.members.length}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {selectedPositionIds.length > 0 ? (
                                    filteredMergedMembers.length > 0 ? (
                                        <div>
                                            <p className="mb-2 text-xs font-bold text-slate-700">
                                                Senarai Ahli Gabungan ({filteredMergedMembers.length} orang)
                                                {selectedPositionIds.length > 1 && (
                                                    <span className="ml-2 font-normal text-slate-400">
                                                        — {selectedPositionIds.length} jawatan
                                                    </span>
                                                )}
                                            </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {filteredMergedMembers.map((m) => {
                                                    const grp = groups.find((g) => g.id === m.committee_group_id);
                                                    return (
                                                        <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100">
                                                            <div className="h-8 w-8 shrink-0">
                                                                {m.voter?.avatar_url ? (
                                                                    <img src={m.voter.avatar_url} alt="" className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => setLightboxSrc(m.voter.avatar_url)} />
                                                                ) : (
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                                                        <Icon name="user" className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs font-bold text-slate-800">{m.voter?.name}</p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {m.voter?.no_kp || m.voter?.old_ic || '-'}
                                                                    {m.scope_name ? <span className="text-sky-500"> — {m.scope_name}</span> : ''}
                                                                </p>
                                                                {(m.voter?.phone_mobile || m.voter?.phone_home) && (
                                                                    <p className="text-[10px] text-slate-500"><Icon name="phone" className="mr-0.5 inline h-2 w-2 align-middle" />{m.voter?.phone_mobile || m.voter?.phone_home}</p>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{m.position?.name}</span>
                                                                <p className="text-[9px] text-slate-400">{grp?.name}</p>
                                                                {m.notes && <p className="mt-0.5 text-[9px] text-amber-600">{m.notes}</p>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="py-8 text-center text-xs text-slate-400">Tiada ahli dalam jawatan yang dipilih.</p>
                                    )
                                ) : (
                                    <p className="py-8 text-center text-xs text-slate-400">Sila pilih satu atau lebih jawatan untuk melihat senarai ahli gabungan.</p>
                                )}
                            </div>
                        ) : activeTab === 'jprd' ? (
                            jprdGroupStats.length === 0 ? (
                                <p className="py-8 text-center text-xs text-slate-400">Tiada data untuk peringkat ini.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {jprdGroupStats.map((g) => (
                                        <div key={g.groupName} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800">{g.groupName}</p>
                                                {g.members.length > 0 ? (
                                                    <p className="mt-0.5 text-[10px] text-green-600">{g.members.length} ahli</p>
                                                ) : (
                                                    <p className="mt-0.5 text-[10px] text-amber-600">Belum ada ahli</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {g.members.length > 0 && (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{g.members.length}</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailGroup(g.members.length > 0 ? g : null)}
                                                    disabled={g.members.length === 0}
                                                    className={'rounded-lg border px-3 py-1.5 text-xs font-bold transition ' + (g.members.length > 0 ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed')}
                                                >
                                                    Jawatankuasa
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : filteredScopeStats.length === 0 ? (
                            <p className="py-8 text-center text-xs text-slate-400">Tiada data untuk peringkat ini.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {filteredScopeStats.map((scope) => {
                                    const hasMembers = scope.totalMembers > 0;
                                    return (
                                        <div key={scope.key} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition hover:bg-slate-50">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800">
                                                    {scope.parent_scope_name && (
                                                        <span className="text-slate-400">{scope.parent_scope_name} / </span>
                                                    )}
                                                    {scope.name}
                                                </p>
                                                {hasMembers ? (
                                                    <p className="mt-0.5 text-[10px] text-green-600">
                                                        {scope.totalMembers} ahli — {scope.groupNames.join(', ')}
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 text-[10px] text-amber-600">Belum ada ahli</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {hasMembers && (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{scope.totalMembers}</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailScope(hasMembers ? scope : null)}
                                                    disabled={!hasMembers}
                                                    className={'rounded-lg border px-3 py-1.5 text-xs font-bold transition ' + (hasMembers ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed')}
                                                >
                                                    Jawatankuasa
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {detailScope && (
                <DetailPopup
                    scope={detailScope}
                    members={memberships.filter((m) => m.level === activeTab && m.scope_key === detailScope.key)}
                    level={activeTab}
                    groups={groups}
                    highlight={searchQuery}
                    onClose={() => setDetailScope(null)}
                    onAvatarClick={setLightboxSrc}
                />
            )}

            {detailPosition && (
                <UdmPositionPopup
                    position={detailPosition}
                    members={detailPosition.members}
                    groups={groups}
                    onClose={() => setDetailPosition(null)}
                    onAvatarClick={setLightboxSrc}
                />
            )}

            {detailGroup && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={() => setDetailGroup(null)}>
                    <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                            <div>
                                <p className="text-sm font-bold text-slate-800">JPRD — {detailGroup.groupName}</p>
                                <p className="text-xs text-slate-500">{detailGroup.members.length} orang ahli jawatankuasa</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
                                        const align = ['center', 'center', 'left', 'center'];
                                        const widths = [30, 150, 520, 100];
                                        const dataRows = detailGroup.members.map((m, i) => [
                                            { value: i + 1, type: 'Number', align: 'center' },
                                            { value: m.position?.name ?? '-', type: 'String', align: 'center' },
                                            { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
                                            { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
                                        ]);
                                        const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
                                        const titleXml = '<Row><Cell ss:MergeAcross="' + (cols.length - 1) + '" ss:StyleID="titleMain"><Data ss:Type="String">' + escapeXml('JPRD — ' + detailGroup.groupName) + '</Data></Cell></Row>';
                                        const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
                                        const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');
                                         const xml = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style></Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>' + titleXml + headerXml + bodyXml + '</Table></Worksheet></Workbook>';
                                         const workbookXml = xml.replace(
                                             '</Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>',
                                             '</Styles><Worksheet ss:Name="AJK"><Table>' + colXml,
                                         );
                                         const blob = new Blob(['\uFEFF' + workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = 'AJK_JPRD_' + detailGroup.groupName.replace(/[\/\s]+/g, '_') + '.xls';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                >
                                    <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">X</span>
                                    Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCopyGroupText(detailGroup.groupName, detailGroup.members)}
                                    className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                    title="Salin senarai untuk WhatsApp"
                                >
                                    <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">{copiedGroupFlag ? <Icon name="check" className="h-2.5 w-2.5" /> : 'C'}</span>
                                    {copiedGroupFlag ? 'Disalin' : 'Copy'}
                                </button>
                                <button type="button" onClick={() => setDetailGroup(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                    <Icon name="x" className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4">
                            {detailGroup.members.length === 0 ? (
                                <p className="py-8 text-center text-xs text-slate-400">Tiada ahli jawatankuasa.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-200 p-2">
                                    {detailGroup.members.map((m) => {
                                        const match = searchQuery.trim() && m.voter?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                                        return (
                                        <div key={m.id} className={'flex items-center gap-3 rounded-lg px-3 py-2 transition ' + (match ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-slate-50 hover:bg-slate-100')}>
                                            <div className="h-8 w-8 shrink-0">
                                                {m.voter?.avatar_url ? (
                                                    <img src={m.voter.avatar_url} alt="" className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => setLightboxSrc(m.voter.avatar_url)} />
                                                ) : (
                                                    <div className={'flex h-8 w-8 items-center justify-center rounded-full ' + (match ? 'bg-amber-200 text-amber-800' : 'bg-green-100 text-green-700')}>
                                                        <Icon name="user" className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={'text-xs font-bold ' + (match ? 'text-amber-900' : 'text-slate-800')}>{m.voter?.name}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    <span>{m.voter?.no_kp || m.voter?.old_ic || '-'}</span>
                                                    {(m.voter?.phone_mobile || m.voter?.phone_home) && <span className="ml-2 text-slate-500"><Icon name="phone" className="mr-0.5 inline h-2 w-2 align-middle" />{m.voter?.phone_mobile || m.voter?.phone_home}</span>}
                                                </p>
                                                <span className="mt-0.5 inline-block rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">{m.position?.name}</span>
                                                {m.notes && <p className="mt-0.5 text-[9px] text-amber-600">{m.notes}</p>}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {lightboxSrc && (
                <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}
        </AuthenticatedLayout>
    );
}
