import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function escapeXml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

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
];

function DetailPopup({ scope, members, level, groups, highlight, onClose }) {
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
                                                const xml = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style></Styles>' + colXml + '<Worksheet ss:Name="AJK"><Table>' + titleXml + headerXml + bodyXml + '</Table></Worksheet></Workbook>';
                                                const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
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
                                    <div className="divide-y divide-slate-100">
                                        {g.members.map((m) => {
                                            const match = isMatching(m.voter?.name);
                                            return (
                                            <div key={m.id} className={'flex items-center gap-3 px-3 py-2 transition ' + (match ? 'bg-amber-50 ring-1 ring-amber-300 rounded-md' : '')}>
                                                <div className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' + (match ? 'bg-amber-200 text-amber-800' : 'bg-green-100 text-green-700')}>
                                                    <Icon name="user" className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={'text-xs font-bold ' + (match ? 'text-amber-900' : 'text-slate-800')}>{m.voter?.name}</p>
                                                    <p className="text-[10px] text-slate-400">{m.voter?.no_kp || m.voter?.old_ic || '-'}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className="inline-block rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">{m.position?.name}</span>
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

function UdmPositionPopup({ position, members, onClose }) {
    if (!position) return null;

    const groupedByUdm = {};
    members.forEach((m) => {
        const udm = m.scope_name || 'Tiada UDM';
        if (!groupedByUdm[udm]) groupedByUdm[udm] = { udm, members: [] };
        groupedByUdm[udm].members.push(m);
    });

    const sortedUdms = Object.values(groupedByUdm).sort((a, b) => a.udm.localeCompare(b.udm));

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">UDM — {position.name}</p>
                        <p className="text-xs text-slate-500">{members.length} orang ahli</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-4">
                    {sortedUdms.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada ahli.</p>
                    ) : (
                        <div className="space-y-3">
                            {sortedUdms.map((g) => (
                                <div key={g.udm} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                                        <p className="text-xs font-bold text-slate-700">{g.udm}</p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {g.members.map((m) => (
                                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                                <span className="font-medium">{m.voter?.name}</span>
                                                <span className="text-slate-400">—</span>
                                                <span className="text-slate-400">{m.voter?.phone_mobile || m.voter?.phone_home || '-'}</span>
                                            </div>
                                        ))}
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
    const [detailScope, setDetailScope] = useState(null);
    const [detailPosition, setDetailPosition] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredScopeStats = useMemo(() => {
        if (activeTab === 'udm-jawatan') return [];
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
                    <div className="flex gap-1 border-b border-slate-200 px-4 py-3 bg-slate-50/50">
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
                        {activeTab === 'udm-jawatan' ? (
                            filteredPositionStats.length === 0 ? (
                                <p className="py-8 text-center text-xs text-slate-400">Tiada jawatan dengan ahli UDM.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-1.5">
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
                        ) : filteredScopeStats.length === 0 ? (
                            <p className="py-8 text-center text-xs text-slate-400">Tiada data untuk peringkat ini.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-1.5">
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
                />
            )}

            {detailPosition && (
                <UdmPositionPopup
                    position={detailPosition}
                    members={detailPosition.members}
                    onClose={() => setDetailPosition(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
