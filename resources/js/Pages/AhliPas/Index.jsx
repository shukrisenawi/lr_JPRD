import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import { useEffect, useState } from "react";

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        search: (
            <>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </>
        ),
        users: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
        ),
        chart: (
            <>
                <path d="M3 3v18h18" />
                <path d="m7 16 4-5 3 2 5-7" />
            </>
        ),
        alert: (
            <>
                <path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
            </>
        ),
        eye: (
            <>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        x: (
            <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
            </>
        ),
    };

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {paths[name]}
        </svg>
    );
}

function Pagination({ members, onPage }) {
    if (!members || members.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {members.from ?? 0} - {members.to ?? 0} daripada{" "}
                {members.total} ahli
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onPage(members.current_page - 1)}
                    disabled={!members.prev_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Sebelum
                </button>
                {members.links
                    ?.filter((link) => /^\d+$/.test(String(link.label)))
                    .map((link) => (
                        <button
                            key={link.label}
                            type="button"
                            onClick={() => onPage(Number(link.label))}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${link.active ? "bg-green-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:text-green-700"}`}
                        >
                            {link.label}
                        </button>
                    ))}
                <button
                    type="button"
                    onClick={() => onPage(members.current_page + 1)}
                    disabled={!members.next_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Seterusnya
                </button>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, icon }) {
    return (
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                </p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Icon name={icon} className="h-4 w-4" />
                </span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-800">
                {Number(value ?? 0).toLocaleString("ms-MY")}
            </p>
        </div>
    );
}

function culaStatus(member) {
    if (
        !member.cula_code ||
        member.cula_code === "?" ||
        member.cula_code === "TIADA"
    )
        return "Belum Cula";
    return member.cula_display_label || member.cula_code;
}

function formatDate(value) {
    const [year, month, day] = String(value || "")
        .slice(0, 10)
        .split("-");
    return year && month && day ? `${day}/${month}/${year}` : "-";
}

function NoAhliBadge({ member, copiedNoAhli, onCopy }) {
    const copied = copiedNoAhli === member.no_ahli;
    return (
        <button
            type="button"
            onClick={() => onCopy(member.no_ahli)}
            title="Klik untuk salin No. Ahli"
            aria-label={`Salin No. Ahli ${member.no_ahli}`}
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold transition ${copied ? "bg-emerald-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
        >
            {copied ? "Disalin" : member.no_ahli}
        </button>
    );
}

function DetailModal({ member, onClose }) {
    const address =
        member.alamat_kediaman || member.alamat_kp || member.address || "-";
    const fields = [
        ["No. Ahli", member.no_ahli],
        ["No. KP", member.no_kp || member.old_ic || "-"],
        ["UDM", member.dm || "-"],
        ["Lokaliti", member.locality || "-"],
        ["No. Telefon", member.phone_mobile || member.phone_home || "-"],
        ["Tarikh Lahir", formatDate(member.date_of_birth)],
        ["Status Cula", culaStatus(member)],
        ["Alamat", address],
        ["Catatan", member.catatan || "-"],
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-3 pt-12 backdrop-blur-sm sm:items-center sm:pt-3">
            <section
                className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Maklumat pemilih"
            >
                <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                            Maklumat Pemilih
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold uppercase text-slate-900">
                            {member.name || "-"}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                        aria-label="Tutup maklumat pemilih"
                    >
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {fields.map(([label, value]) => (
                        <div
                            key={label}
                            className={`rounded-lg border border-slate-100 px-3 py-2 ${label === "Alamat" || label === "Catatan" ? "sm:col-span-2" : ""}`}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                                {label}
                            </p>
                            <p className="mt-0.5 break-words text-xs font-medium text-slate-700">
                                {value || "-"}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function CulaModal({ member, codes, saving, onSave, onClose }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
            <section
                className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Siap cula"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                            Siap Cula
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold uppercase text-slate-900">
                            {member.name}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Tutup
                    </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    Pilih kod cula untuk dikemaskini.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {codes.map((code) => (
                        <button
                            key={code.code}
                            type="button"
                            onClick={() => onSave(code)}
                            disabled={saving}
                            className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${code.code === member.cula_code ? "border-blue-500 bg-blue-50 text-blue-700" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"}`}
                        >
                            {code.label}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default function AhliPasIndex({
    active_tab,
    filters,
    available_dms,
    available_localities,
    members,
    wrong_cula_members,
    available_cula_codes = [],
    statistics,
}) {
    const [form, setForm] = useState(filters);
    const [copiedNoAhli, setCopiedNoAhli] = useState("");
    const [detailMember, setDetailMember] = useState(null);
    const [localWrongCulaMembers, setLocalWrongCulaMembers] =
        useState(wrong_cula_members);
    const [culaPendingIds, setCulaPendingIds] = useState(new Set());
    const [completedCulaIds, setCompletedCulaIds] = useState(new Set());
    const [selectedMemberForCula, setSelectedMemberForCula] = useState(null);
    const [savingCula, setSavingCula] = useState(false);
    const [culaError, setCulaError] = useState("");
    const [localitySearch, setLocalitySearch] = useState("");

    useEffect(() => setForm(filters), [filters]);
    useEffect(
        () => setLocalWrongCulaMembers(wrong_cula_members),
        [wrong_cula_members],
    );

    const copyNoAhli = async (value) => {
        try {
            if (navigator.clipboard?.writeText)
                await navigator.clipboard.writeText(value);
            else {
                const input = document.createElement("textarea");
                input.value = value;
                input.setAttribute("readonly", "");
                input.style.position = "fixed";
                input.style.opacity = "0";
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand("copy");
                input.remove();
                if (!copied) throw new Error("copy-failed");
            }
            setCopiedNoAhli(value);
            setTimeout(
                () =>
                    setCopiedNoAhli((current) =>
                        current === value ? "" : current,
                    ),
                1500,
            );
        } catch {
            setCopiedNoAhli("");
        }
    };

    const load = (params, options = {}) =>
        router.get(route("ahli-pas.index"), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onSuccess: options.onSuccess,
        });
    const selectTab = (tab) =>
        load(
            tab === "salah-cula"
                ? { ...form, tab, salah_cula_page: 1 }
                : { ...form, tab, page: 1 },
        );
    const updateFilter = (key, value) => {
        const next = { ...form, [key]: value };
        if (key === "udm") next.locality = "";
        setForm(next);
        load({
            ...next,
            tab: active_tab,
            [active_tab === "salah-cula" ? "salah_cula_page" : "page"]: 1,
        });
    };
    const goToPage = (page) => {
        const resultSectionId =
            active_tab === "salah-cula"
                ? "salah-cula-results"
                : "ahli-pas-results";

        load(
            active_tab === "salah-cula"
                ? { ...form, tab: active_tab, salah_cula_page: page }
                : { ...form, tab: active_tab, page },
            {
                onSuccess: () => {
                    requestAnimationFrame(() => {
                        document
                            .getElementById(resultSectionId)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                },
            },
        );
    };
    const rows = members?.data ?? [];
    const wrongCulaRows = localWrongCulaMembers?.data ?? [];
    const wrongCulaCount = Number(wrong_cula_members?.total ?? 0);
    const localityRows = (statistics?.by_locality ?? []).filter((row) =>
        row.locality
            .toLowerCase()
            .includes(localitySearch.trim().toLowerCase()),
    );

    const openCula = (member) => {
        const identity = member.no_kp || member.old_ic;
        if (!identity) {
            setCulaError("No. KP tidak tersedia untuk membuka Telegram Bot.");
            return;
        }
        const telegramWindow = window.open("about:blank", "_blank");
        setCulaError("");
        setCulaPendingIds((current) => new Set([...current, member.id]));
        try {
            telegramWindow?.location.replace(
                `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(`/kemascula ${identity}`)}`,
            );
        } catch {
            telegramWindow?.close();
            setCulaError("Telegram Bot gagal dibuka.");
            setCulaPendingIds((current) => {
                const next = new Set(current);
                next.delete(member.id);
                return next;
            });
        }
    };

    const saveCula = async (code) => {
        if (!selectedMemberForCula) return;
        setSavingCula(true);
        setCulaError("");
        try {
            const response = await fetch(
                route("ahli-pas.cula.update", selectedMemberForCula.id),
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN":
                            document.querySelector('meta[name="csrf-token"]')
                                ?.content ?? "",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify({
                        cula_code: code.code,
                        cula_display_label: code.label,
                    }),
                },
            );
            if (!response.ok) throw new Error("Request failed");
            setLocalWrongCulaMembers((current) => ({
                ...current,
                data: (current?.data ?? []).map((member) =>
                    member.id === selectedMemberForCula.id
                        ? {
                              ...member,
                              cula_code: code.code,
                              cula_display_label: code.label,
                          }
                        : member,
                ),
            }));
            setCompletedCulaIds(
                (current) => new Set([...current, selectedMemberForCula.id]),
            );
            setDetailMember((current) =>
                current?.id === selectedMemberForCula.id ? null : current,
            );
            setCulaPendingIds((current) => {
                const next = new Set(current);
                next.delete(selectedMemberForCula.id);
                return next;
            });
            setSelectedMemberForCula(null);
        } catch {
            setCulaError("Kod culaan gagal dikemaskini. Sila cuba lagi.");
        } finally {
            setSavingCula(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Pemilih</p>
                    <h2 className="mt-0.5 heading-lg">Ahli PAS</h2>
                </div>
            }
        >
            <Head title="Ahli PAS" />
            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="rounded-xl border border-green-200 bg-white p-1 shadow-sm">
                    <div className="grid grid-cols-3 gap-1">
                        {[
                            {
                                key: "senarai",
                                label: "Senarai Ahli",
                                icon: "users",
                            },
                            {
                                key: "salah-cula",
                                label: "Salah Cula",
                                icon: "alert",
                                badge: wrongCulaCount,
                            },
                            {
                                key: "statistik",
                                label: "Statistik",
                                icon: "chart",
                            },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => selectTab(tab.key)}
                                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${active_tab === tab.key ? "bg-green-600 text-white shadow-sm" : "text-slate-500 hover:bg-green-50 hover:text-green-700"}`}
                            >
                                <Icon name={tab.icon} className="h-4 w-4" />
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span
                                        className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${active_tab === tab.key ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}
                                    >
                                        {tab.badge.toLocaleString("ms-MY")}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {active_tab === "senarai" && (
                    <>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                load({ ...form, tab: active_tab, page: 1 });
                            }}
                            className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20"
                        >
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_1fr_auto]">
                                <div>
                                    <label
                                        htmlFor="ahli-pas-udm"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        UDM
                                    </label>
                                    <select
                                        id="ahli-pas-udm"
                                        value={form.udm}
                                        onChange={(event) =>
                                            updateFilter(
                                                "udm",
                                                event.target.value,
                                            )
                                        }
                                        className="input-field mt-1.5"
                                    >
                                        <option value="">Semua UDM</option>
                                        {available_dms.map((udm) => (
                                            <option key={udm} value={udm}>
                                                {udm}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="ahli-pas-locality"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        Lokaliti
                                    </label>
                                    <select
                                        id="ahli-pas-locality"
                                        value={form.locality}
                                        onChange={(event) =>
                                            updateFilter(
                                                "locality",
                                                event.target.value,
                                            )
                                        }
                                        className="input-field mt-1.5"
                                    >
                                        <option value="">Semua Lokaliti</option>
                                        {available_localities.map(
                                            (locality) => (
                                                <option
                                                    key={locality}
                                                    value={locality}
                                                >
                                                    {locality}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="ahli-pas-search"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        Carian
                                    </label>
                                    <div className="relative mt-1.5">
                                        <Icon
                                            name="search"
                                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            id="ahli-pas-search"
                                            type="search"
                                            value={form.q}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    q: event.target.value,
                                                })
                                            }
                                            placeholder="Nama / No KP / No. Ahli"
                                            className="input-field w-full pl-9"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary self-end"
                                >
                                    Cari
                                </button>
                            </div>
                        </form>
                        <section id="ahli-pas-results" className="scroll-mt-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <div>
                                    <p className="label-section">
                                        Senarai Ahli PAS
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {Number(
                                            members?.total ?? 0,
                                        ).toLocaleString("ms-MY")}{" "}
                                        ahli dalam skop anda
                                    </p>
                                </div>
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                                    No. Ahli tersedia
                                </span>
                            </div>
                            {rows.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-sm font-bold text-slate-400">
                                        Tiada ahli PAS
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Cuba ubah tapisan atau carian.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {rows.map((member, index) => (
                                        <article
                                            key={member.id}
                                            className="rounded-xl border border-green-200 bg-white p-3 shadow-sm transition hover:border-green-400 hover:shadow-md"
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-600 text-[10px] font-black text-white">
                                                    {(members.from ?? 1) + index}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-bold uppercase leading-5 text-slate-800">
                                                        {member.name || "-"}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-green-700">
                                                        Ahli PAS
                                                    </p>
                                                </div>
                                            </div>
                                            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-green-100 pt-3 text-xs">
                                                <div>
                                                    <dt className="font-bold text-green-700">
                                                        No. KP
                                                    </dt>
                                                    <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                        {member.no_kp ||
                                                            member.old_ic ||
                                                            "-"}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-green-700">
                                                        No. Ahli
                                                    </dt>
                                                    <dd className="mt-1">
                                                        <NoAhliBadge
                                                            member={member}
                                                            copiedNoAhli={
                                                                copiedNoAhli
                                                            }
                                                            onCopy={copyNoAhli}
                                                        />
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-green-700">
                                                        UDM
                                                    </dt>
                                                    <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                        {member.dm || "-"}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-green-700">
                                                        Lokaliti
                                                    </dt>
                                                    <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                        {member.locality || "-"}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </article>
                                    ))}
                                </div>
                            )}
                            <Pagination members={members} onPage={goToPage} />
                        </section>
                    </>
                )}

                {active_tab === "salah-cula" && (
                    <>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                load({
                                    ...form,
                                    tab: active_tab,
                                    salah_cula_page: 1,
                                });
                            }}
                            className="rounded-xl border border-amber-400 bg-white p-4 shadow-sm shadow-amber-500/15"
                        >
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_1fr_auto]">
                                <div>
                                    <label
                                        htmlFor="salah-cula-udm"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        UDM
                                    </label>
                                    <select
                                        id="salah-cula-udm"
                                        value={form.udm}
                                        onChange={(event) =>
                                            updateFilter(
                                                "udm",
                                                event.target.value,
                                            )
                                        }
                                        className="input-field mt-1.5"
                                    >
                                        <option value="">Semua UDM</option>
                                        {available_dms.map((udm) => (
                                            <option key={udm} value={udm}>
                                                {udm}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="salah-cula-locality"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        Lokaliti
                                    </label>
                                    <select
                                        id="salah-cula-locality"
                                        value={form.locality}
                                        onChange={(event) =>
                                            updateFilter(
                                                "locality",
                                                event.target.value,
                                            )
                                        }
                                        className="input-field mt-1.5"
                                    >
                                        <option value="">Semua Lokaliti</option>
                                        {available_localities.map(
                                            (locality) => (
                                                <option
                                                    key={locality}
                                                    value={locality}
                                                >
                                                    {locality}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="salah-cula-search"
                                        className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                                    >
                                        Carian
                                    </label>
                                    <div className="relative mt-1.5">
                                        <Icon
                                            name="search"
                                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            id="salah-cula-search"
                                            type="search"
                                            value={form.q}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    q: event.target.value,
                                                })
                                            }
                                            placeholder="Nama / No KP / No. Ahli"
                                            className="input-field w-full pl-9"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary self-end"
                                >
                                    Cari
                                </button>
                            </div>
                        </form>
                        <section id="salah-cula-results" className="scroll-mt-16 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="label-section text-amber-700">
                                        Semakan Salah Cula
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-600">
                                        {Number(
                                            localWrongCulaMembers?.total ?? 0,
                                        ).toLocaleString("ms-MY")}{" "}
                                        ahli PAS berkod selain PAS atau belum
                                        cula.
                                    </p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                                    Perlu semakan
                                </span>
                            </div>
                            {culaError && (
                                <div className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                    {culaError}
                                </div>
                            )}
                            {wrongCulaRows.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-sm font-bold text-slate-400">
                                        Tiada ahli salah cula
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Semua ahli dalam skop mempunyai kod PAS
                                        yang sah.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {wrongCulaRows.map((member, index) => {
                                        const isCompleted = completedCulaIds.has(
                                            member.id,
                                        );

                                        return (
                                            <article
                                                key={member.id}
                                                className={`rounded-xl border p-3 shadow-sm transition ${isCompleted ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-white hover:border-amber-400 hover:shadow-md"}`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white ${isCompleted ? "bg-emerald-600" : "bg-amber-500"}`}
                                                    >
                                                        {(localWrongCulaMembers?.from ??
                                                            1) + index}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="break-words text-sm font-bold uppercase leading-5 text-slate-800">
                                                            {member.name || "-"}
                                                        </p>
                                                        <span
                                                            className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${isCompleted ? "bg-emerald-100 text-emerald-700" : culaStatus(member) === "Belum Cula" ? "bg-slate-200 text-slate-700" : "bg-rose-100 text-rose-700"}`}
                                                        >
                                                            {isCompleted
                                                                ? `Berjaya: ${culaStatus(member)}`
                                                                : culaStatus(member)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-amber-100 pt-3 text-xs">
                                                    <div>
                                                        <dt className="font-bold text-amber-700">
                                                            No. Ahli
                                                        </dt>
                                                        <dd className="mt-1">
                                                            <NoAhliBadge
                                                                member={member}
                                                                copiedNoAhli={
                                                                    copiedNoAhli
                                                                }
                                                                onCopy={copyNoAhli}
                                                            />
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="font-bold text-amber-700">
                                                            No. KP
                                                        </dt>
                                                        <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                            {member.no_kp ||
                                                                member.old_ic ||
                                                                "-"}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="font-bold text-amber-700">
                                                            UDM
                                                        </dt>
                                                        <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                            {member.dm || "-"}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="font-bold text-amber-700">
                                                            Lokaliti
                                                        </dt>
                                                        <dd className="mt-0.5 break-words font-semibold text-slate-800">
                                                            {member.locality ||
                                                                "-"}
                                                        </dd>
                                                    </div>
                                                </dl>
                                                <div className="mt-3 flex gap-1.5">
                                                    {isCompleted ? (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="flex-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                                        >
                                                            Berjaya
                                                        </button>
                                                    ) : culaPendingIds.has(
                                                          member.id,
                                                      ) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedMemberForCula(
                                                                    member,
                                                                )
                                                            }
                                                            className="flex-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500 active:scale-[0.98]"
                                                        >
                                                            Siap Cula
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openCula(member)
                                                            }
                                                            className="flex-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-green-500 active:scale-[0.98]"
                                                        >
                                                            Cula
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDetailMember(member)
                                                        }
                                                        disabled={isCompleted}
                                                        className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Icon
                                                            name="eye"
                                                            className="h-3.5 w-3.5"
                                                        />
                                                        Detail
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                            <Pagination
                                members={localWrongCulaMembers}
                                onPage={goToPage}
                            />
                        </section>
                    </>
                )}

                {active_tab === "statistik" && (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <SummaryCard
                                label="Jumlah Ahli PAS"
                                value={statistics?.total}
                                icon="users"
                            />
                            <SummaryCard
                                label="Jumlah UDM"
                                value={statistics?.by_udm?.length}
                                icon="chart"
                            />
                            <SummaryCard
                                label="Jumlah Lokaliti"
                                value={statistics?.by_locality?.length}
                                icon="chart"
                            />
                        </div>
                        <div className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-4 py-3">
                                    <p className="label-section">
                                        Ahli Mengikut UDM
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Jumlah ahli PAS dalam setiap UDM.
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                <th className="px-4 py-2 text-left font-bold text-slate-500">
                                                    UDM
                                                </th>
                                                <th className="px-4 py-2 text-right font-bold text-slate-500">
                                                    Ahli
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(statistics?.by_udm ?? []).map(
                                                (row) => (
                                                    <tr key={row.udm}>
                                                        <td className="px-4 py-2 font-semibold text-slate-700">
                                                            {row.udm}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-bold text-green-700">
                                                            {Number(
                                                                row.total,
                                                            ).toLocaleString(
                                                                "ms-MY",
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-4 py-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="label-section">
                                                Ahli Mengikut Lokaliti
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Pecahan ahli PAS mengikut UDM
                                                dan lokaliti.
                                            </p>
                                        </div>
                                        <div className="relative w-full sm:w-56">
                                            <Icon
                                                name="search"
                                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                type="search"
                                                value={localitySearch}
                                                onChange={(event) =>
                                                    setLocalitySearch(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Cari lokaliti"
                                                aria-label="Cari lokaliti"
                                                className="input-field w-full py-1.5 pl-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-[32rem] overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0">
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                <th className="px-4 py-2 text-left font-bold text-slate-500">
                                                    UDM
                                                </th>
                                                <th className="px-4 py-2 text-left font-bold text-slate-500">
                                                    Lokaliti
                                                </th>
                                                <th className="px-4 py-2 text-right font-bold text-slate-500">
                                                    Ahli
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {localityRows.map((row) => (
                                                <tr
                                                    key={`${row.udm}-${row.locality}`}
                                                >
                                                    <td className="px-4 py-2 font-semibold text-slate-700">
                                                        {row.udm}
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-600">
                                                        {row.locality}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-bold text-green-700">
                                                        {Number(
                                                            row.total,
                                                        ).toLocaleString(
                                                            "ms-MY",
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {localityRows.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan="3"
                                                        className="px-4 py-8 text-center text-slate-400"
                                                    >
                                                        Tiada lokaliti sepadan.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </div>
            {detailMember && (
                <DetailModal
                    member={detailMember}
                    onClose={() => setDetailMember(null)}
                />
            )}
            {selectedMemberForCula && (
                <CulaModal
                    member={selectedMemberForCula}
                    codes={available_cula_codes}
                    saving={savingCula}
                    onSave={saveCula}
                    onClose={() => setSelectedMemberForCula(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
