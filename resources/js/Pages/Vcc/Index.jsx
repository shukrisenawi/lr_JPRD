import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AvatarLightbox from '@/Components/AvatarLightbox';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');
const hari = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
function fmtDate(d) { if (!d) return ''; const m = d.match(/^(\d{2})-(\d{2})-(\d{4})/); if (!m) return d; const dt = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(dt.getTime()) ? d : `${hari[dt.getDay()]}, ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
function fmt(v) { return nf.format(v ?? 0); }

function fmtPhone(p) { if (!p) return '-'; const d = p.replace(/\D/g, ''); return d.length < 10 ? p : d.slice(0,3)+'-'+d.slice(3); }

function dobFromIc(noKp) {
    if (!noKp) return '-';
    const digits = noKp.replace(/\D/g, '');
    if (digits.length < 6) return '-';
    const yy = parseInt(digits.substring(0, 2), 10);
    const mm = parseInt(digits.substring(2, 4), 10);
    const dd = parseInt(digits.substring(4, 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '-';
    const curYy = new Date().getFullYear() % 100;
    const year = (yy > curYy ? 1900 : 2000) + yy;
    const d = new Date(year, mm - 1, dd);
    if (d.getDate() !== dd || d.getMonth() + 1 !== mm || d.getFullYear() !== year) return '-';
    return `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${year}`;
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
    if (text === '') return 8;
    return Array.from(text).reduce((total, character) => {
        if (/[A-Z0-9]/.test(character)) return total + 1.15;
        if (/[a-z]/.test(character)) return total + 1;
        if (character === ' ') return total + 0.55;
        return total + 1.05;
    }, 2);
}

function excelTextCell(value) {
    return { value: value ?? '-', type: 'String' };
}

function Pagination({ voters, onNavigate }) {
    if (!voters || voters.last_page <= 1) return null;

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

export default function VccIndex({ filters, summary, udms, localities, groups, voters, requires_udm, available_races = [], available_cula_codes: initialCulaCodes = [] }) {
    const { auth } = usePage().props;
    const suggestionsAbort = useRef(null);
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
    const [culaPendingIds, setCulaPendingIds] = useState(new Set());
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [showCulaModal, setShowCulaModal] = useState(false);
    const [formState, setFormState] = useState({
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: Boolean(filters.show_marked),
        group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
        keturunan: filters.keturunan || 'M',
        jantina: filters.jantina ?? '',
        umur_dari: filters.umur_dari ?? '',
        umur_hingga: filters.umur_hingga ?? '',
        per_udm_count: filters.per_udm_count ?? '',
        bulan_lahir: filters.bulan_lahir ?? String(new Date().getMonth() + 1),
        cula_codes: filters.cula_codes ?? '',
    });

    useEffect(() => {
        setFormState({
            udm: filters.udm ?? '',
            locality: filters.locality ?? '',
            show_marked: Boolean(filters.show_marked),
            group_id: filters.custom_mode ? 'custom' : (filters.group_id ?? ''),
            keturunan: filters.keturunan || 'M',
            jantina: filters.jantina ?? '',
            umur_dari: filters.umur_dari ?? '',
            umur_hingga: filters.umur_hingga ?? '',
            per_udm_count: filters.per_udm_count ?? '',
            bulan_lahir: filters.bulan_lahir ?? String(new Date().getMonth() + 1),
            cula_codes: filters.cula_codes ?? '',
        });
    }, [filters.locality, filters.show_marked, filters.udm, filters.group_id, filters.custom_mode, filters.keturunan, filters.jantina, filters.umur_dari, filters.umur_hingga, filters.per_udm_count, filters.bulan_lahir, filters.cula_codes]);

    const initialMonth = useRef(true);
    useEffect(() => {
        if (initialMonth.current && filters.bulan_lahir === undefined) {
            initialMonth.current = false;
            applyFilters({ ...formState, bulan_lahir: String(new Date().getMonth() + 1) }, { preserveState: false });
        }
    }, []);

    useEffect(() => {
        setLocalVoters(voters);
        setLocalSummary(summary);
        setActionError('');
        setPendingIds([]);
    }, [summary, voters]);

    const rows = useMemo(() => {
        if (search.trim().length >= 2 && suggestions.length > 0) return suggestions;
        if (search.trim().length >= 2 && !searching) return suggestions;
        return localVoters.data ?? [];
    }, [localVoters.data, search, searching, suggestions]);

    const applyFilters = (nextState, options = {}) => {
        router.get(route('vcc.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            ...options,
        });
    };

    const goToPage = (page) => {
        applyFilters({ ...formState, page }, {
            onFinish: () => {
                const el = document.getElementById('senarai-grid');
                if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            },
        });
    };

    const updateFilter = (key, value) => {
        const nextState = { ...formState, [key]: value };
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
            per_udm_count: formState.per_udm_count ?? '',
            bulan_lahir: formState.bulan_lahir ?? '',
            cula_codes: formState.cula_codes ?? '',
        });

        try {
            const response = await fetch(`${route('vcc.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) throw new Error('Search failed');

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
                method === 'POST' ? route('vcc.mark.store', voter.id) : route('vcc.mark.destroy', voter.id),
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

            if (!response.ok) throw new Error('Request failed');

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

    const handleCulaSiap = async (code, label) => {
        const voter = selectedVoterForCula;
        if (!voter) return;
        setShowCulaModal(false);
        setSelectedVoterForCula(null);
        setPendingIds((prev) => [...prev, voter.id]);
        try {
            const res = await fetch(route('vcc.update-cula', voter.id), {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ cula_code: code, cula_display_label: label }),
            });
            if (!res.ok) throw new Error();
            updateLocalCollections(voter, true);
        } catch {
            setActionError('Kod culaan tidak berjaya disimpan.');
        } finally {
            setPendingIds((prev) => prev.filter((id) => id !== voter.id));
            setCulaPendingIds((prev) => { const n = new Set(prev); n.delete(voter.id); return n; });
        }
    };

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

    const logCommunication = async (voterId, type, notes = '') => {
        try {
            await fetch(route('vcc.communication.log'), {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ voter_id: voterId, type, notes }),
            });
        } catch (_) {}
    };

    const whatsappBirthdayMessage = (name) => {
        return `Assalamualaikum ${name}, kami dari PAS Sik mengucapkan Selamat Hari Lahir! Semoga dipanjangkan umur dan dimurahkan rezeki.`;
    };

    const visibleTotal = search.trim().length >= 2 ? rows.length : localSummary.total;
    const showLocalityColumn = formState.locality === '';
    const showUdmColumn = formState.udm === '';
    const showCulaColumn = !formState.cula_codes || formState.cula_codes.split(',').filter(Boolean).length !== 1;
    const selectedGroup = groups.find((g) => String(g.id) === String(formState.group_id));
    const groupSuffix = selectedGroup?.nama_group ? ` (${selectedGroup.nama_group}${selectedGroup.kod_culas?.length ? ` — ${selectedGroup.kod_culas.join(', ')}` : ''})` : '';
    const headerTitle = `Senarai Semua Pemilih${groupSuffix}`;

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
                per_udm_count: formState.per_udm_count ?? '',
                bulan_lahir: formState.bulan_lahir ?? '',
                cula_codes: formState.cula_codes ?? '',
            });

            try {
                const resp = await fetch(`${route('vcc.search')}?${params.toString()}&all=1`, {
                    headers: { Accept: 'application/json' },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.voters) exportRows = data.voters;
                }
            } catch (_) {}
        }

        const headers = ['No', 'No Kp', 'Nama', 'Alamat', 'Telefon', 'Cula'];
        const align = ['center', 'center', 'left', 'left', 'center', 'center'];
        const columnWidths = [37, 100, 278, 369, 90, 46];

        const columnXml = columnWidths.map((w) => `<Column ss:AutoFitWidth="1" ss:Width="${w}"/>`).join('');

        const makeHeaderRowXml = () => `
            <Row>
                ${headers.map((header, i) => {
                    const hStyle = align[i] === 'center' ? 'headerCenter' : 'header';
                    return `<Cell ss:StyleID="${hStyle}"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`;
                }).join('')}
            </Row>
        `;

        const makeBodyRowsXml = (rows, startIdx) => rows.map((voter, i) => {
            const cells = [
                { value: startIdx + i + 1, type: 'Number', align: 'center' },
                { value: voter.no_kp || voter.old_ic || '-', type: 'String', align: 'center' },
                { value: voter.name || '-', type: 'String', align: 'left', wrap: true },
                { value: voter.address || '-', type: 'String', align: 'left', wrap: true },
                { value: voter.phone_mobile || voter.phone_home || '-', type: 'String', align: 'center' },
                { value: '', type: 'String', align: 'center' },
            ];
            return `<Row>${cells.map((cell) => {
                let styleId = cell.align === 'center' ? 'cellCenter' : 'cell';
                if (cell.wrap) styleId += 'Wrap';
                return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${cell.type}">${escapeXml(cell.value)}</Data></Cell>`;
            }).join('')}</Row>`;
        }).join('');

        let bodyRowsXml = '';
        const showUdmInExport = formState.udm === '';

        if (showUdmInExport) {
            const groups = {};
            for (const v of exportRows) {
                const k = v.dm || 'Tanpa UDM';
                (groups[k] ??= []).push(v);
            }
            let globalIdx = 0;
            for (const [udm, udmVoters] of Object.entries(groups)) {
                bodyRowsXml += `
            <Row>
                <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="titleMain">
                    <Data ss:Type="String">${escapeXml(udm)}</Data>
                </Cell>
            </Row>`;
                bodyRowsXml += makeHeaderRowXml();
                bodyRowsXml += makeBodyRowsXml(udmVoters, globalIdx);
                globalIdx += udmVoters.length;
            }
        } else {
            const titleRows = [];
            if (formState.udm) titleRows.push({ value: formState.udm, styleId: 'titleMain' });
            if (formState.locality) titleRows.push({ value: formState.locality, styleId: 'titleSub' });
            if (selectedGroup?.nama_group) titleRows.push({ value: `Pengundi ${selectedGroup.nama_group}`, styleId: 'titleSub' });

            const titleRowXml = titleRows.map((title) => `
            <Row>
                <Cell ss:MergeAcross="${headers.length - 1}" ss:StyleID="${title.styleId}">
                    <Data ss:Type="String">${escapeXml(title.value)}</Data>
                </Cell>
            </Row>`).join('');

            bodyRowsXml = titleRowXml;
            bodyRowsXml += makeHeaderRowXml();
            bodyRowsXml += makeBodyRowsXml(exportRows, 0);
        }

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
    <Worksheet ss:Name="VCC">
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
        link.download = `vcc_${formState.udm || 'semua'}_${new Date().toISOString().slice(0, 10)}.xls`;
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
                        <p className="label-section">VCC</p>
                        {formState.udm && <p className="mt-0.5 text-xl font-black uppercase tracking-[0.15em] text-slate-800">{formState.udm}</p>}
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">{headerTitle}</h2>
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
            <Head title="VCC" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_14rem]">
                    <div className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20 overflow-hidden sm:p-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_10rem_7rem_7rem_5rem_3rem] xl:items-end">
                            <div>
                                <label htmlFor="vcc-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                                <select
                                    id="vcc-udm"
                                    value={formState.udm}
                                    onChange={(event) => updateFilter('udm', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua UDM</option>
                                    {udms.map((udm) => (
                                        <option key={udm} value={udm}>{udm}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="vcc-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                                <select
                                    id="vcc-locality"
                                    value={formState.locality}
                                    onChange={(event) => updateFilter('locality', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Lokaliti</option>
                                    {localities.map((locality) => (
                                        <option key={locality} value={locality}>{locality}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="vcc-group" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Group Pemilih</label>
                                <select
                                    id="vcc-group"
                                    value={formState.group_id}
                                    onChange={(event) => updateFilter('group_id', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Group</option>
                                    <option value="custom">Custom</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>{g.nama_group}{g.kod_culas?.length ? ` (${g.kod_culas.join(', ')})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="vcc-per-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Bilangan / UDM</label>
                                <input
                                    id="vcc-per-udm"
                                    type="number"
                                    min="0"
                                    value={formState.per_udm_count}
                                    onChange={(event) => updateFilter('per_udm_count', event.target.value)}
                                    className="input-field mt-1.5"
                                    placeholder="cth: 20"
                                />
                            </div>

                            <div>
                                <label htmlFor="vcc-bulan" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Bulan Lahir</label>
                                <select
                                    id="vcc-bulan"
                                    value={formState.bulan_lahir}
                                    onChange={(event) => updateFilter('bulan_lahir', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua</option>
                                    {['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'].map((nama, i) => (
                                        <option key={i + 1} value={i + 1}>{nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="vcc-dah-cula" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Dah Siap</label>
                                <label
                                    htmlFor="vcc-dah-cula"
                                    className="input-field mt-1.5 inline-flex items-center px-3 py-2"
                                >
                                    <input
                                        id="vcc-dah-cula"
                                        type="checkbox"
                                        checked={formState.show_marked}
                                        onChange={(event) => updateFilter('show_marked', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-green-600 focus:ring-green-500"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-[0.08em] text-transparent">Reset</label>
                                <button type="button" onClick={() => window.location.assign(route('vcc.index'))}
                                    className="input-field mt-1.5 inline-flex items-center justify-center bg-white px-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                    ↺
                                </button>
                            </div>

                            {actionError && <InputError className="mt-1" message={actionError} />}
                        </div>

                        {formState.group_id === 'custom' && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:items-end">
                                <div>
                                    <label htmlFor="vcc-keturunan" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Keturunan</label>
                                    <select id="vcc-keturunan" value={formState.keturunan} onChange={(e) => updateFilter('keturunan', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        {available_races.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="vcc-jantina" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Jantina</label>
                                    <select id="vcc-jantina" value={formState.jantina} onChange={(e) => updateFilter('jantina', e.target.value)} className="input-field mt-1.5">
                                        <option value="">Semua</option>
                                        <option value="L">Lelaki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="vcc-umur-dari" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Dari</label>
                                    <input id="vcc-umur-dari" type="number" min="0" max="150" value={formState.umur_dari} onChange={(e) => updateFilter('umur_dari', e.target.value)} className="input-field mt-1.5" placeholder="cth: 21" />
                                </div>
                                <div>
                                    <label htmlFor="vcc-umur-hingga" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Umur Hingga</label>
                                    <input id="vcc-umur-hingga" type="number" min="0" max="150" value={formState.umur_hingga} onChange={(e) => updateFilter('umur_hingga', e.target.value)} className="input-field mt-1.5" placeholder="cth: 60" />
                                </div>
                            </div>
                        )}

                        {initialCulaCodes?.length > 0 && (
                            <div className="mt-3">
                                <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Kod Cula</label>
                                <div className="mt-1.5 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                                    {initialCulaCodes.map((c) => {
                                        const selected = formState.cula_codes.split(',').includes(c.code);
                                        return (
                                            <button key={c.code} type="button"
                                                onClick={() => {
                                                    const current = formState.cula_codes ? formState.cula_codes.split(',').filter(Boolean) : [];
                                                    const next = selected ? current.filter(x => x !== c.code) : [...current, c.code];
                                                    updateFilter('cula_codes', next.join(','));
                                                }}
                                                className={`rounded-md border px-2 py-1 text-[11px] font-bold leading-tight transition ${selected ? 'border-green-600 bg-green-100 text-green-800' : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'}`}
                                            >
                                                <span title={c.label}>{c.code}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
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
                            {searching ? 'Mencari...' : 'Tiada pemilih untuk paparan ini.'}
                        </p>
                    ) : (
                        <div id="senarai-grid" className="w-full overflow-x-auto rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-green-50 text-left text-xs font-bold uppercase tracking-[0.05em] text-green-700">
                                        <th className="w-10 px-2 py-2.5 text-center">#</th>
                                        <th className="px-2 py-2.5">Nama</th>
                                        <th className="px-2 py-2.5">No KP</th>
                                        <th className="px-2 py-2.5">Telefon</th>
                                        {showUdmColumn && <th className="px-2 py-2.5">UDM</th>}
                                        {showLocalityColumn && <th className="px-2 py-2.5">Lokaliti</th>}
                                        <th className="w-20 px-2 py-2.5 text-center">T. Lahir</th>
                                        <th className="w-12 px-2 py-2.5 text-center">Umur</th>
                                        {showCulaColumn && <th className="px-2 py-2.5">Cula</th>}
                                        <th className="w-48 px-2 py-2.5 text-center">Tindakan</th>
                                    </tr>
                                </thead>
                                {showUdmColumn ? (
                                    Object.entries(
                                        rows.reduce((acc, v) => {
                                            const k = v.dm || 'Tanpa UDM';
                                            (acc[k] ??= []).push(v);
                                            return acc;
                                        }, {})
                                    ).map(([udm, udmVoters]) => (
                                        <tbody key={udm}>
                                            <tr className="border-t border-slate-200 bg-slate-100">
                                                <td colSpan={6 + (showLocalityColumn ? 1 : 0) + (showUdmColumn ? 1 : 0) + (showCulaColumn ? 1 : 0) + 2} className="px-3 py-2 text-sm font-black uppercase tracking-wider text-slate-700">
                                                    {udm}
                                                </td>
                                            </tr>
                                            {udmVoters.map((voter, i) => {
                                                const globalIdx = search.trim().length >= 2 ? i : (localVoters.from ?? 0) + i;
                                                const phone = voter.phone_mobile || voter.phone_home;
                                                return (
                                                    <tr key={voter.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                        <td className="px-2 py-2 text-center font-bold text-slate-500">{globalIdx}</td>
                                                        <td className="px-2 py-2">
                                                            <span className="font-semibold text-slate-800">{voter.name}</span>
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-700">{voter.no_kp || voter.old_ic || '-'}</td>
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            {phone ? (
                                                                <a href={`tel:${phone}`} onClick={() => logCommunication(voter.id, 'call')} className="font-mono text-slate-700 hover:text-green-700 hover:underline">{phone}</a>
                                                            ) : '-'}
                                                        </td>
                                                        {showUdmColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.dm || '-'}</td>}
                                                        {showLocalityColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.locality || '-'}</td>}
                                                        <td className="whitespace-nowrap px-2 py-2 text-center font-mono text-slate-600">{dobFromIc(voter.no_kp)}</td>
                                                        <td className="px-2 py-2 text-center font-bold text-slate-600">{voter.age ?? '-'}</td>
                                                        {showCulaColumn && (
                                                            <td className="whitespace-nowrap px-2 py-2">
                                                                {voter.cula_code && voter.cula_code !== '?' && voter.cula_code !== '0' ? (
                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600" title={voter.cula_display_label || ''}>{voter.cula_code}</span>
                                                                ) : '-'}
                                                            </td>
                                                        )}
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {!voter.is_manual && (
                                                                    <>
                                                                        <label className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600" title="Muat naik avatar">
                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e, voter.id)} disabled={uploadingAvatarIds[voter.id]} />
                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                                                        </label>
                                                                        {voter.whatsapp_link && (
                                                                            <a href={voter.whatsapp_link} target="_blank" rel="noopener noreferrer" onClick={() => logCommunication(voter.id, 'whatsapp')}
                                                                                className="rounded border border-green-200 bg-green-50 px-1 py-0.5 text-xs font-bold text-green-700 hover:bg-green-100">
                                                                                WA
                                                                            </a>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {voter.is_marked ? (
                                                                    <button type="button" onClick={() => unmarkVoter(voter)} disabled={pendingIds.includes(voter.id)}
                                                                        className="rounded bg-red-50 px-1 py-0.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
                                                                        {pendingIds.includes(voter.id) ? '...' : 'Buka'}
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        {!voter.is_manual && (
                                                                            <>
                                                                                <button type="button" onClick={() => { window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); setCulaPendingIds((prev) => new Set([...prev, voter.id])); }}
                                                                                    className="rounded bg-green-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-green-500">
                                                                                    Cula
                                                                                </button>
                                                                                <button type="button" onClick={() => { window.open(buildTelegramLink('kemastel', voter.telegram_identity), '_blank'); }}
                                                                                    className="rounded bg-amber-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-amber-500">
                                                                                    Tel
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {culaPendingIds.has(voter.id) && (
                                                                            <button type="button" onClick={() => { setSelectedVoterForCula(voter); setShowCulaModal(true); }} disabled={pendingIds.includes(voter.id)}
                                                                                className="rounded bg-blue-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                                                                                {pendingIds.includes(voter.id) ? '...' : 'Siap'}
                                                                            </button>
                                                                        )}
                                                                        {voter.cula_code && voter.cula_code !== '?' && voter.cula_code !== '0' && (
                                                                            <button type="button" onClick={() => markVoter(voter)} disabled={pendingIds.includes(voter.id)}
                                                                                className="rounded bg-green-50 px-1 py-0.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50">
                                                                                {pendingIds.includes(voter.id) ? '...' : '✓'}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    ))
                                ) : (
                                    <tbody>
                                        {rows.map((voter, index) => {
                                            const globalIdx = search.trim().length >= 2 ? index : (localVoters.from ?? 0) + index;
                                            const phone = voter.phone_mobile || voter.phone_home;
                                            return (
                                                <tr key={voter.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="px-2 py-2 text-center font-bold text-slate-500">{globalIdx}</td>
                                                    <td className="px-2 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-semibold text-slate-800">{voter.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-700">{voter.no_kp || voter.old_ic || '-'}</td>
                                                    <td className="whitespace-nowrap px-2 py-2">
                                                        {phone ? (
                                                            <a href={`tel:${phone}`} onClick={() => logCommunication(voter.id, 'call')} className="font-mono text-slate-700 hover:text-green-700 hover:underline">{fmtPhone(phone)}</a>
                                                        ) : '-'}
                                                    </td>
                                                    {showUdmColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.dm || '-'}</td>}
                                                    {showLocalityColumn && <td className="whitespace-nowrap px-2 py-2 text-slate-600">{voter.locality || '-'}</td>}
                                                    <td className="whitespace-nowrap px-2 py-2 text-center font-mono text-slate-600">{dobFromIc(voter.no_kp)}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-slate-600">{voter.age ?? '-'}</td>
                                                    {showCulaColumn && (
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            {voter.cula_code && voter.cula_code !== '?' && voter.cula_code !== '0' ? (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600" title={voter.cula_display_label || ''}>{voter.cula_code}</span>
                                                            ) : '-'}
                                                        </td>
                                                    )}
                                                    <td className="whitespace-nowrap px-2 py-2">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!voter.is_manual && (
                                                                <>
                                                                    <label className="flex cursor-pointer items-center justify-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-green-300 hover:text-green-600" title="Muat naik avatar">
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e, voter.id)} disabled={uploadingAvatarIds[voter.id]} />
                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                                                    </label>
                                                                    {voter.whatsapp_link && (
                                                                        <a href={voter.whatsapp_link} target="_blank" rel="noopener noreferrer" onClick={() => logCommunication(voter.id, 'whatsapp')}
                                                                            className="rounded border border-green-200 bg-green-50 px-1 py-0.5 text-xs font-bold text-green-700 hover:bg-green-100">
                                                                            WA
                                                                        </a>
                                                                    )}
                                                                </>
                                                            )}
                                                            {voter.is_marked ? (
                                                                <button type="button" onClick={() => unmarkVoter(voter)} disabled={pendingIds.includes(voter.id)}
                                                                    className="rounded bg-red-50 px-1 py-0.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50">
                                                                    {pendingIds.includes(voter.id) ? '...' : 'Buka'}
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    {!voter.is_manual && (
                                                                        <>
                                                                            <button type="button" onClick={() => { window.open(buildTelegramLink('kemascula', voter.telegram_identity), '_blank'); setCulaPendingIds((prev) => new Set([...prev, voter.id])); }}
                                                                                className="rounded bg-green-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-green-500">
                                                                                Cula
                                                                            </button>
                                                                            <button type="button" onClick={() => { window.open(buildTelegramLink('kemastel', voter.telegram_identity), '_blank'); }}
                                                                                className="rounded bg-amber-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-amber-500">
                                                                                Tel
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {culaPendingIds.has(voter.id) && (
                                                                        <button type="button" onClick={() => { setSelectedVoterForCula(voter); setShowCulaModal(true); }} disabled={pendingIds.includes(voter.id)}
                                                                            className="rounded bg-blue-600 px-1 py-0.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                                                                            {pendingIds.includes(voter.id) ? '...' : 'Siap'}
                                                                        </button>
                                                                    )}
                                                                    {voter.cula_code && voter.cula_code !== '?' && voter.cula_code !== '0' && (
                                                                        <button type="button" onClick={() => markVoter(voter)} disabled={pendingIds.includes(voter.id)}
                                                                            className="rounded bg-green-50 px-1 py-0.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50">
                                                                            {pendingIds.includes(voter.id) ? '...' : '✓'}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                )}
                            </table>
                        </div>
                    )}
                    <Pagination voters={localVoters} onNavigate={goToPage} />
                </section>
            </div>

            {lightboxSrc && (
                <AvatarLightbox
                    src={lightboxSrc}
                    onClose={() => setLightboxSrc(null)}
                />
            )}

            {showCulaModal && selectedVoterForCula && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowCulaModal(false)}>
                    <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800">Siap Cula — {selectedVoterForCula.name}</h3>
                            <button onClick={() => setShowCulaModal(false)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200">Tutup</button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {(initialCulaCodes ?? []).map((c) => (
                                <button key={c.code} onClick={() => handleCulaSiap(c.code, c.label)}
                                    className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md ${c.code === (selectedVoterForCula.cula_code || '') ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700'}`}>
                                    {c.label}
                                </button>
                            ))}
                            {(!initialCulaCodes || initialCulaCodes.length === 0) && (
                                <p className="text-xs text-slate-400">Tiada kod culaan tersedia.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
