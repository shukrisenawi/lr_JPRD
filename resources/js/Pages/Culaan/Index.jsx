import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const nf = new Intl.NumberFormat('ms-MY');
const hari = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
function fmtDate(d) { if (!d) return ''; const m = d.match(/^(\d{2})-(\d{2})-(\d{4})/); if (!m) return d; const dt = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(dt.getTime()) ? d : `${hari[dt.getDay()]}, ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
function fmt(v) { return nf.format(v ?? 0); }
function fmtP(v) { return `${fmt(v ?? 0)}%`; }

function extractNamaAyah(name) {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    const connectors = [' bin ', ' binti ', ' bt ', ' a/p ', ' a/l '];
    for (const connector of connectors) {
        const idx = lowerName.lastIndexOf(connector);
        if (idx !== -1) {
            const result = name.substring(idx + connector.length).trim();
            return result || null;
        }
    }
    return null;
}

function UserGroupIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

const udmCulaGroups = { umno: new Set(['1', '1A', '1B', '1P']), pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']) };

function getBarColor(entry, i) {
    const c = entry?.code, l = entry?.display_label ?? '';
    if (c === '?' || l.includes('BELUM DICULA')) return '#475569';
    if (udmCulaGroups.umno.has(c)) return '#6366f1';
    if (udmCulaGroups.pas.has(c)) return '#10b981';
    if (c === '10') return '#ef4444';
    if (c === '5') return '#06b6d4';
    if (c === '9') return '#f97316';
    return ['#8b5cf6', '#f59e0b', '#64748b', '#14b8a6', '#e11d48', '#84cc16'][i % 6];
}

function StatCard({ label, value, detail, color = 'violet' }) {
    const colors = {
        violet: { card: 'border-slate-200 bg-white', icon: 'bg-green-100 text-green-700', value: 'text-slate-800', symbol: 'PE' },
        emerald: { card: 'border-lime-100 bg-white', icon: 'bg-lime-100 text-lime-700', value: 'text-emerald-700', symbol: 'OK' },
        amber: { card: 'border-amber-200 bg-white', icon: 'bg-amber-100 text-amber-700', value: 'text-orange-500', symbol: 'NO' },
        slate: { card: 'border-slate-200 bg-white', icon: 'bg-slate-100 text-slate-600', value: 'text-slate-800', symbol: 'DB' },
        cyan: { card: 'border-sky-100 bg-white', icon: 'bg-sky-100 text-sky-700', value: 'text-blue-700', symbol: '%' },
    };
    const theme = colors[color] ?? colors.violet;

    return (
        <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 shadow-sm ${theme.card}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${theme.icon}`}>{theme.symbol}</div>
            <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
                <p className={`mt-1 text-xl font-bold leading-none ${theme.value}`}>{fmt(value)}</p>
                {detail && <p className="mt-1 text-xs font-medium text-slate-600">{detail}</p>}
            </div>
        </div>
    );
}

function ChartPanel({ title, children, action, compact = false }) {
    return (
        <section className="card p-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">{title}</h3>
                {action}
            </div>
            <div className={`mt-2 w-full ${compact ? '' : 'h-[12rem] lg:h-[14rem]'}`}>{children}</div>
        </section>
    );
}

function TTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm">
            <p className="font-bold text-slate-800">{label}</p>
            {payload.map((item) => <p key={item.dataKey} className="mt-0.5 text-slate-600">{item.name}: {fmt(item.value)}</p>)}
        </div>
    );
}

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

export default function CulaanIndex({ filters, summary, udms, localities, groups, voters, requires_udm, report, report_by_group = [], available_cula_codes = [], available_races = [], pemilih_report = null }) {
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];
    const canSenarai = allowedModules.includes('culaan.senarai');
    const canLaporan = allowedModules.includes('culaan.laporan');
    const canJadual = allowedModules.includes('culaan.jadual');
    const suggestionsAbort = useRef(null);
    const [tab, setTab] = useState(() => {
        if ((canJadual || canLaporan) && !canSenarai) return 'laporan';
        return 'senarai';
    });
    const isLaporanLike = tab === 'laporan' || tab === 'jadual';
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [actionError, setActionError] = useState('');
    const [selectedVoterId, setSelectedVoterId] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [pendingIds, setPendingIds] = useState([]);
    const [localVoters, setLocalVoters] = useState(voters);
    const [localSummary, setLocalSummary] = useState(summary);
    const [uploadingAvatarIds, setUploadingAvatarIds] = useState({});
    const [avatarUpdates, setAvatarUpdates] = useState({});
    const [formState, setFormState] = useState({
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: Boolean(filters.show_marked),
        group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
        cula_codes: filters.cula_codes ?? [],
        keturunan: filters.keturunan || 'M',
        jantina: filters.jantina ?? '',
        umur_dari: filters.umur_dari ?? '',
        umur_hingga: filters.umur_hingga ?? '',
    });

    useEffect(() => {
        setFormState({
            udm: filters.udm ?? '',
            locality: filters.locality ?? '',
            show_marked: Boolean(filters.show_marked),
            group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
            cula_codes: filters.cula_codes ?? [],
            keturunan: filters.keturunan || 'M',
            jantina: filters.jantina ?? '',
            umur_dari: filters.umur_dari ?? '',
            umur_hingga: filters.umur_hingga ?? '',
        });
    }, [filters.locality, filters.show_marked, filters.udm, filters.group_id, filters.custom_mode, filters.cula_codes, filters.keturunan, filters.jantina, filters.umur_dari, filters.umur_hingga]);

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

    const applyFilters = (nextState, options = {}) => {
        router.get(route('culaan.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            ...options,
        });
    };

    const goToPage = (page) => {
        applyFilters(
            {
                ...formState,
                page,
            },
            {
                onFinish: () => {
                    const el = document.getElementById('senarai-grid');
                    if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                },
            }
        );
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

    const doSearch = async (value) => {
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
            group_id: formState.group_id || '',
            keturunan: formState.keturunan,
            jantina: formState.jantina,
            umur_dari: formState.umur_dari ?? '',
            umur_hingga: formState.umur_hingga ?? '',
        });
        (formState.cula_codes ?? []).forEach((code) => params.append('cula_codes[]', code));

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

    const handleSearchChange = async (event) => {
        await doSearch(event.target.value);
    };

    const clearSearch = () => {
        suggestionsAbort.current?.abort();
        setSearch('');
        setSuggestions([]);
        setSearching(false);
        setSearchError('');
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

    const handleAvatarUpload = async (e, voterId) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: true }));
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', voterId), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.avatar_url) {
                setAvatarUpdates((prev) => ({ ...prev, [voterId]: data.avatar_url + '&t=' + Date.now() }));
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploadingAvatarIds((prev) => ({ ...prev, [voterId]: false }));
            e.target.value = '';
        }
    };

    const visibleTotal = search.trim().length >= 2 ? rows.length : localSummary.total;
    const shouldPromptUdm = requires_udm && !formState.udm;
    const showLocalityColumn = formState.locality === '';
    const selectedGroup = groups.find((g) => String(g.id) === String(formState.group_id));
    const groupSuffix = selectedGroup?.nama_group ? ` (${selectedGroup.nama_group})` : '';
    const headerTitle = isLaporanLike ? `Laporan Pemilih${groupSuffix}` : `Pemilih Belum Cula${groupSuffix}`;
    const headerDesc = isLaporanLike
        ? 'Statistik dan pecahan status culaan pemilih.'
        : 'Tapisan ikut UDM dan lokasi, kemudian kemas data atau tandakan rekod yang sudah diurus.';

    const tableColumns = useMemo(() => {
        if (report_by_group?.length > 0) {
            const seen = new Set();
            const ordered = [];
            const totals = {};
            report_by_group.forEach((rg) => {
                (rg.report.cula_breakdown ?? []).forEach((e) => {
                    totals[e.code] = (totals[e.code] ?? 0) + (e.total ?? 0);
                    if (!seen.has(e.code)) {
                        seen.add(e.code);
                        ordered.push(e.code);
                    }
                });
            });
            return ordered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        }
        if (selectedGroup) {
            return (report?.cula_breakdown ?? []).map((e) => e.code);
        }
        if (filters.custom_mode) {
            return (report?.cula_breakdown ?? []).map((e) => e.code);
        }
        return [];
    }, [report_by_group, selectedGroup, report, filters.custom_mode]);

    const codeLabels = useMemo(() => {
        const map = {};
        const groups = report_by_group?.length > 0 ? report_by_group : [];
        groups.forEach((rg) => {
            (rg.report.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        });
        if (groups.length === 0 && selectedGroup) {
            (report?.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        }
        if (groups.length === 0 && !selectedGroup && filters.custom_mode) {
            (report?.cula_breakdown ?? []).forEach((e) => {
                if (e.code && e.display_label) map[e.code] = e.display_label;
            });
        }
        return map;
    }, [report_by_group, selectedGroup, report, filters.custom_mode]);

    const tableRows = useMemo(() => {
        const groups = report_by_group?.length > 0 ? report_by_group : [];
        if (groups.length === 0 && selectedGroup) {
            const bm = {};
            (report?.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            return [{ nama_group: selectedGroup.nama_group, breakdownMap: bm, jumlah: report?.total ?? 0 }];
        }
        if (groups.length === 0 && filters.custom_mode) {
            const bm = {};
            (report?.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            return [{ nama_group: 'Custom', breakdownMap: bm, jumlah: report?.total ?? 0 }];
        }
        return groups.map((rg) => {
            const bm = {};
            (rg.report.cula_breakdown ?? []).forEach((e) => { bm[e.code] = e.total; });
            return { nama_group: rg.group.nama_group, breakdownMap: bm, jumlah: rg.report.total ?? 0 };
        });
    }, [report_by_group, selectedGroup, report, filters.custom_mode]);

    const exportToExcel = async () => {
        let exportRows = rows;

        if (search.trim().length < 2) {
            const params = new URLSearchParams({
                udm: formState.udm,
                locality: formState.locality,
                show_marked: formState.show_marked ? '1' : '0',
                group_id: formState.group_id || '',
                keturunan: formState.keturunan,
                jantina: formState.jantina,
                umur_dari: formState.umur_dari ?? '',
                umur_hingga: formState.umur_hingga ?? '',
            });
            (formState.cula_codes ?? []).forEach((code) => params.append('cula_codes[]', code));

            try {
                const resp = await fetch(`${route('culaan.export')}?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    exportRows = data.voters ?? [];
                }
            } catch (_) { /* fallback to paginated data */ }
        }

        const titleRows = [];
        const headers = ['No', 'No Kp', 'Nama', 'Alamat', 'Telefon', 'Cula'];
        const align = ['center', 'center', 'left', 'left', 'center', 'center'];
        const columnWidths = [37, 100, 278, 369, 90, 46];

        const dataRows = exportRows.map((voter, index) => {
            const cells = [
                { value: index + 1, type: 'Number', align: 'center' },
                { value: voter.no_kp || voter.old_ic || '-', type: 'String', align: 'center' },
                { value: voter.name || '-', type: 'String', align: 'left', wrap: true },
                { value: voter.address || '-', type: 'String', align: 'left', wrap: true },
                { value: voter.phone_mobile || voter.phone_home || '-', type: 'String', align: 'center' },
                { value: '', type: 'String', align: 'center' },
            ];

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

        if (selectedGroup?.nama_group) {
            titleRows.push({
                value: `Pengundi ${selectedGroup.nama_group}`,
                styleId: 'titleSub',
            });
        }

        const columnXml = columnWidths
            .map((w) => `<Column ss:AutoFitWidth="1" ss:Width="${w}"/>`)
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
                ${headers.map((header, i) => {
                    const hStyle = align[i] === 'center' ? 'headerCenter' : 'header';
                    return `<Cell ss:StyleID="${hStyle}">
                        <Data ss:Type="String">${escapeXml(header)}</Data>
                    </Cell>`;
                }).join('')}
            </Row>
        `;

        const bodyRowsXml = dataRows
            .map((cells) => `
                <Row>
                    ${cells.map((cell) => {
                        let styleId = cell.align === 'center' ? 'cellCenter' : 'cell';
                        if (cell.wrap) styleId += 'Wrap';
                        return `<Cell ss:StyleID="${styleId}">
                            <Data ss:Type="${cell.type}">${escapeXml(cell.value)}</Data>
                        </Cell>`;
                    }).join('')}
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
            <Font ss:FontName="Calibri" ss:Size="26" ss:Bold="1"/>
            <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
        </Style>
        <Style ss:ID="titleSub">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1"/>
            <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
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
        <Style ss:ID="headerCenter">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
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
        <Style ss:ID="cellCenter">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
        <Style ss:ID="cellWrap">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
            <Borders>
                <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
            </Borders>
            <Font ss:FontName="Calibri" ss:Size="11"/>
        </Style>
        <Style ss:ID="cellCenterWrap">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
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
        link.download = `culaan_${formState.udm || 'semua'}_${new Date().toISOString().slice(0, 10)}.xls`;
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
                        {formState.udm && <p className="mt-0.5 text-xl font-black uppercase tracking-[0.15em] text-slate-800">{formState.udm}</p>}
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">{headerTitle}</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">{headerDesc}</p>
                    </div>
                    {tab === 'senarai' && (
                        <button
                            type="button"
                            onClick={exportToExcel}
                            className="hidden shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700 sm:inline-flex"
                        >
                            <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-black text-white">X</span>
                            Export Excel
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Culaan" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                {pemilih_report?.name && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <path d="M8 13h2"/>
                            <path d="M10 13v4"/>
                            <path d="M14 13h2"/>
                            <path d="M16 13v4"/>
                        </svg>
                        {pemilih_report?.uploaded_by && <span className="text-slate-500">Data terbaru dimuat naik oleh: <span className="font-bold text-slate-700">{pemilih_report.uploaded_by}</span></span>}
                        {pemilih_report?.uploaded_at && <span className="text-slate-500">Pada: <span className="font-bold text-slate-700">{fmtDate(pemilih_report.uploaded_at)}</span></span>}
                    </div>
                )}
                <section className={`grid gap-3 xl:items-stretch ${isLaporanLike ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_14rem]'}`}>
                    <div className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20 overflow-hidden sm:p-4">
                        <div className={`grid gap-3 sm:grid-cols-2 xl:items-end ${isLaporanLike ? 'xl:grid-cols-[12rem_12rem_10rem_minmax(0,1fr)]' : 'xl:grid-cols-[12rem_12rem_10rem_5rem_minmax(0,1fr)]'}`}>
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
                                <label htmlFor="culaan-group" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Group Pemilih</label>
                                <select
                                    id="culaan-group"
                                    value={formState.group_id}
                                    onChange={(event) => updateFilter('group_id', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Group</option>
                                    <option value="custom">Custom</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>{g.nama_group}</option>
                                    ))}
                                </select>
                            </div>

                            {tab === 'senarai' && (
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
                            )}

                            <div>
                                <label htmlFor="culaan-search" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Cari Pemilih</label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="culaan-search"
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="input-field pr-10"
                                        placeholder="Nama, No Kp, telefon..."
                                        disabled={!formState.udm}
                                    />
                                    {search ? (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100"
                                        >
                                            <span className="text-sm leading-none">×</span>
                                        </button>
                                    ) : (
                                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-green-600">⌕</span>
                                    )}
                                </div>
                                {searchError && <InputError className="mt-1" message={searchError} />}
                                {actionError && <InputError className="mt-1" message={actionError} />}

                            </div>
                        </div>

                        {formState.group_id === 'custom' && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:items-end">
                                <div>
                                    <label htmlFor="culaan-keturunan" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Keturunan</label>
                                    <select id="culaan-keturunan" value={formState.keturunan} onChange={(e) => updateFilter('keturunan', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        {available_races.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="culaan-jantina" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Jantina</label>
                                    <select id="culaan-jantina" value={formState.jantina} onChange={(e) => updateFilter('jantina', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        <option value="L">Lelaki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="culaan-umur-dari" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Dari</label>
                                    <input id="culaan-umur-dari" type="number" min="0" max="150" value={formState.umur_dari} onChange={(e) => updateFilter('umur_dari', e.target.value)} className="input-field mt-1.5" placeholder="cth: 21" />
                                </div>
                                <div>
                                    <label htmlFor="culaan-umur-hingga" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Hingga</label>
                                    <input id="culaan-umur-hingga" type="number" min="0" max="150" value={formState.umur_hingga} onChange={(e) => updateFilter('umur_hingga', e.target.value)} className="input-field mt-1.5" placeholder="cth: 60" />
                                </div>
                            </div>
                        )}
                    </div>

                    {tab === 'senarai' && (
                        <div className="flex items-center gap-3 rounded-xl border border-green-600 bg-white px-4 py-3 shadow-sm shadow-green-600/20 overflow-hidden">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg text-green-700">●●</div>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-green-700">Jumlah Paparan</p>
                                <p className="mt-0.5 text-2xl font-black leading-none text-slate-800">{visibleTotal}</p>
                            </div>
                        </div>
                    )}
                </section>

                {(() => {
                    const tabs = [];
                    if (canSenarai) tabs.push({ k: 'senarai', l: 'Senarai Belum Cula' });
                    if (canLaporan) tabs.push({ k: 'laporan', l: 'Laporan (Graf)' });
                    if (canJadual) tabs.push({ k: 'jadual', l: 'Laporan (Jadual)' });
                    if (tabs.length < 2) return null;
                    return (
                        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            {tabs.map((t) => (
                                <button key={t.k} onClick={() => setTab(t.k)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${tab === t.k ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                                    {t.l}
                                </button>
                            ))}
                        </div>
                    );
                })()}

                {tab === 'senarai' && (
                    <section>
                        {rows.length === 0 ? (
                            <p className="rounded-xl border border-green-600 bg-white py-6 text-center text-xs font-medium text-slate-500 shadow-sm shadow-green-600/20 overflow-hidden">
                                {searching ? 'Mencari...' : shouldPromptUdm ? 'Pilih UDM untuk memaparkan senarai culaan.' : 'Tiada pemilih untuk paparan ini.'}
                            </p>
                        ) : (
                            <div id="senarai-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {rows.map((voter, index) => (
                                    <div
                                        key={voter.id}
                                        onClick={() => setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVoterId(voter.id === selectedVoterId ? null : voter.id); } }}
                                        role="button"
                                        tabIndex={0}
                                        className={`rounded-xl border bg-white p-3 shadow-sm overflow-hidden cursor-default transition-colors duration-300 ease-in-out hover:shadow-md ${voter.id === selectedVoterId ? 'border-black' : 'border-green-600'}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-green-600 to-green-500 text-xs font-black text-white shadow-sm">
                                                {search.trim().length >= 2 ? index + 1 : (localVoters.from ?? 0) + index}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1.5 text-sm font-bold leading-5 text-slate-800">
                                                    {voter.name}
                                                    {(() => {
                                                        const namaAyah = extractNamaAyah(voter.name);
                                                        if (!namaAyah) return null;
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    doSearch(namaAyah);
                                                                    const el = document.getElementById('culaan-search');
                                                                    if (el) {
                                                                        el.focus();
                                                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }
                                                                }}
                                                                className="inline-flex shrink-0 items-center justify-center rounded-md border border-white bg-white px-1 py-0.5 text-slate-400 transition hover:border-slate-200 hover:text-green-600"
                                                                title={`Cari keluarga: ${namaAyah}`}
                                                            >
                                                                <UserGroupIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        );
                                                    })()}
                                                </p>
                                                <p className="mt-0.5 text-xs font-medium uppercase leading-4 tracking-[0.03em] text-slate-500">{voter.address || '-'}</p>
                                            </div>

                                        </div>
                                        <div className="mt-3 space-y-2 text-xs">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex items-center gap-2">
                                                    {(avatarUpdates[voter.id] || voter.avatar_url) && (
                                                        <div className="shrink-0">
                                                            <img src={avatarUpdates[voter.id] || voter.avatar_url} alt="" className="h-7 w-7 cursor-pointer rounded-full object-cover border border-slate-200" onClick={(e) => { e.stopPropagation(); setLightboxSrc(avatarUpdates[voter.id] || voter.avatar_url); }} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-green-700">No Kp</span>
                                                        <p className="mt-0.5 pr-[5px] font-bold text-slate-800">{voter.no_kp || voter.old_ic || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="ml-[30px]">
                                                    <span className="font-semibold text-green-700">Telefon</span>
                                                    {(() => {
                                                        const phone = voter.phone_mobile || voter.phone_home;
                                                        if (!phone) return <p className="mt-0.5 font-bold text-slate-800">-</p>;
                                                        return (
                                                            <a href={`tel:${phone}`} className="mt-0.5 inline-block font-bold text-slate-800 hover:text-green-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                                                                {phone}
                                                            </a>
                                                        );
                                                    })()}
                                                </div>
                                                {!showLocalityColumn && (
                                                    <div>
                                                        <span className="font-semibold text-green-700">Umur</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {showLocalityColumn && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className={voter.is_marked && voter.marked_by_name ? 'col-span-1' : 'col-span-2'}>
                                                        <span className="font-semibold text-green-700">Lokaliti</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.locality || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-green-700">Umur</span>
                                                        <p className="mt-0.5 font-bold text-slate-800">{voter.age ?? '-'}</p>
                                                    </div>
                                                    {voter.is_marked && voter.marked_by_name && (
                                                        <div className="flex items-end">
                                                            <span className="rounded bg-lime-100 px-2 py-0.5 text-xs font-bold text-lime-700">
                                                                {voter.marked_by_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {!voter.is_manual && <>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    id={`avatar-upload-${voter.id}`}
                                                    onChange={(e) => handleAvatarUpload(e, voter.id)}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); document.getElementById(`avatar-upload-${voter.id}`)?.click(); }}
                                                    disabled={uploadingAvatarIds[voter.id]}
                                                    className="inline-flex w-7 items-center justify-center rounded-md border border-slate-200 bg-white py-1.5 text-slate-500 shadow-sm transition hover:border-green-300 hover:text-green-700 disabled:opacity-40"
                                                    title="Muat naik gambar"
                                                >
                                                    {uploadingAvatarIds[voter.id] ? (
                                                        <span className="text-xs font-bold">...</span>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
                                                    )}
                                                </button>
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
                                            </>}
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
                                                    className="inline-flex w-7 items-center justify-center rounded-md bg-green-600 py-1.5 text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {pendingIds.includes(voter.id) ? '...' : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12" /></svg>}
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
                )}

                {tab === 'laporan' && (
                    <section className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Jumlah Pemilih" value={report?.total ?? 0} color="violet" />
                            <StatCard label="Sudah Dicula" value={report?.sudah_dicula ?? 0} detail="Ada status culaan" color="emerald" />
                            <StatCard label="Belum Dicula" value={report?.belum_dicula ?? 0} color="amber" />
                            <StatCard label="Peratus Siap" value={report?.peratus_siap ?? 0} detail="Daripada jumlah pemilih" color="cyan" />
                        </div>
                        {report_by_group?.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {(() => {
                                    const globalMax = report_by_group.reduce((m, r) => {
                                        const g = r.report.cula_breakdown?.reduce((gm, e) => Math.max(gm, e.total ?? 0), 0) ?? 0;
                                        return Math.max(m, g);
                                    }, 0);
                                    return report_by_group.map((rg) => (
                                        <ChartPanel key={`grp-chart-${rg.group.id}`} title={`Status Culaan — ${rg.group.nama_group}`}>
                                            <div className="w-full" style={{ height: '12rem' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={rg.report.cula_breakdown ?? []} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                                        <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                                        <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} domain={[0, globalMax]} />
                                                        <Tooltip content={<TTip />} />
                                                        <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                            {(rg.report.cula_breakdown ?? []).map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </ChartPanel>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <ChartPanel title="Status Culaan" key={`cula-chart-${formState.udm}-${formState.group_id}`}>
                                <div className="w-full" style={{ height: '12rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={report?.cula_breakdown ?? []} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                            <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                {(report?.cula_breakdown ?? []).map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartPanel>
                        )}
                    </section>
                )}
                {tab === 'jadual' && canJadual && (
                    <section className="space-y-3">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-bold uppercase tracking-[0.08em] text-slate-600">Nama Group</th>
                                        {tableColumns.map((code) => (
                                            <th key={code} title={codeLabels[code] ?? code} className="whitespace-nowrap px-2 py-2 text-center font-bold uppercase tracking-[0.08em] text-slate-600">{code}</th>
                                        ))}
                                        <th className="whitespace-nowrap px-3 py-2 text-right font-bold uppercase tracking-[0.08em] text-slate-600">Jumlah Keseluruhan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={tableColumns.length + 2} className="px-3 py-6 text-center text-slate-500">Tiada data untuk paparan ini.</td>
                                        </tr>
                                    ) : tableRows.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                                            <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-800">{row.nama_group}</td>
                                            {tableColumns.map((code) => (
                                                <td key={code} className="whitespace-nowrap px-2 py-2 text-center font-bold text-slate-800">{fmt(row.breakdownMap[code] ?? 0)}</td>
                                            ))}
                                            <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-slate-800">{fmt(row.jumlah)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
            {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        </AuthenticatedLayout>
    );
}
