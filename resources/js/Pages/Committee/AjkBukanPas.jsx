import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const PAS_CULA_CODES = ['2', '3B', '3D', '3K', '3M', '3P', '3U'];
const TELEGRAM_BOT = 'SSDP_Kedah_Bot';

const levelMeta = {
    jprd: { label: 'JPRD', className: 'bg-green-100 text-green-700' },
    udm: { label: 'UDM', className: 'bg-sky-100 text-sky-700' },
    cawangan: { label: 'Cawangan', className: 'bg-purple-100 text-purple-700' },
};

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
        phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />,
        alert: <><path d="M10.3 3.4 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    };

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {paths[name]}
        </svg>
    );
}

function culaStatus(member) {
    if (!member.cula_code || member.cula_code === '?' || member.cula_code === 'TIADA') {
        return 'Belum Cula';
    }

    return member.cula_display_label || member.cula_code;
}

function formatDate(value) {
    const [year, month, day] = String(value || '').slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : '-';
}

function scopeLabel(assignment) {
    if (assignment.parent_scope_name) {
        return `${assignment.parent_scope_name} / ${assignment.scope_name || '-'}`;
    }

    return assignment.scope_name || '-';
}

function DetailModal({ member, canViewMemberNumber, onClose }) {
    if (!member) return null;

    const address = member.alamat_kediaman || member.alamat_kp || member.address || '-';
    const fields = [
        ...(canViewMemberNumber ? [['No. Ahli', member.no_ahli || '-']] : []),
        ['No. KP', member.no_kp || member.old_ic || '-'],
        ['UDM', member.dm || '-'],
        ['Lokaliti', member.locality || '-'],
        ['Tel. Bimbit', member.phone_mobile || '-'],
        ['Tel. Rumah', member.phone_home || '-'],
        ['Jantina', member.gender || '-'],
        ['Bangsa', member.race || '-'],
        ['Tarikh Lahir', formatDate(member.date_of_birth)],
        ['Status Cula', culaStatus(member)],
        ['Alamat', address],
        ['Catatan', member.catatan || member.cula_remark || '-'],
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/50 p-3 pt-10 backdrop-blur-sm sm:items-center sm:pt-3" onClick={onClose}>
            <section className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Detail AJK" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full border border-amber-200 object-cover" />
                        ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                <Icon name="user" className="h-5 w-5" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Detail AJK Bukan PAS</p>
                            <h3 className="mt-0.5 truncate text-sm font-bold uppercase text-slate-900">{member.name || '-'}</h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label="Tutup detail">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-78px)] overflow-y-auto p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {fields.map(([label, value]) => (
                            <div key={label} className={`rounded-lg border border-slate-100 px-3 py-2 ${label === 'Alamat' || label === 'Catatan' ? 'sm:col-span-2' : ''}`}>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">{label}</p>
                                <p className="mt-0.5 break-words text-xs font-medium text-slate-700">{value || '-'}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-100">
                        <div className="border-b border-amber-100 bg-amber-50/60 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">Jawatan Jawatankuasa</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {member.memberships?.map((assignment) => {
                                const level = levelMeta[assignment.level] || { label: assignment.level, className: 'bg-slate-100 text-slate-700' };
                                return (
                                    <div key={assignment.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">{assignment.position_name}</p>
                                            <p className="text-[10px] text-slate-500">{assignment.group_name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:justify-end">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${level.className}`}>{level.label}</span>
                                            <span className="text-[10px] font-semibold text-slate-500">{scopeLabel(assignment)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function CulaModal({ member, codes, saving, onSave, onClose }) {
    if (!member) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm" onClick={onClose}>
            <section className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="Siap cula" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">Siap Cula</p>
                        <h3 className="mt-0.5 text-sm font-bold uppercase text-slate-900">{member.name}</h3>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50">Tutup</button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Pilih kod cula selepas semakan Telegram selesai.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {codes.map((code) => (
                        <button key={code.code} type="button" onClick={() => onSave(code)} disabled={saving} className={`rounded-md border px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${code.code === member.cula_code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100'}`}>
                            {code.label}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}

function MemberCard({ member, index, pendingCula, onDetail, onTelegram }) {
    const identity = member.no_kp || member.old_ic;
    const status = culaStatus(member);
    const isUnculled = status === 'Belum Cula';

    return (
        <article className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:shadow-md">
            <div className="flex items-start gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500 text-[10px] font-black text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-amber-100 object-cover" />
                        ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Icon name="user" className="h-4 w-4" /></span>
                        )}
                        <div className="min-w-0">
                            <p className="break-words text-sm font-bold uppercase leading-5 text-slate-800">{member.name || '-'}</p>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{member.no_kp || member.old_ic || 'No. KP tiada'}</p>
                        </div>
                    </div>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${isUnculled ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700'}`}>{status}</span>
                </div>
            </div>

            <div className="mt-3 space-y-1 border-t border-amber-100 pt-3">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-bold uppercase tracking-[0.08em] text-amber-700">Lokasi</span>
                    <span className="truncate text-right font-semibold text-slate-600">{member.dm || '-'}{member.locality ? ` / ${member.locality}` : ''}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-bold uppercase tracking-[0.08em] text-amber-700">Jawatan</span>
                    <span className="text-right font-semibold text-slate-600">{member.memberships?.length || 0} tugasan</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                    {member.memberships?.map((assignment) => {
                        const level = levelMeta[assignment.level] || { label: assignment.level, className: 'bg-slate-100 text-slate-700' };
                        return <span key={assignment.id} className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${level.className}`}>{level.label} - {assignment.position_name}</span>;
                    })}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-amber-100 pt-3">
                <button type="button" onClick={() => onDetail(member)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    Detail
                </button>
                {pendingCula ? (
                    <button type="button" onClick={() => onDetail(member, true)} className="btn-secondary flex-1 px-2.5 py-1.5">Siap Cula</button>
                ) : (
                    <button type="button" onClick={() => onTelegram(member, 'kemascula')} disabled={!identity} className="btn-primary flex-1 px-2.5 py-1.5">Cula</button>
                )}
                <button type="button" onClick={() => onTelegram(member, 'kemastel')} disabled={!identity} className="btn-emerald flex-1 gap-1 px-2.5 py-1.5">
                    <Icon name="phone" className="h-3.5 w-3.5" />
                    Tukar Tel
                </button>
            </div>
        </article>
    );
}

export default function AjkBukanPas({ members = [], total_assignments = 0, level_counts = {}, available_cula_codes = [], can_view_member_number = false }) {
    const [localMembers, setLocalMembers] = useState(members);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailMember, setDetailMember] = useState(null);
    const [selectedMemberForCula, setSelectedMemberForCula] = useState(null);
    const [culaPendingIds, setCulaPendingIds] = useState(new Set());
    const [savingCula, setSavingCula] = useState(false);
    const [actionError, setActionError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => setLocalMembers(members), [members]);

    const filteredMembers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return localMembers;

        return localMembers.filter((member) => {
            const values = [member.name, member.no_kp, member.old_ic, member.phone_mobile, member.phone_home, member.dm, member.locality, member.cula_code, member.cula_display_label];
            if (values.some((value) => String(value || '').toLowerCase().includes(query))) return true;
            return member.memberships?.some((assignment) => [assignment.level, assignment.scope_name, assignment.parent_scope_name, assignment.group_name, assignment.position_name].some((value) => String(value || '').toLowerCase().includes(query)));
        });
    }, [localMembers, searchQuery]);

    const openTelegram = (member, prefix) => {
        const identity = member.no_kp || member.old_ic;
        if (!identity) {
            setActionError('No. KP tidak tersedia untuk membuka Telegram Bot.');
            return;
        }

        setActionError('');
        setNotice('');
        const telegramWindow = window.open('about:blank', '_blank');

        try {
            telegramWindow?.location.replace(`tg://resolve?domain=${TELEGRAM_BOT}&text=${encodeURIComponent(`/${prefix} ${identity}`)}`);
            if (prefix === 'kemascula') {
                setCulaPendingIds((current) => new Set([...current, member.id]));
            }
        } catch {
            telegramWindow?.close();
            setActionError('Telegram Bot gagal dibuka.');
        }
    };

    const openMemberAction = (member, cula = false) => {
        if (cula) {
            setSelectedMemberForCula(member);
            return;
        }
        setDetailMember(member);
    };

    const saveCula = async (code) => {
        if (!selectedMemberForCula) return;

        setSavingCula(true);
        setActionError('');
        try {
            const response = await fetch(route('jawatankuasa.ajk-bukan-pas.cula', selectedMemberForCula.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ cula_code: code.code, cula_display_label: code.label }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || 'Kod culaan gagal dikemaskini.');

            setLocalMembers((current) => PAS_CULA_CODES.includes(code.code)
                ? current.filter((member) => member.id !== selectedMemberForCula.id)
                : current.map((member) => member.id === selectedMemberForCula.id ? { ...member, cula_code: code.code, cula_display_label: code.label } : member));
            setCulaPendingIds((current) => {
                const next = new Set(current);
                next.delete(selectedMemberForCula.id);
                return next;
            });
            setSelectedMemberForCula(null);
            setNotice(`${selectedMemberForCula.name} berjaya dikemaskini.`);
        } catch (error) {
            setActionError(error.message || 'Kod culaan gagal dikemaskini.');
        } finally {
            setSavingCula(false);
        }
    };

    const levelCount = Object.values(level_counts).filter((count) => Number(count) > 0).length;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Operasi</p>
                    <h2 className="mt-0.5 heading-lg">AJK Bukan PAS</h2>
                    <p className="mt-1 text-xs text-slate-500">Ahli jawatankuasa di semua peringkat dengan kod cula selain 2, 3B, 3D, 3K, 3M, 3P dan 3U.</p>
                </div>
            }
        >
            <Head title="AJK Bukan PAS" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon name="users" className="h-5 w-5" /></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">AJK Unik</p><p className="text-sm font-bold text-slate-800">{localMembers.length} orang</p></div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon name="alert" className="h-5 w-5" /></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Tugasan</p><p className="text-sm font-bold text-slate-800">{total_assignments} jawatan</p></div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon name="search" className="h-5 w-5" /></span>
                            <div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Peringkat</p><p className="text-sm font-bold text-slate-800">{levelCount} peringkat</p></div>
                        </div>
                    </div>
                </div>

                <section className="overflow-hidden rounded-xl border border-amber-300 bg-white shadow-sm">
                    <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="label-section text-amber-700">Senarai Ahli Jawatankuasa</p>
                                <p className="mt-0.5 text-xs text-slate-500">Rekod disusun mengikut nama. Klik Detail untuk melihat semua jawatan dan lokasi.</p>
                            </div>
                            <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">{filteredMembers.length} dipaparkan</span>
                        </div>
                        <div className="relative mt-3">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Cari nama, No. KP, UDM, lokaliti atau jawatan..." className="input-field pl-9" />
                        </div>
                    </div>

                    {actionError && <div className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{actionError}</div>}
                    {notice && <div className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</div>}

                    {filteredMembers.length === 0 ? (
                        <div className="py-14 text-center">
                            <p className="text-sm font-bold text-slate-400">{searchQuery.trim() ? 'Tiada AJK sepadan dengan carian.' : 'Tiada AJK Bukan PAS.'}</p>
                            <p className="mt-1 text-xs text-slate-400">Semua ahli jawatankuasa dalam skop anda mungkin menggunakan kod cula PAS yang sah.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredMembers.map((member, index) => (
                                <MemberCard key={member.id} member={member} index={index} pendingCula={culaPendingIds.has(member.id)} onDetail={openMemberAction} onTelegram={openTelegram} />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {detailMember && <DetailModal member={detailMember} canViewMemberNumber={can_view_member_number === true} onClose={() => setDetailMember(null)} />}
            {selectedMemberForCula && <CulaModal member={selectedMemberForCula} codes={available_cula_codes} saving={savingCula} onSave={saveCula} onClose={() => !savingCula && setSelectedMemberForCula(null)} />}
        </AuthenticatedLayout>
    );
}
