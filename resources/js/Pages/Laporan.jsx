import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useRef, useState } from 'react';

const nf = new Intl.NumberFormat('ms-MY');
const hari = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
function fmtDate(d) { if (!d) return ''; const m = d.match(/^(\d{2})-(\d{2})-(\d{4})/); if (!m) return d; const dt = new Date(+m[3], +m[2]-1, +m[1]); return isNaN(dt.getTime()) ? d : `${hari[dt.getDay()]}, ${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
const chartColors = ['#8b5cf6', '#a78bfa', '#38bdf8', '#bbf7d0', '#f59e0b', '#ef4444'];
const udmCulaGroups = { umno: new Set(['1', '1A', '1B', '1P']), pas: new Set(['2', '3B', '3D', '3K', '3M', '3P', '3U']) };
const quickMessageIcons = ['📌', '♦️', '🟩', '🌸', '▪️', '✅', '❌', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

function fmt(v) { return nf.format(v ?? 0); }
function fmtP(v) { return `${fmt(v ?? 0)}%`; }
function fmtDiff(v, diff) {
    if (diff === undefined || diff === 0 || diff < 0) return fmt(v);
    return (
        <span className="inline-flex items-center gap-1">
            <span className="text-xs font-semibold">{fmt(v)}</span>
            <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold leading-tight text-green-800">
                <span className="leading-none">+</span>
                <span>{fmt(diff)}</span>
            </span>
        </span>
    );
}
function fmtSiapDiff(v, diff) {
    if (diff === undefined || diff === 0) return <span className="text-slate-400">-</span>;
    if (diff > 0) return <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-800">{fmt(diff)}</span>;
    return <span className="text-slate-400">-</span>;
}
function getRaceCount(breakdown, names) {
    for (const r of breakdown ?? []) {
        if (names.includes(r.code.toUpperCase())) return r.total;
    }
    return 0;
}
function getCulaSum(breakdown, codes) {
    const byCode = {};
    for (const c of breakdown ?? []) byCode[c.code] = c.total;
    let sum = 0;
    for (const code of codes) sum += byCode[code] ?? 0;
    return sum;
}

function fmtCulaParty(total, completed) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-xs font-semibold">{fmt(total)}</span>
            {completed > 0 && <span className="rounded bg-green-100 px-1 text-[10px] font-bold leading-tight text-green-700">+{completed}</span>}
        </span>
    );
}

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

function renderCula(b = []) {
    if (!b.length) return '-';
    return b.slice(0, 3).map((item, i) => (
        <span key={`${item.code}-${i}`}>{item.display_label}: <strong className="text-slate-950">{fmt(item.total)}</strong>{i < Math.min(b.length, 3) - 1 ? ', ' : ''}</span>
    ));
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
            <div className={`hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${theme.icon}`}>{theme.symbol}</div>
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

function DataTable({ rows, columns }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="table-header">
                        <tr>{columns.map((c) => <th key={c.key} className={`px-2.5 py-1.5 ${c.headerClass ?? ''}`}>{c.label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                        {rows.map((row, i) => (
                            <tr key={row.key ?? `${row.name}-${i}`} className={`${i % 2 === 1 ? 'bg-slate-50/70' : ''} hover:bg-green-50/50`}>
                                {columns.map((c) => <td key={c.key} className={`px-2.5 py-2 align-top leading-4 ${c.cellClass ?? ''}`}>{c.format ? c.format(row[c.key], row) : row[c.key]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function N8nMessageModal({ open, message, onChange, onClose, onSend, sending, error }) {
    const textareaRef = useRef(null);

    if (!open) return null;

    const insertIcon = (icon) => {
        const textarea = textareaRef.current;
        const start = textarea?.selectionStart ?? message.length;
        const end = textarea?.selectionEnd ?? start;
        const nextMessage = `${message.slice(0, start)}${icon}${message.slice(end)}`;
        onChange(nextMessage);

        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + icon.length, start + icon.length);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="n8n-message-title">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-green-700">n8n</p>
                        <h3 id="n8n-message-title" className="mt-0.5 text-base font-bold text-slate-900">Semak mesej culaan</h3>
                        <p className="mt-1 text-xs text-slate-500">Edit teks jika perlu sebelum approve dan hantar.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">&times;</button>
                </div>
                <textarea
                    value={message}
                    onChange={(e) => onChange(e.target.value)}
                    ref={textareaRef}
                    rows={18}
                    className="input-field mt-4 min-h-[22rem] w-full resize-y whitespace-pre-wrap font-mono text-xs leading-5"
                />
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Icon pantas</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {quickMessageIcons.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                title={`Masukkan ${icon}`}
                                aria-label={`Masukkan ${icon}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertIcon(icon)}
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-slate-200 bg-white px-1.5 text-base transition hover:border-green-300 hover:bg-green-50"
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Klik icon untuk masukkan pada posisi kursor.</p>
                </div>
                {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={sending} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Batal</button>
                    <button type="button" onClick={onSend} disabled={sending || !message.trim()} className="rounded-md bg-gradient-to-r from-green-700 to-green-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-green-600 hover:to-green-400 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Menghantar...' : 'Approve & Hantar'}</button>
                </div>
            </div>
        </div>
    );
}

export default function Laporan({ report, culaan_message = '', pemilih_report = null, udm_snapshot = null, udm_snapshot_meta = null, recent_logins = [], ahli_pas_stats = null }) {
    const { auth } = usePage().props;
    const canSendStatusCula = auth.user?.role?.is_master_admin || auth.user?.allowed_modules?.includes('laporan-hantar-status');
    const [tab, setTab] = useState('udm');
    const [search, setSearch] = useState('');
    const [udmKey, setUdmKey] = useState(() => report.dm_details?.[0]?.key ?? '');
    const [n8nModalOpen, setN8nModalOpen] = useState(false);
    const [n8nMessage, setN8nMessage] = useState(culaan_message);
    const [n8nSending, setN8nSending] = useState(false);
    const [n8nError, setN8nError] = useState('');
    const [n8nNotice, setN8nNotice] = useState('');

    const openN8nModal = () => {
        setN8nMessage(culaan_message);
        setN8nError('');
        setN8nNotice('');
        setN8nModalOpen(true);
    };

    const sendN8nMessage = async () => {
        setN8nSending(true);
        setN8nError('');

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(route('laporan.n8n.send'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify({ message: n8nMessage }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.message ?? 'Mesej gagal dihantar.');
            }

            setN8nModalOpen(false);
            setN8nNotice(payload.message ?? 'Mesej berjaya dihantar.');
        } catch (error) {
            setN8nError(error.message ?? 'Mesej gagal dihantar.');
        } finally {
            setN8nSending(false);
        }
    };

    const diffCols = ['JP', 'L', 'P', 'M', 'C', 'I', 'S', 'PAS', 'PBBM', 'BN', 'PH', 'GTA', 'PLK', 'Atas Pagar', 'Tak Kenal', 'Mati', 'CULA'];
    const partyCols = ['PAS', 'PBBM', 'BN', 'PH', 'GTA', 'PLK', 'Atas Pagar', 'Tak Kenal', 'Mati'];

    const filteredLocs = useMemo(() => {
        const kw = search.trim().toLowerCase();
        if (!kw) return report.by_locality;
        return report.by_locality.filter((r) => r.name.toLowerCase().includes(kw) || r.dm.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw));
    }, [report.by_locality, search]);

    const dmChartRows = useMemo(() => [...report.by_dm].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 12), [report.by_dm]);
    const dmDetails = report.dm_details ?? [];
    const dmCulaRows = report.cula_by_dm ?? [];
    const dmDetailsMap = useMemo(() => {
        const map = {};
        for (const d of dmDetails) map[d.key] = d;
        return map;
    }, [dmDetails]);
    const culaByDmMap = useMemo(() => {
        const map = {};
        for (const d of dmCulaRows) map[d.key] = d;
        return map;
    }, [dmCulaRows]);
    const completedByDmMap = useMemo(() => {
        const raw = report.completed_by_dm ?? {};
        const map = {};
        for (const dm of Object.keys(raw)) {
            map[`${dm}|${dm}`] = raw[dm];
        }
        return map;
    }, [report.completed_by_dm]);
    const culaCompletedByDmMap = useMemo(() => {
        const raw = report.completed_cula_by_dm ?? {};
        const map = {};
        for (const [dm, codes] of Object.entries(raw)) {
            map[`${dm}|${dm}`] = codes;
        }
        return map;
    }, [report.completed_cula_by_dm]);
    const udmTableRows = useMemo(() => [...report.by_dm]
        .sort((a, b) => (b.coverage_percent ?? 0) - (a.coverage_percent ?? 0))
        .slice(0, 25)
        .map(row => {
            const dtl = dmDetailsMap[row.key];
            const cula = culaByDmMap[row.key];
            const raceB = dtl?.race_breakdown ?? [];
            const culaB = cula?.cula_breakdown ?? [];
            const culaCompleted = culaCompletedByDmMap[row.key] ?? {};
            const completedSum = (codes) => { let s = 0; for (const c of codes) s += culaCompleted[c] ?? 0; return s; };
            return {
                ...row,
                siap_cula: completedByDmMap[row.key] ?? 0,
                JP: (row.total ?? 0) - getCulaSum(culaB, ['8']),
                L: row.male ?? 0,
                P: row.female ?? 0,
                M: getRaceCount(raceB, ['MELAYU', 'M']),
                C: getRaceCount(raceB, ['CINA', 'C']),
                I: getRaceCount(raceB, ['INDIA', 'I']),
                S: getRaceCount(raceB, ['SIAM', 'S']),
                PAS: getCulaSum(culaB, ['2']),
                PBBM: getCulaSum(culaB, ['10']),
                BN: getCulaSum(culaB, ['1', '1A', '1B', '1P']),
                PH: getCulaSum(culaB, ['5']),
                GTA: 0,
                PLK: getCulaSum(culaB, ['3B', '3D', '3K', '3M', '3P', '3U']),
                'Atas Pagar': getCulaSum(culaB, ['4']),
                'Tak Kenal': getCulaSum(culaB, ['7']),
                'Mati': getCulaSum(culaB, ['8']),
                CULA: row.belum_dicula ?? 0,
                completed_PAS: completedSum(['2']),
                completed_PBBM: completedSum(['10']),
                completed_BN: completedSum(['1', '1A', '1B', '1P']),
                completed_PH: completedSum(['5']),
                completed_GTA: 0,
                completed_PLK: completedSum(['3B', '3D', '3K', '3M', '3P', '3U']),
                completed_AP: completedSum(['4']),
                completed_TK: completedSum(['7']),
                completed_Mati: completedSum(['8']),
            };
        }), [report.by_dm, dmDetailsMap, culaByDmMap, completedByDmMap, culaCompletedByDmMap]);

    const diffMap = useMemo(() => {
        if (!udm_snapshot || !udmTableRows.length) return {};
        const snapshotRows = udm_snapshot;
        const diffs = {};
        for (const row of udmTableRows) {
            const p = snapshotRows.find(r => r.key === row.key);
            if (!p) continue;
            const rowDiffs = {};
            for (const col of diffCols) {
                const d = (row[col] ?? 0) - (p[col] ?? 0);
                if (d !== 0) rowDiffs[col] = d;
            }

            let siapSum = 0;
            for (const col of partyCols) {
                const d = (row[col] ?? 0) - (p[col] ?? 0);
                if (d > 0) siapSum += d;
            }
            if (siapSum > 0) rowDiffs.siap_increase = siapSum;

            if (Object.keys(rowDiffs).length > 0) diffs[row.key] = rowDiffs;
        }
        return diffs;
    }, [udm_snapshot, udmTableRows]);
    const localityRows = filteredLocs.slice(0, 20);
    const culaRows = report.by_cula.slice(0, 12);
    const genderRows = report.gender.filter((r) => r.total > 0);
    const selUdm = dmDetails.find((r) => r.key === udmKey) ?? dmDetails[0] ?? null;
    const selCula = dmCulaRows.find((r) => r.key === udmKey) ?? dmCulaRows[0] ?? null;
    const selCulaChart = (selCula?.cula_breakdown ?? []).filter((e) => e.code !== '?' && !e.display_label?.includes('BELUM DICULA')).slice(0, 12);
    const selLoc = selUdm?.localities.slice(0, 12) ?? [];
    const selRace = selUdm?.race_breakdown.slice(0, 8) ?? [];
    const selLocTable = selUdm?.localities.slice(0, 20) ?? [];
    const ahliPasUdmRows = ahli_pas_stats?.by_udm ?? [];
    const ahliPasChartHeight = Math.max(256, ahliPasUdmRows.length * 34);
    const selGender = useMemo(() => {
        if (!selUdm) return [];
        return [{ k: 'L', l: 'Lelaki', t: selUdm.summary.male ?? 0 }, { k: 'P', l: 'Perempuan', t: selUdm.summary.female ?? 0 }, { k: 'X', l: 'Lain', t: selUdm.summary.other_gender ?? 0 }].filter((r) => r.t > 0);
    }, [selUdm]);
    const locChartRows = localityRows.slice(0, 12);

    const groupH = {
        jp: 'bg-blue-100 text-blue-900',
        demo: 'bg-emerald-100 text-emerald-900',
        party: 'bg-amber-100 text-amber-900',
        total: 'bg-violet-100 text-violet-900',
    };
    const groupC = {
        jp: 'bg-blue-50/40',
        demo: 'bg-emerald-50/40',
        party: 'bg-amber-50/40',
        total: 'bg-violet-50/40',
    };

    const dmCols = [
        { key: 'name', label: 'UDM', format: (v) => <span className="font-bold text-slate-800">{v}</span>, headerClass: 'sticky-th', cellClass: 'sticky-td' },

        { key: 'siap_cula', label: 'Siap', format: (v, r) => fmtSiapDiff(v, diffMap[r.key]?.siap_increase), headerClass: 'bg-green-50 text-green-900', cellClass: 'bg-green-50/40' },
        { key: 'JP', label: 'JP', format: (v, r) => fmtDiff(v, diffMap[r.key]?.JP), headerClass: groupH.jp, cellClass: groupC.jp },
        { key: 'L', label: 'L', format: (v, r) => fmtDiff(v, diffMap[r.key]?.L), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'P', label: 'P', format: (v, r) => fmtDiff(v, diffMap[r.key]?.P), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'M', label: 'M', format: (v, r) => fmtDiff(v, diffMap[r.key]?.M), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'C', label: 'C', format: (v, r) => fmtDiff(v, diffMap[r.key]?.C), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'I', label: 'I', format: (v, r) => fmtDiff(v, diffMap[r.key]?.I), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'S', label: 'S', format: (v, r) => fmtDiff(v, diffMap[r.key]?.S), headerClass: groupH.demo, cellClass: groupC.demo },
        { key: 'PAS', label: 'PAS', format: (v, r) => fmtDiff(v, diffMap[r.key]?.PAS), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'PBBM', label: 'PBBM', format: (v, r) => fmtDiff(v, diffMap[r.key]?.PBBM), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'BN', label: 'BN', format: (v, r) => fmtDiff(v, diffMap[r.key]?.BN), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'PH', label: 'PH', format: (v, r) => fmtDiff(v, diffMap[r.key]?.PH), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'GTA', label: 'GTA', format: (v, r) => fmtDiff(v, diffMap[r.key]?.GTA), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'PLK', label: 'PLK', format: (v, r) => fmtDiff(v, diffMap[r.key]?.PLK), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'Atas Pagar', label: 'AP', format: (v, r) => fmtDiff(v, diffMap[r.key]?.['Atas Pagar']), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'Tak Kenal', label: 'TK', format: (v, r) => fmtDiff(v, diffMap[r.key]?.['Tak Kenal']), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'Mati', label: 'Mati', format: (v, r) => fmtDiff(v, diffMap[r.key]?.Mati), headerClass: groupH.party, cellClass: groupC.party },
        { key: 'CULA', label: 'BAKI', format: (v, r) => fmtDiff(v, diffMap[r.key]?.CULA), headerClass: `${groupH.total} text-center`, cellClass: `${groupC.total} text-center` },
    ];
    const locCols = [
        { key: 'name', label: 'Lokaliti' }, { key: 'dm', label: 'UDM' },
        { key: 'total', label: 'Pemilih', format: fmt },
        { key: 'with_cula', label: 'Sudah', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'coverage_percent', label: 'Siap', format: fmtP },
        { key: 'cula_breakdown', label: 'Status Culaan', format: (_, r) => renderCula(r.cula_breakdown) },
    ];
    const culaCols = [
        { key: 'display_label', label: 'Status' },
        { key: 'total', label: 'Jumlah', format: fmt },
    ];
    const dmLocCols = [
        { key: 'name', label: 'Lokaliti' },
        { key: 'total', label: 'Pemilih', format: fmt },
        { key: 'with_cula', label: 'Sudah', format: fmt },
        { key: 'belum_dicula', label: 'Belum', format: fmt },
        { key: 'coverage_percent', label: 'Siap', format: fmtP },
        { key: 'cula_breakdown', label: 'Status', format: (_, r) => renderCula(r.cula_breakdown) },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="label-section">Laporan</p>
                        <h2 className="mt-0.5 heading-lg">Analitik Pemilih</h2>
                        <p className="text-muted mt-0.5">Mengikut UDM, lokaliti dan status culaan.</p>
                    </div>
                    {pemilih_report?.name && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs shadow-sm">
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
                            {canSendStatusCula && (
                                <>
                                    <button type="button" onClick={openN8nModal} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-green-700 to-green-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition hover:from-green-600 hover:to-green-400">
                                        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                                        </svg>
                                        Hantar Status Cula
                                    </button>
                                    {n8nNotice && <span className="font-semibold text-green-700">{n8nNotice}</span>}
                                </>
                            )}
                        </div>
                    )}
                </div>
            }
        >
            <Head title="Laporan" />
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                {!report.source.exists ? (
                    <div className="card-dashed"><p className="text-xs font-bold text-slate-800">Tiada fail</p><p className="mt-1 text-xs text-slate-600">Muat naik fail pemilih di Settings untuk mula.</p></div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard label="Jumlah Pemilih" value={report.summary.total_voters} detail="Dalam fail semasa" color="violet" />
                            <StatCard label="Sudah Dicula" value={report.summary.with_cula} detail="Ada status culaan" color="emerald" />
                            <StatCard label="Belum Dicula" value={report.summary.belum_dicula} detail="Kod kosong/?" color="amber" />
                            <StatCard label="Peratus Siap" value={report.summary.coverage_percent} detail={`${fmt(report.summary.total_localities)} lokaliti`} color="cyan" />
                        </div>


                        <DataTable rows={udmTableRows} columns={dmCols} />
                        {udm_snapshot_meta && (
                            <p className="text-center text-[10px] text-slate-400" style={{marginTop:'5px'}}>Data pergerakan cula dikira bermula {(()=>{const m=udm_snapshot_meta.snapshot_time.match(/^(\d{2})-(\d{2})-(\d{4})/);if(!m)return'';const dt=new Date(+m[3],+m[2]-1,+m[1]);return isNaN(dt.getTime())?'':hari[dt.getDay()]})()}, {udm_snapshot_meta.snapshot_time}</p>
                        )}

                        <div className="card p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Log Masuk Terkini</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-950">Akses pengguna terkini</h3>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {recent_logins.map((r) => (
                                    <span key={r.name} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/50">
                                        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                                        {r.name}
                                        <span className="text-blue-400">•</span>
                                        {r.last_login_at}
                                    </span>
                                ))}
                                {recent_logins.length === 0 && <p className="text-xs text-slate-500">Tiada rekod log masuk.</p>}
                            </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
                            <ChartPanel title="Top UDM">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dmChartRows} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                        <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={56} tick={{ fontSize: 9, fill: '#475569' }} />
                                        <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                        <Tooltip content={<TTip />} />
                                        <Bar dataKey="total" name="Jumlah" fill="#059669" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                            <ChartPanel title="Jantina">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={genderRows.map((r) => ({ ...r, label: r.label }))} dataKey="total" nameKey="label" innerRadius={44} outerRadius={76} paddingAngle={2}>
                                            {genderRows.map((e, i) => <Cell key={e.key} fill={chartColors[i % chartColors.length]} />)}
                                        </Pie>
                                        <Tooltip content={<TTip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartPanel>
                        </div>

                        {ahli_pas_stats && (
                            <section className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-4 shadow-sm">
                                <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
                                <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-lime-200/30 blur-3xl" />
                                <div className="relative">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-700">Keahlian PAS</p>
                                            <h3 className="mt-0.5 text-sm font-bold text-slate-900">Keahlian PAS Mengikut UDM</h3>
                                            <p className="mt-1 text-xs text-slate-500">Semua {fmt(ahliPasUdmRows.length)} UDM dengan rekod ahli dalam skop semasa.</p>
                                        </div>
                                        <div className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-right shadow-sm backdrop-blur">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">Jumlah Ahli</p>
                                            <p className="mt-0.5 text-xl font-black leading-none text-emerald-700">{fmt(ahli_pas_stats.total)}</p>
                                        </div>
                                    </div>
                                    {ahliPasUdmRows.length > 0 ? (
                                        <div className="mt-3 rounded-lg border border-emerald-100 bg-white/70 p-2 shadow-inner shadow-emerald-100/60" style={{ height: ahliPasChartHeight }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={ahliPasUdmRows} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 116 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#bbf7d0" />
                                                    <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: '#64748b' }} />
                                                    <YAxis type="category" dataKey="name" width={116} tick={{ fontSize: 10, fill: '#166534' }} />
                                                    <Tooltip content={<TTip />} />
                                                    <Bar dataKey="total" name="Ahli PAS" fill="#10b981" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: fmt, fill: '#047857', fontSize: 10, fontWeight: 700 }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-emerald-200 bg-white/70 text-xs font-semibold text-slate-400">Tiada data keahlian PAS dalam skop.</div>
                                    )}
                                </div>
                            </section>
                        )}

                        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
                            <div className="flex gap-0.5">
                                {[{ k: 'udm', l: 'UDM' }, { k: 'locality', l: 'Lokaliti' }, { k: 'cula', l: 'Status Culaan' }].map((t) => (
                                    <button key={t.k} onClick={() => setTab(t.k)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${tab === t.k ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'text-slate-500 hover:bg-green-50 hover:text-green-700'}`}>
                                        {t.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'udm' && (
                            <section className="space-y-3">
                                <ChartPanel title={`Ringkasan ${selUdm?.name ?? '-'}`} compact
                                    action={
                                        <select value={selUdm?.key ?? ''} onChange={(e) => setUdmKey(e.target.value)} className="input-field w-auto py-1.5 text-xs">
                                            {dmDetails.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                                        </select>
                                    }>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <StatCard label="Jumlah" value={selUdm?.summary.total_voters ?? 0} detail={`${fmt(selUdm?.summary.total_localities ?? 0)} lokaliti`} color="violet" />
                                        <StatCard label="Sudah" value={selUdm?.summary.with_cula ?? 0} detail="Dicula" color="emerald" />
                                        <StatCard label="Belum" value={selUdm?.summary.belum_dicula ?? 0} detail="Dicula" color="amber" />
                                        <StatCard label="Siap" value={selUdm?.summary.coverage_percent ?? 0} detail="Peratus" color="cyan" />
                                    </div>
                                </ChartPanel>

                                <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                                    <ChartPanel title="Status Culaan Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selCulaChart} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                                <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <Tooltip content={<TTip />} />
                                                <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                    {selCulaChart.map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                    <ChartPanel title="Jantina Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={selGender} dataKey="t" nameKey="l" innerRadius={40} outerRadius={72} paddingAngle={2}>
                                                    {selGender.map((e, i) => <Cell key={e.k} fill={chartColors[i % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip content={<TTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </div>

                                <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
                                    <ChartPanel title="Pemilih Setiap Lokaliti">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={selLoc} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1d5db" />
                                                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: '#475569' }} />
                                                <Tooltip content={<TTip />} />
                                                <Bar dataKey="with_cula" name="Sudah" stackId="t" fill="#10b981" radius={[0, 0, 2, 2]} />
                                                <Bar dataKey="belum_dicula" name="Belum" stackId="t" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                    <ChartPanel title="Bangsa Dalam UDM">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={selRace} dataKey="total" nameKey="label" innerRadius={40} outerRadius={72} paddingAngle={2}>
                                                    {selRace.map((e, i) => <Cell key={e.code} fill={chartColors[i % chartColors.length]} />)}
                                                </Pie>
                                                <Tooltip content={<TTip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartPanel>
                                </div>

                                <DataTable rows={selLocTable} columns={dmLocCols} />
                            </section>
                        )}

                        {tab === 'locality' && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari lokaliti, UDM..." className="input-field sm:max-w-xs" />
                                    <span className="text-xs font-semibold text-slate-500">{fmt(localityRows.length)}/{fmt(filteredLocs.length)}</span>
                                </div>
                                <ChartPanel title="Top Lokaliti">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={locChartRows} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1d5db" />
                                            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="with_cula" name="Sudah" stackId="t" fill="#10b981" radius={[0, 0, 2, 2]} />
                                            <Bar dataKey="belum_dicula" name="Belum" stackId="t" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={localityRows} columns={locCols} />
                            </section>
                        )}

                        {tab === 'cula' && (
                            <section className="space-y-3">
                                <ChartPanel title="Taburan Status Culaan">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={culaRows} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d5db" />
                                            <XAxis dataKey="display_label" interval={0} angle={-25} textAnchor="end" height={52} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis tickFormatter={fmt} width={44} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <Tooltip content={<TTip />} />
                                            <Bar dataKey="total" name="Jumlah" radius={[2, 2, 0, 0]}>
                                                {culaRows.map((e, i) => <Cell key={`${e.code}-${i}`} fill={getBarColor(e, i)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartPanel>
                                <DataTable rows={report.by_cula} columns={culaCols} />
                            </section>
                        )}
                    </>
                )}
            </div>
            <N8nMessageModal
                open={n8nModalOpen}
                message={n8nMessage}
                onChange={setN8nMessage}
                onClose={() => { if (!n8nSending) setN8nModalOpen(false); }}
                onSend={sendN8nMessage}
                sending={n8nSending}
                error={n8nError}
            />
        </AuthenticatedLayout>
    );
}
