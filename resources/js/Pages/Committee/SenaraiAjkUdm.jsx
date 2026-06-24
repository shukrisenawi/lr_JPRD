import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        mapPin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        idCard: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3" /><path d="M14 11h3" /><path d="M7 14h10" /></>,
        eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
        empty: <><circle cx="12" cy="12" r="10" /><path d="M8 15h8" /><path d="M9 9h.01" /><path d="M15 9h.01" /></>,
        copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function escapeXml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function GroupMembersPopup({ group, onClose, onAvatarClick }) {
    const [copied, setCopied] = useState(false);
    if (!group) return null;

    const sortedMembers = [...group.members].sort((a, b) => (a.position?.sort_order ?? 999) - (b.position?.sort_order ?? 999));

    const buildWhatsappText = () => {
        const lines = [];
        lines.push('*' + group.name + '*');
        lines.push('');
        const positions = group.positionsWithMembers || [];
        positions.forEach(pos => {
            if (pos.members.length === 0) return;
            lines.push('*' + pos.name + '*');
            pos.members.forEach((m, i) => {
                if (pos.members.length === 1) {
                    lines.push(m.voter?.name || '-');
                } else {
                    lines.push((i + 1) + '. ' + (m.voter?.name || '-'));
                }
            });
            lines.push('');
        });
        return lines.join('\n');
    };

    const handleCopy = async () => {
        const text = buildWhatsappText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const exportToExcel = () => {
        const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
        const align = ['center', 'center', 'left', 'center'];
        const widths = [30, 150, 520, 100];
        const dataRows = sortedMembers.map((m, i) => [
            { value: i + 1, type: 'Number', align: 'center' },
            { value: m.position?.name ?? '-', type: 'String', align: 'center' },
            { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
            { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
        ]);

        const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
        const titleXml = '<Row><Cell ss:MergeAcross="' + (cols.length - 1) + '" ss:StyleID="titleMain"><Data ss:Type="String">' + escapeXml(group.name) + ' — UDM</Data></Cell></Row>';
        const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
        const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');

        const xml = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style></Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>' + titleXml + headerXml + bodyXml + '</Table></Worksheet></Workbook>';

        const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'AJK_UDM_' + group.name.replace(/[\/\s]+/g, '_') + '.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">{group.name}</p>
                        <p className="text-xs text-slate-500">{group.members.length} orang ahli</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {group.members.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                title="Salin senarai untuk WhatsApp"
                            >
                                <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">{copied ? <Icon name="check" className="h-2.5 w-2.5" /> : 'C'}</span>
                                {copied ? 'Disalin' : 'Copy'}
                            </button>
                        )}
                        {group.members.length > 0 && (
                            <button
                                type="button"
                                onClick={exportToExcel}
                                className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                            >
                                <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">X</span>
                                Excel
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Icon name="x" className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto p-4">
                    {group.members.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                            <Icon name="empty" className="mx-auto h-10 w-10 text-slate-300" />
                            <p className="mt-2 text-xs text-slate-400">Tiada ahli dalam kumpulan ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sortedMembers.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
                                    <div className="h-10 w-10 shrink-0">
                                        {m.voter?.avatar_url ? (
                                            <img src={m.voter.avatar_url} alt="" className="h-10 w-10 cursor-pointer rounded-full border border-slate-200 object-cover" onClick={() => onAvatarClick?.(m.voter.avatar_url)} />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                                                <Icon name="user" className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800">{m.voter?.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                            <span>{m.voter?.no_kp || m.voter?.old_ic || '-'}</span>
                                            {(m.voter?.phone_mobile || m.voter?.phone_home) && (
                                                <span className="ml-2 text-slate-500">
                                                    <Icon name="phone" className="mr-0.5 inline h-2 w-2 align-middle" />{m.voter?.phone_mobile || m.voter?.phone_home}
                                                </span>
                                            )}
                                        </p>
                                        <span className="mt-1 inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{m.position?.name}</span>
                                        {m.notes && <p className="mt-0.5 text-[9px] text-amber-600">{m.notes}</p>}
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

export default function SenaraiAjkUdm({ dm, memberships, groups }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const groupsWithMembers = useMemo(() => {
        return groups
            .map((group) => {
                const udmPositions = (group.positions || [])
                    .filter((p) => p.pivot_level === 'udm')
                    .sort((a, b) => (a.pivot_sort_order ?? 0) - (b.pivot_sort_order ?? 0));

                const positionsWithMembers = udmPositions.map((pos) => ({
                    ...pos,
                    members: memberships.filter((m) => m.position?.id === pos.id && m.committee_group_id === group.id),
                }));

                const totalMembers = positionsWithMembers.reduce((sum, p) => sum + p.members.length, 0);

                return { ...group, positionsWithMembers, totalMembers };
            })
            .filter((g) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                if (g.name.toLowerCase().includes(q)) return true;
                if (g.description && g.description.toLowerCase().includes(q)) return true;
                if (g.positionsWithMembers.some((p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.members.some((m) =>
                        m.voter?.name?.toLowerCase().includes(q) ||
                        (m.voter?.no_kp || '').includes(q) ||
                        (m.voter?.old_ic || '').includes(q)
                    )
                )) return true;
                return false;
            });
    }, [groups, memberships, searchQuery]);

    const totalMembers = useMemo(() => memberships.length, [memberships]);
    const groupsWithAnyMembers = useMemo(() => groupsWithMembers.filter((g) => g.totalMembers > 0), [groupsWithMembers]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Senarai AJK</p>
                        <h2 className="mt-0.5 heading-lg">Senarai AJK UDM — {dm}</h2>
                        <p className="mt-1 text-xs text-slate-500">Senarai kumpulan jawatan dan ahli jawatankuasa untuk UDM anda sahaja.</p>
                    </div>
                </div>
            }
        >
            <Head title="Senarai AJK UDM" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                                <Icon name="mapPin" className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">UDM</p>
                                <p className="text-sm font-bold text-slate-800">{dm}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                                <Icon name="layers" className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Kumpulan</p>
                                <p className="text-sm font-bold text-slate-800">{groupsWithAnyMembers.length} kumpulan</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                                <Icon name="users" className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Jumlah Ahli</p>
                                <p className="text-sm font-bold text-slate-800">{totalMembers} orang</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-sky-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-sky-100 px-4 py-3">
                        <div className="relative">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama ahli, jawatan atau kumpulan..."
                                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-300"
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                    <Icon name="x" className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-4">
                        {groupsWithMembers.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/50 py-10 text-center">
                                <Icon name="empty" className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-2 text-xs text-slate-400">
                                    {searchQuery.trim() ? 'Tiada kumpulan atau ahli yang sepadan dengan carian.' : 'Tiada kumpulan jawatan untuk UDM ini lagi.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {groupsWithMembers.map((group) => (
                                    <div
                                        key={group.id}
                                        className={'flex items-center gap-3 rounded-lg border px-3 py-3 transition ' + (group.totalMembers > 0 ? 'border-sky-100 bg-white hover:border-sky-300 hover:bg-sky-50/50' : 'border-slate-100 bg-slate-50/50')}
                                    >
                                        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' + (group.totalMembers > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400')}>
                                            <Icon name="layers" className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800">{group.name}</p>
                                            {group.description && <p className="mt-0.5 text-[10px] text-slate-400 truncate">{group.description}</p>}
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                {group.totalMembers > 0 ? (
                                                    <p className="text-[10px] font-semibold text-sky-600">
                                                        {group.totalMembers} ahli
                                                        {group.positionsWithMembers.filter((p) => p.members.length > 0).length > 0 && (
                                                            <span className="ml-1 text-slate-400">
                                                                — {group.positionsWithMembers.filter((p) => p.members.length > 0).map((p) => `${p.name} (${p.members.length})`).join(', ')}
                                                            </span>
                                                        )}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-semibold text-amber-600">Belum ada ahli</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {group.totalMembers > 0 && (
                                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{group.totalMembers}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedGroup(group)}
                                                disabled={group.totalMembers === 0}
                                                className={'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ' + (group.totalMembers > 0 ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300')}
                                            >
                                                <Icon name="eye" className="h-3.5 w-3.5" />
                                                Lihat Ahli
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedGroup && (
                <GroupMembersPopup
                    group={{
                        ...selectedGroup,
                        members: selectedGroup.positionsWithMembers.flatMap((p) => p.members),
                        positionsWithMembers: selectedGroup.positionsWithMembers.filter((p) => p.members.length > 0),
                    }}
                    onClose={() => setSelectedGroup(null)}
                    onAvatarClick={setLightboxSrc}
                />
            )}

            {lightboxSrc && (
                <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}
        </AuthenticatedLayout>
    );
}