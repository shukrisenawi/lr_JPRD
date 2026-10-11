import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { orderUdms } from '@/Utils/udmOrder';
import { useEffect, useMemo, useState } from 'react';

const numberFormat = new Intl.NumberFormat('ms-MY');
const moneyFormat = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' });
const COST_CULA_CODE_ORDER = ['3U', '3D', '3P', '3K', '3B', '3M'];
const verificationStatusLabels = {
    maklumat_sah: 'Maklumat Sah',
    maklumat_tidak_sah: 'Maklumat Tidak Sah',
};

function formatNumber(value) {
    return numberFormat.format(value ?? 0);
}

function formatMoney(value) {
    return moneyFormat.format(Number(value ?? 0));
}

function calculateAmount(row, code, rates) {
    return Number(row.counts?.[code] || 0) * Number(rates[code] || 0);
}

function orderCostCodes(codes = []) {
    return [...codes].sort((a, b) => COST_CULA_CODE_ORDER.indexOf(a.code) - COST_CULA_CODE_ORDER.indexOf(b.code));
}

function compareVoterIdentityNumbers(a, b) {
    const noKpA = String(a.no_kp || '').replace(/\D/g, '');
    const noKpB = String(b.no_kp || '').replace(/\D/g, '');

    if (!noKpA && noKpB) return 1;
    if (noKpA && !noKpB) return -1;

    return noKpA.localeCompare(noKpB, 'ms', { numeric: true })
        || String(a.name || '').localeCompare(String(b.name || ''), 'ms', { numeric: true });
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

function UdmCulaCards({ rows, codes, total, codeCounts, onSelectUdm }) {
    return (
        <section className="space-y-2 border-b border-slate-100 p-3">
            <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Pilih UDM</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">Pilih kad untuk membuka senarai pemilih PLK.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <button
                    type="button"
                    onClick={() => onSelectUdm('')}
                    aria-label="Papar senarai pemilih semua UDM"
                    className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100/70 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-emerald-900">Semua UDM</span>
                        <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-1 text-[10px] font-black text-white">{formatNumber(total)} pemilih</span>
                    </span>
                    <span className="mt-2 grid grid-cols-3 gap-1.5">
                        {codes.map((code) => (
                            <span key={code.code} className="rounded-lg bg-white/80 px-2 py-1.5 text-center">
                                <span className="block text-[9px] font-black text-slate-500">{code.code}</span>
                                <span className="mt-0.5 block text-xs font-bold text-slate-800">{formatNumber(codeCounts?.[code.code])}</span>
                            </span>
                        ))}
                    </span>
                </button>
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

function VoterTable({ voters, checkedTab, hideCulaCode, verifyingIds, culaSemulaIds, onVerify, onRequestUnverify, onStartCula, onCompleteCula, onCancelCula, onPage }) {
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
                <table className={`w-full border-collapse text-left ${checkedTab ? 'min-w-[1420px]' : hideCulaCode ? 'min-w-[1040px]' : 'min-w-[1180px]'}`}>
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Maklumat pemilih</th>
                            {!hideCulaCode && <th className="px-4 py-3">Kod Cula</th>}
                            <th className="px-4 py-3">UDM / Lokaliti</th>
                            <th className="px-4 py-3">Telefon</th>
                            <th className="px-4 py-3">Catatan</th>
                            {checkedTab && <th className="px-4 py-3">Status Semakan</th>}
                            {checkedTab && <th className="px-4 py-3">Remark</th>}
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
                                <td className="max-w-[260px] whitespace-pre-line break-words px-4 py-3 text-[11px] leading-relaxed text-slate-600">{voter.catatan || '-'}</td>
                                {checkedTab && (
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${voter.verification_status === 'maklumat_tidak_sah' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {verificationStatusLabels[voter.verification_status] || '-'}
                                        </span>
                                    </td>
                                )}
                                {checkedTab && (
                                    <td className="max-w-[280px] whitespace-pre-line break-words px-4 py-3 text-[11px] leading-relaxed text-slate-600">
                                        {voter.verification_remark || '-'}
                                    </td>
                                )}
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
                                                {verifyingIds.includes(voter.id) ? 'Menyimpan…' : 'Telah semak'}
                                            </button>
                                        ) : (
                                            <>
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                                                    Telah semak
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
                                        {culaSemulaIds.has(voter.id) ? (
                                            <>
                                                <button type="button" onClick={() => onCompleteCula(voter)} className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-500">Siap Cula</button>
                                                <button type="button" onClick={() => onCancelCula(voter.id)} title="Kembali ke asal" aria-label={`Batalkan tindakan Cula untuk ${voter.name}`} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-500 transition hover:border-rose-300 hover:text-rose-600">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                                </button>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => onStartCula(voter)} disabled={!voter.telegram_identity} className="inline-flex items-center rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-40">Cula</button>
                                        )}
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
    const { errors = {}, auth, can_view_costs: canViewCosts = false } = usePage().props;
    const isUdmUser = auth?.user?.access_level === 'udm';
    const [search, setSearch] = useState(filters.q || '');
    const [selectedUdm, setSelectedUdm] = useState(filters.udm || '');
    const [rates, setRates] = useState(initialRates || {});
    const [verifyingIds, setVerifyingIds] = useState([]);
    const [verificationToSave, setVerificationToSave] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('');
    const [verificationRemark, setVerificationRemark] = useState('');
    const [verificationErrors, setVerificationErrors] = useState({});
    const [savingRates, setSavingRates] = useState(false);
    const [verificationToCancel, setVerificationToCancel] = useState(null);
    const [cancelingVerification, setCancelingVerification] = useState(false);
    const [culaSemulaIds, setCulaSemulaIds] = useState(() => new Set());
    const [selectedVoterForCula, setSelectedVoterForCula] = useState(null);
    const [savingCula, setSavingCula] = useState(false);
    const [culaActionError, setCulaActionError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportingCosts, setExportingCosts] = useState(false);
    const [exportError, setExportError] = useState('');
    const costCodes = useMemo(() => orderCostCodes(codes || []), [codes]);

    useEffect(() => setSearch(filters.q || ''), [filters.q]);
    useEffect(() => setSelectedUdm(filters.udm || ''), [filters.udm]);
    useEffect(() => setRates(initialRates || {}), [initialRates]);

    const navigate = (next = {}) => {
        router.get(route('plk.index'), {
            tab: activeTab,
            udm: selectedUdm,
            q: search,
            cula_code: filters.cula_code || '',
            show_voters: filters.show_voters ? 1 : 0,
            ...next,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const visitTab = (tab) => navigate({ tab, cula_code: tab === 'senarai' ? (filters.cula_code || '') : '', show_voters: 0, page: 1 });
    const visitCulaCode = (code) => navigate({ tab: 'senarai', cula_code: code, page: 1 });

    const openVerificationModal = (voter) => {
        setVerificationToSave(voter);
        setVerificationStatus('');
        setVerificationRemark('');
        setVerificationErrors({});
    };

    const saveVerification = (event) => {
        event.preventDefault();
        if (!verificationToSave || verifyingIds.includes(verificationToSave.id)) return;

        const voterId = verificationToSave.id;
        setVerificationErrors({});
        setVerifyingIds((current) => [...current, voterId]);
        router.post(route('plk.verify', voterId), {
            status: verificationStatus,
            remark: verificationRemark,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setVerificationToSave(null);
                setVerificationStatus('');
                setVerificationRemark('');
            },
            onError: (formErrors) => setVerificationErrors(formErrors),
            onFinish: () => setVerifyingIds((current) => current.filter((id) => id !== voterId)),
        });
    };

    const closeVerificationModal = () => {
        if (verificationToSave && verifyingIds.includes(verificationToSave.id)) return;
        setVerificationToSave(null);
        setVerificationErrors({});
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

    const startCula = (voter) => {
        setCulaSemulaIds((current) => new Set([...current, voter.id]));
        openTelegram('kemascula', voter);
    };

    const saveCula = async (code) => {
        if (!selectedVoterForCula || savingCula) return;

        setSavingCula(true);
        setCulaActionError('');

        try {
            const response = await fetch(route('plk.update-cula', selectedVoterForCula.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ cula_code: code }),
            });

            if (!response.ok) throw new Error('Request failed');

            setSelectedVoterForCula(null);
            router.reload({ preserveScroll: true });
        } catch (error) {
            setCulaActionError('Kod Cula tidak berjaya disimpan. Sila cuba lagi.');
        } finally {
            setSavingCula(false);
        }
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

            const headers = ['Bil.', 'Nama', 'No. KP', 'Telefon', 'Kod Cula', 'Catatan'];
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'JPrD Jeneri';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Senarai PLK', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'portrait',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    margins: { left: 0.3, right: 0.3, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 },
                },
            });
            worksheet.views = [{ showGridLines: false }];
            [8, 36, 20, 20, 14, 42].forEach((width, index) => {
                worksheet.getColumn(index + 1).width = width;
            });

            const border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            };
            const addMergedRow = (text, { size = 12, color = 'FF14532D', fill = 'FFECFDF5', horizontal = 'left' } = {}) => {
                const row = worksheet.addRow([text]);
                worksheet.mergeCells(row.number, 1, row.number, headers.length);
                row.height = size >= 22 ? 34 : (size > 12 ? 26 : 22);
                const cell = row.getCell(1);
                cell.font = { name: 'Calibri', size, bold: true, color: { argb: color } };
                cell.alignment = { vertical: 'middle', horizontal, wrapText: true };
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
            const addVoterRow = (voter, number) => {
                const row = worksheet.addRow([
                    number,
                    voter.name || '-',
                    voter.no_kp || '-',
                    voter.phone || '-',
                    voter.cula_code || '-',
                    voter.catatan || '-',
                ]);
                row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: [1, 3, 4, 5].includes(columnNumber) ? 'center' : 'left',
                        wrapText: true,
                    };
                    cell.border = border;
                });
            };

            const date = new Date();
            const dateLabel = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
            const addReportTitle = () => {
                addMergedRow('SENARAI PEMILIH PLK DUN JENERI', {
                    size: 22,
                    color: 'FFFFFFFF',
                    fill: 'FF047857',
                    horizontal: 'center',
                });
                addMergedRow(`Tarikh : ${dateLabel}`, { size: 10, color: 'FF475569', fill: 'FFF8FAFC' });
            };

            const sortedUdms = orderUdms([...udmGroups.keys()]);
            if (sortedUdms.length === 0) {
                addReportTitle();
                addMergedRow('Tiada pemilih untuk tapisan ini.', { size: 11, color: 'FF64748B', fill: 'FFFFFFFF' });
            }

            sortedUdms.forEach((udm, udmIndex) => {
                const localities = udmGroups.get(udm);
                const localityNames = [...localities.keys()].sort((a, b) => a.localeCompare(b, 'ms', { numeric: true }));
                addReportTitle();
                addMergedRow(`UDM: ${udm}`, { size: 14, color: 'FFFFFFFF', fill: 'FF047857' });

                let number = 1;
                localityNames.forEach((locality) => {
                    addMergedRow(`Lokaliti: ${locality}`, { size: 11, color: 'FF14532D', fill: 'FFD1FAE5' });
                    addHeaderRow();
                    localities.get(locality)
                        .slice()
                        .sort(compareVoterIdentityNumbers)
                        .forEach((voter) => {
                            addVoterRow(voter, number++);
                        });
                });

                if (udmIndex < sortedUdms.length - 1) worksheet.lastRow?.addPageBreak();
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filenameUdm = selectedUdm
                ? selectedUdm.trim().replace(/[<>:"\/\\|?*]+/g, '_').replace(/\s+/g, '_')
                : 'SEMUA_UDM';
            link.download = `SENARAI_PEMILIH_PLK_DUN_JENERI_${filenameUdm}_${dateLabel}.xlsx`;
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

    const exportCostsToExcel = async () => {
        if (exportingCosts) return;

        setExportingCosts(true);
        setExportError('');

        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'JPrD Jeneri';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Kiraan Kos PLK', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    margins: { left: 0.3, right: 0.3, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 },
                },
            });
            worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 6, showGridLines: false }];
            worksheet.pageSetup.printTitlesRow = '1:6';
            worksheet.headerFooter.oddFooter = '&LJPrD Jeneri&RHalaman &P / &N';
            const lastColumn = costCodes.length * 2 + 3;
            const orderedCostRows = orderUdms(costRows || []);
            worksheet.getColumn(1).width = 5;
            worksheet.getColumn(2).width = 26;
            costCodes.forEach((code, index) => {
                worksheet.getColumn(index * 2 + 3).width = 8;
                worksheet.getColumn(index * 2 + 4).width = 15;
            });
            worksheet.getColumn(lastColumn).width = 19;

            const border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
            const addMergedTitle = (text, { size, color, fill }) => {
                const row = worksheet.addRow([text]);
                worksheet.mergeCells(row.number, 1, row.number, lastColumn);
                row.height = size >= 18 ? 30 : 20;
                const cell = row.getCell(1);
                cell.font = { name: 'Calibri', size, bold: true, color: { argb: color } };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
            };

            const now = new Date();
            const dateLabel = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            addMergedTitle('KIRAAN KOS PEMILIH PLK DUN JENERI', { size: 18, color: 'FFFFFFFF', fill: 'FF047857' });
            addMergedTitle(`Tarikh : ${dateLabel}`, { size: 10, color: 'FF475569', fill: 'FFF8FAFC' });
            const totalVoters = orderedCostRows.reduce((total, row) => total + costCodes.reduce((sum, code) => sum + Number(row.counts?.[code.code] || 0), 0), 0);
            const overallAmount = orderedCostRows.reduce((total, row) => total + costCodes.reduce((sum, code) => sum + calculateAmount(row, code.code, rates), 0), 0);
            addMergedTitle(`${formatNumber(orderedCostRows.length)} UDM  |  ${formatNumber(totalVoters)} pemilih  |  Jumlah bayaran: ${formatMoney(overallAmount)}`, { size: 11, color: 'FF065F46', fill: 'FFECFDF5' });

            for (let rowNumber = 4; rowNumber <= 6; rowNumber += 1) {
                worksheet.getRow(rowNumber).height = rowNumber === 6 ? 22 : 25;
                for (let column = 1; column <= lastColumn; column += 1) {
                    const cell = worksheet.getCell(rowNumber, column);
                    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: rowNumber === 4 ? 'FFFFFFFF' : 'FF334155' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber === 4 ? 'FF0F766E' : 'FFF1F5F9' } };
                    cell.border = border;
                }
            }
            [[1, 'Bil.'], [2, 'UDM'], [lastColumn, 'JUMLAH UDM\n(RM)']].forEach(([column, label]) => {
                worksheet.mergeCells(4, column, 6, column);
                worksheet.getCell(4, column).value = label;
            });
            costCodes.forEach((code, index) => {
                const column = index * 2 + 3;
                worksheet.mergeCells(4, column, 4, column + 1);
                worksheet.getCell(4, column).value = code.code;
                worksheet.getCell(4, column).note = code.label;
                worksheet.getCell(5, column).value = 'Bilangan';
                worksheet.getCell(5, column + 1).value = 'Kos (RM)';
                worksheet.mergeCells(6, column, 6, column + 1);
                const rateCell = worksheet.getCell(6, column);
                rateCell.value = Number(rates[code.code] || 0);
                rateCell.numFmt = '"RM" #,##0.00" / orang"';
                rateCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
            });

            orderedCostRows.forEach((row, index) => {
                const dataRow = worksheet.addRow([index + 1, row.udm]);
                dataRow.height = 27;
                let totalUdm = 0;
                const amountAddresses = [];
                costCodes.forEach((code, codeIndex) => {
                    const column = codeIndex * 2 + 3;
                    const quantity = Number(row.counts?.[code.code] || 0);
                    const amount = calculateAmount(row, code.code, rates);
                    totalUdm += amount;
                    const quantityCell = dataRow.getCell(column);
                    const amountCell = dataRow.getCell(column + 1);
                    quantityCell.value = quantity;
                    quantityCell.numFmt = '#,##0;[Red](#,##0);"–"';
                    amountCell.value = { formula: `${quantityCell.address}*${worksheet.getColumn(column).letter}$6`, result: amount };
                    amountCell.numFmt = '#,##0.00;[Red](#,##0.00);"–"';
                    amountAddresses.push(amountCell.address);
                });
                dataRow.getCell(lastColumn).value = { formula: `SUM(${amountAddresses.join(',')})`, result: totalUdm };
                dataRow.getCell(lastColumn).numFmt = '"RM" #,##0.00';
                dataRow.eachCell({ includeEmpty: true }, (cell, column) => {
                    cell.font = { name: 'Calibri', size: 10, bold: column === 2 || column === lastColumn, color: { argb: column === lastColumn ? 'FF065F46' : 'FF334155' } };
                    cell.alignment = { vertical: 'middle', horizontal: column === 2 ? 'left' : column <= 2 || column % 2 === 1 ? 'center' : 'right', wrapText: true };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column === lastColumn ? 'FFECFDF5' : index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
                    cell.border = border;
                });
            });

            const totalRow = worksheet.addRow(['JUMLAH KESELURUHAN']);
            worksheet.mergeCells(totalRow.number, 1, totalRow.number, 2);
            totalRow.height = 30;
            for (let column = 3; column <= lastColumn; column += 1) {
                const result = column === lastColumn ? overallAmount : orderedCostRows.reduce((sum, row) => {
                    const code = costCodes[Math.floor((column - 3) / 2)].code;
                    return sum + (column % 2 === 1 ? Number(row.counts?.[code] || 0) : calculateAmount(row, code, rates));
                }, 0);
                const cell = totalRow.getCell(column);
                cell.value = orderedCostRows.length ? { formula: `SUM(${worksheet.getColumn(column).letter}7:${worksheet.getColumn(column).letter}${totalRow.number - 1})`, result } : 0;
                cell.numFmt = column === lastColumn ? '"RM" #,##0.00' : column % 2 === 1 ? '#,##0' : '#,##0.00';
            }
            totalRow.eachCell({ includeEmpty: true }, (cell, column) => {
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { vertical: 'middle', horizontal: column <= 2 ? 'left' : column % 2 === 1 && column !== lastColumn ? 'center' : 'right', wrapText: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
                cell.border = border;
            });
            worksheet.pageSetup.printArea = `A1:${worksheet.getColumn(lastColumn).letter}${totalRow.number}`;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KIRAAN_KOS_PLK_DUN_JENERI_${dateLabel}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            setExportError(error.message || 'Eksport kiraan kos Excel tidak berjaya. Sila cuba lagi.');
        } finally {
            setExportingCosts(false);
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
                    <div className={`grid ${canViewCosts ? 'grid-cols-3' : 'grid-cols-2'} gap-1 border-b border-slate-200 bg-slate-50/70 p-1.5`}>
                        <TabButton active={activeTab === 'senarai'} label="Senarai pemilih PLK" count={summary.total} onClick={() => visitTab('senarai')} />
                        <TabButton active={activeTab === 'disemak'} label="Pemilih sudah semak" count={summary.checked} onClick={() => visitTab('disemak')} />
                        {canViewCosts && <TabButton active={activeTab === 'kos'} label="Kiraan kos" onClick={() => visitTab('kos')} />}
                    </div>

                    {activeTab !== 'kos' ? (
                        <>
                            <form onSubmit={(event) => { event.preventDefault(); navigate({ q: search, udm: selectedUdm, page: 1 }); }} className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
                                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, No. KP, telefon atau lokaliti" className="input-field min-w-0 flex-1 text-xs" />
                                {!isUdmUser && (
                                    <select value={selectedUdm} onChange={(event) => { setSelectedUdm(event.target.value); navigate({ udm: event.target.value, page: 1 }); }} className="input-field text-xs sm:w-56">
                                        <option value="">Semua UDM</option>
                                        {orderUdms(udms).map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                    </select>
                                )}
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
                            {activeTab === 'senarai' && selectedUdm === '' && !filters.show_voters && !isUdmUser && (
                                <UdmCulaCards
                                    rows={udmCulaCounts}
                                    codes={codes || []}
                                    total={summary.total}
                                    codeCounts={codeCounts}
                                    onSelectUdm={(udm) => {
                                        setSelectedUdm(udm);
                                        navigate({ udm, show_voters: 1, page: 1 });
                                    }}
                                />
                            )}
                            {activeTab !== 'senarai' || filters.show_voters || isUdmUser ? (
                                <>
                                    {activeTab === 'senarai' && filters.show_voters && !isUdmUser && (
                                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs font-bold text-slate-700">Senarai pemilih: {selectedUdm || 'Semua UDM'}</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedUdm('');
                                                    navigate({ udm: '', show_voters: 0, page: 1 });
                                                }}
                                                className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 sm:self-auto"
                                            >
                                                Kembali ke kad UDM
                                            </button>
                                        </div>
                                    )}
                                    <VoterTable voters={voters} checkedTab={activeTab === 'disemak'} hideCulaCode={activeTab === 'senarai' && Boolean(filters.cula_code)} verifyingIds={verifyingIds} culaSemulaIds={culaSemulaIds} onVerify={openVerificationModal} onRequestUnverify={setVerificationToCancel} onStartCula={startCula} onCompleteCula={(voter) => { setCulaActionError(''); setSelectedVoterForCula(voter); }} onCancelCula={(voterId) => setCulaSemulaIds((current) => { const next = new Set(current); next.delete(voterId); return next; })} onPage={onPage} />
                                </>
                            ) : null}
                        </>
                    ) : (
                        <div className="p-3 sm:p-4">
                            <form onSubmit={saveRates}>
                                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-emerald-950">Kadar bayaran bagi setiap kod Cula</p>
                                        <p className="mt-0.5 text-[11px] text-emerald-800">Tetapkan kadar seorang. Kadar ini digunakan untuk mengira jumlah bayaran setiap UDM.</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <button type="submit" disabled={savingRates} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">{savingRates ? 'Menyimpan…' : 'Simpan kadar'}</button>
                                        <button type="button" onClick={exportCostsToExcel} disabled={exportingCosts} className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50">
                                            {exportingCosts ? 'Menyediakan Excel…' : 'Eksport Excel'}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                    {costCodes.map((code) => (
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
                            {exportError && <p role="alert" className="mb-3 border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{exportError}</p>}
                            <CostTable rows={costRows || []} codes={costCodes} rates={rates} />
                        </div>
                    )}
                </section>
            </div>
            {selectedVoterForCula && (
                <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
                    <button type="button" onClick={() => !savingCula && setSelectedVoterForCula(null)} disabled={savingCula} aria-label="Tutup dialog Siap Cula" className="absolute inset-0 h-full w-full cursor-default bg-transparent disabled:cursor-wait" />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="plk-cula-title">
                        <div className="flex items-center justify-between gap-2">
                            <h3 id="plk-cula-title" className="text-sm font-bold text-slate-800">Siap Cula — {selectedVoterForCula.name}</h3>
                            <button type="button" onClick={() => setSelectedVoterForCula(null)} disabled={savingCula} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-50">Tutup</button>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Pilih kod Cula PLK yang telah dikemaskini:</p>
                        {culaActionError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{culaActionError}</p>}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {(codes || []).map((code) => (
                                <button key={code.code} type="button" onClick={() => saveCula(code.code)} disabled={savingCula} className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm transition hover:shadow-md disabled:cursor-wait disabled:opacity-50 ${code.code === selectedVoterForCula.cula_code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700'}`}>
                                    {savingCula ? 'Menyimpan…' : `${code.code} — ${code.label}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {verificationToSave && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
                    <form
                        onSubmit={saveVerification}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="plk-verification-title"
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 id="plk-verification-title" className="text-base font-black text-slate-900">Semakan pemilih PLK</h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">Pilih status maklumat dan tambah remark jika perlu.</p>
                            </div>
                            <button type="button" onClick={closeVerificationModal} disabled={verifyingIds.includes(verificationToSave.id)} className="text-xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50" aria-label="Tutup">&times;</button>
                        </div>

                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                            <p className="text-xs font-bold text-slate-800">{verificationToSave.name || 'Nama tidak direkodkan'}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">No. KP: {verificationToSave.no_kp || '-'}</p>
                        </div>

                        <label htmlFor="plk-verification-status" className="mt-4 block text-xs font-bold text-slate-700">Status <span className="text-rose-600">*</span></label>
                        <select
                            id="plk-verification-status"
                            value={verificationStatus}
                            onChange={(event) => setVerificationStatus(event.target.value)}
                            disabled={verifyingIds.includes(verificationToSave.id)}
                            required
                            className="input-field mt-1.5 text-sm"
                        >
                            <option value="">Pilih status</option>
                            <option value="maklumat_sah">Maklumat Sah</option>
                            <option value="maklumat_tidak_sah">Maklumat Tidak Sah</option>
                        </select>
                        {verificationErrors.status && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{verificationErrors.status}</p>}

                        <label htmlFor="plk-verification-remark" className="mt-4 block text-xs font-bold text-slate-700">Remark</label>
                        <textarea
                            id="plk-verification-remark"
                            rows="4"
                            maxLength="1000"
                            value={verificationRemark}
                            onChange={(event) => setVerificationRemark(event.target.value)}
                            disabled={verifyingIds.includes(verificationToSave.id)}
                            placeholder="Catatan tambahan untuk semakan ini..."
                            className="input-field mt-1.5 resize-y text-sm"
                        />
                        <p className="mt-1 text-right text-[10px] text-slate-400">{verificationRemark.length}/1000</p>
                        {verificationErrors.remark && <p role="alert" className="mt-1 text-xs font-semibold text-rose-600">{verificationErrors.remark}</p>}

                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={closeVerificationModal} disabled={verifyingIds.includes(verificationToSave.id)} className="btn-outline px-3 py-2 text-xs disabled:opacity-50">Batal</button>
                            <button type="submit" disabled={!verificationStatus || verifyingIds.includes(verificationToSave.id)} className="btn-primary px-3 py-2 text-xs disabled:cursor-wait disabled:opacity-60">
                                {verifyingIds.includes(verificationToSave.id) ? 'Menyimpan…' : 'Simpan semakan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
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
