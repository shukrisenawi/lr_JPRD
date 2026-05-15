import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

const bot = 'SSDP_Kedah_Bot';
function cmd(v, p) { const n = v?.no_kp || v?.old_ic || ''; return n ? `/${p} ${n}` : ''; }

function UserIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function MapPinIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function ChevronRightIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

function XIcon({ className = 'h-4 w-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function SearchIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

function RequiredLabel({ htmlFor, value }) {
    return <div className="flex items-center gap-1"><InputLabel htmlFor={htmlFor} value={value} /><span className="text-xs font-bold text-rose-500">*</span></div>;
}

function IconBtn({ label, children, className = '', ...props }) {
    return <button type="button" title={label} aria-label={label}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${className}`} {...props}>{children}</button>;
}

function ProgramImageModal({ program, onClose }) {
    if (!program?.gambar_url) return null;
    return (
        <Modal show={Boolean(program?.gambar_url)} onClose={onClose} maxWidth="2xl">
            <div className="relative">
                <button onClick={onClose} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
                <img src={program.gambar_url} alt={program.tajuk} className="max-h-[70vh] w-full object-contain" />
            </div>
        </Modal>
    );
}

function ProgramShareModal({ program, users, shareForm, onClose, onSubmit }) {
    if (!program) return null;
    return (
        <Modal show={Boolean(program)} onClose={onClose} maxWidth="sm">
            <div className="p-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <p className="text-xs font-bold text-slate-800">Share Program</p>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </div>
                <form onSubmit={onSubmit} className="mt-2">
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                        {users.map((user) => {
                            const checked = shareForm.data.shared_user_ids.includes(user.id);
                            return (
                                <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition hover:bg-green-50">
                                    <input type="checkbox" checked={checked}
                                        onChange={(e) => shareForm.setData('shared_user_ids', e.target.checked ? [...shareForm.data.shared_user_ids, user.id] : shareForm.data.shared_user_ids.filter((id) => id !== user.id))}
                                        className="rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                    <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{user.name}</span></span>
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button onClick={onClose} type="button" className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Batal</button>
                        <button type="submit" disabled={shareForm.processing} className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-500 disabled:opacity-50">{shareForm.processing ? '...' : 'Share'}</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

function ProgramCard({ program, isActive, deleting, onDelete, onEdit, onPreviewImage, onSelect, onShare }) {
    const s = program.masa ? `${program.tarikh} • ${program.masa}` : program.tarikh;
    return (
        <div className={`rounded-md border bg-white p-2.5 shadow-sm transition hover:border-green-200 ${isActive ? 'border-green-200' : 'border-slate-200'}`}>
            <div role="button" tabIndex={0} onClick={() => onSelect(program.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(program.id); } }} className="w-full text-left outline-none">
                {program.gambar_url && (
                    <button onClick={(e) => { e.stopPropagation(); onPreviewImage(program); }} className="mb-2 block w-full overflow-hidden rounded-md">
                        <img src={program.gambar_url} alt={program.tajuk} className="h-16 w-full object-cover transition hover:scale-[1.02]" />
                    </button>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-700">▣ {s}</p>
                <h3 className="mt-1 text-xs font-bold leading-tight text-slate-800">{program.tajuk}</h3>
                <p className="mt-0.5 text-xs text-slate-600">{program.tempat}</p>
                {program.group_name && <p className="mt-2 inline-flex rounded-md border border-slate-200 bg-green-50 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-green-700">{program.group_name}</p>}
                <div className="mt-2 border-t border-slate-200 pt-1.5">
                    <p className="text-xs text-slate-500">{program.attendees_count} hadir</p>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                {program.can_share && <button onClick={() => onShare(program)} className="rounded-md border border-orange-300 bg-white px-2.5 py-1 text-xs font-bold text-orange-500 transition hover:bg-orange-50">Share</button>}
                {program.can_edit && <>
                    <button onClick={() => onEdit(program)} className="rounded-md border border-green-200 bg-white px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-50">Edit</button>
                    <button onClick={() => onDelete(program)} disabled={deleting} className="rounded-md border border-red-400 bg-white px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50">{deleting ? '...' : 'Padam'}</button>
                </>}
            </div>
        </div>
    );
}

function VoterDetailCard({ voter, onAdd, adding }) {
    if (!voter) return null;
    const fields = [
        ['Nama', voter.name], ['No. IC Baru', voter.no_kp || '-'], ['No. IC Lama', voter.old_ic || '-'],
        ['Umur', voter.age ?? '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm || '-'], ['Lokaliti', voter.locality || '-'], ['Jantina', voter.gender || '-'],
        ['Bangsa', voter.race || '-'], ['Status Culaan', voter.cula_display_label || voter.cula_code || '-'], ['Alamat', voter.address || '-'],
    ];
    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Pemilih Dipilih</p>
                    <h3 className="truncate text-xs font-bold uppercase leading-tight text-slate-800">{voter.name}</h3>
                </div>
                <button onClick={() => onAdd(voter)} disabled={adding} className="btn-emerald shrink-0 text-xs">{adding ? 'Menyimpan...' : 'Tambah ke Program'}</button>
            </div>
            <div className="grid gap-1.5 p-2 sm:grid-cols-2">
                {fields.map(([l, v]) => (
                    <div key={l} className="rounded-md border border-slate-100 bg-white px-2 py-1">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-700">{l}</p>
                        <p className="text-xs font-medium text-slate-800">{v || '-'}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AttendeeDetailModal({ attendee, onClose, onOpenTelegram, tgReady }) {
    if (!attendee) return null;
    const fields = [
        ['Nama', attendee.name], ['No. IC', attendee.no_kp || attendee.old_ic || '-'],
        ['Tel', attendee.phone_mobile || attendee.phone_home || '-'],
        ['UDM', attendee.dm || '-'], ['Lokaliti', attendee.locality || '-'],
        ['Jantina', attendee.gender || '-'], ['Bangsa', attendee.race || '-'],
        ['Status Culaan', attendee.cula_display_label || attendee.cula_code || '-'],
    ];
    return (
        <Modal show={Boolean(attendee)} onClose={onClose} maxWidth="sm">
            <div className="p-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{attendee.name}</p>
                            <p className="text-xs text-slate-500">{attendee.dm || '-'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {fields.map(([l, v]) => (
                        <div key={l} className="rounded border border-slate-100 bg-white px-2 py-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">{l}</p>
                            <p className="truncate text-xs font-medium text-slate-800">{v}</p>
                        </div>
                    ))}
                </div>
                {attendee.address && (
                    <div className="mt-2 rounded border border-slate-100 bg-white px-2 py-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">Alamat</p>
                        <p className="text-xs font-medium text-slate-800">{attendee.address}</p>
                    </div>
                )}
                <div className="mt-3 flex gap-2 border-t border-slate-200 pt-2">
                    <button onClick={() => onOpenTelegram(attendee, 'kemascula')} disabled={!tgReady} className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-500 disabled:opacity-50">Kemas Cula</button>
                    <button onClick={() => onOpenTelegram(attendee, 'kemastel')} disabled={!tgReady} className="flex-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-400 disabled:opacity-50">Kemaskini Tel</button>
                </div>
            </div>
        </Modal>
    );
}

function AttendeeProgramsModal({ attendee, onClose }) {
    if (!attendee) return null;
    const programs = attendee.joined_programs ?? [];
    return (
        <Modal show={Boolean(attendee)} onClose={onClose} maxWidth="sm">
            <div className="p-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{attendee.name}</p>
                        <p className="text-xs text-slate-500">{programs.length} program</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto">
                    {programs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">Tiada program</div>
                    ) : (
                        <div className="space-y-1.5">
                            {programs.map((p) => (
                                <div key={p.program_id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-2 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-800">{p.tajuk}</p>
                                        <p className="text-xs text-slate-500">{p.tarikh}</p>
                                    </div>
                                    {p.group_name && <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{p.group_name}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function committeeScopeLabel(badge) {
    if (!badge) return '';
    if (badge.level === 'jprd') return 'JPRD';
    if (badge.level === 'cawangan') {
        return badge.parent_scope_name ? `${badge.parent_scope_name} / ${badge.scope_name}` : badge.scope_name;
    }

    return badge.scope_name;
}

function ProgramGroupManager({ groups }) {
    const [editingId, setEditingId] = useState(null);
    const f = useForm({ name: '' });
    const submit = (e) => {
        e.preventDefault();
        if (editingId) { f.put(route('program.groups.update', editingId), { preserveScroll: true, onSuccess: () => { setEditingId(null); f.reset(); } }); return; }
        f.post(route('program.groups.store'), { preserveScroll: true, onSuccess: () => f.reset() });
    };
    const del = (g) => { if (window.confirm(`Padam group "${g.name}"?`)) router.delete(route('program.groups.destroy', g.id), { preserveScroll: true, onSuccess: () => { if (editingId === g.id) { setEditingId(null); f.reset(); } } }); };

    return (
        <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
            <form onSubmit={submit} className="card p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{editingId ? 'Edit Group' : 'Tambah Group'}</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-800">{editingId ? 'Kemaskini nama' : 'Daftar group baru'}</h3>
                <div className="mt-3">
                    <RequiredLabel htmlFor="gn" value="Nama Group" />
                    <TextInput id="gn" required value={f.data.name} onChange={(e) => f.setData('name', e.target.value)} className="mt-1 w-full text-xs" />
                    <InputError className="mt-1" message={f.errors.name} />
                </div>
                <div className="mt-3 flex justify-end">
                    {editingId && <button onClick={() => { setEditingId(null); f.reset(); f.clearErrors(); }} className="btn-ghost text-xs mr-2">Batal</button>}
                    <PrimaryButton disabled={f.processing} className="px-4 py-1.5 text-xs">{f.processing ? '...' : editingId ? 'Simpan' : 'Tambah'}</PrimaryButton>
                </div>
            </form>

            <section className="card p-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Senarai Group</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-800">{groups.length} group</h3>
                <div className="mt-3 space-y-2">
                    {groups.length === 0 ? <div className="card-dashed py-4 text-xs">Belum ada</div> : groups.map((g) => (
                        <div key={g.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <div><p className="text-xs font-bold text-slate-800">{g.name}</p><p className="text-xs text-slate-500">{g.programs_count} program</p></div>
                            <div className="flex gap-1.5">
                                <button onClick={() => { setEditingId(g.id); f.setData('name', g.name); f.clearErrors(); }} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700">Edit</button>
                                <button onClick={() => del(g)} className="rounded-md bg-gradient-to-r from-rose-600 to-pink-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:from-rose-500 hover:to-red-400">Padam</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </section>
    );
}

function SearchVoterPanel({ selectedProgram }) {
    const [q, setQ] = useState(''); const [suggestions, setSuggestions] = useState([]); const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState(null); const [err, setErr] = useState(''); const [adding, setAdding] = useState(false);
    const ac = useRef(null); const rid = useRef(0);

    useEffect(() => { ac.current?.abort(); rid.current += 1; setQ(''); setSuggestions([]); setSelected(null); setSearching(false); setErr(''); }, [selectedProgram?.id]);
    useEffect(() => () => ac.current?.abort(), []);

    const pick = (voter) => { ac.current?.abort(); rid.current += 1; setSearching(false); setSuggestions([]); setQ(voter.name ?? ''); setErr(''); setSelected({ ...voter, voter_id: voter.voter_id ?? voter.id }); };
    const clearSearch = () => { ac.current?.abort(); rid.current += 1; setQ(''); setSuggestions([]); setSelected(null); setSearching(false); setErr(''); };

    const handleChange = async (e) => {
        const nq = e.target.value; setQ(nq); setSelected(null); setErr(''); ac.current?.abort();
        if (!selectedProgram || nq.trim().length < 2) { setSuggestions([]); setSearching(false); return; }
        const reqId = ++rid.current; const c = new AbortController(); ac.current = c; setSearching(true);
        try {
            const res = await fetch(`${route('program.search', selectedProgram.id)}?q=${encodeURIComponent(nq)}`, { headers: { Accept: 'application/json' }, signal: c.signal });
            const p = await res.json(); if (!res.ok) throw new Error();
            if (rid.current === reqId) setSuggestions(p.suggestions ?? []);
        } catch { setSuggestions([]); setErr('Carian gagal.'); }
        finally { if (rid.current === reqId) setSearching(false); }
    };

    const add = async (voter) => {
        if (!selectedProgram) return; setAdding(true);
        router.post(route('program.attendees.store', selectedProgram.id), { ...voter, voter_id: voter.voter_id ?? voter.id }, {
            preserveScroll: true, onSuccess: () => { setQ(''); setSuggestions([]); setSelected(null); setErr(''); }, onError: () => setErr('Gagal rekod.'), onFinish: () => setAdding(false),
        });
    };

    if (!selectedProgram) return <div className="card-dashed"><p className="text-xs font-bold text-white">Pilih program</p></div>;

    return (
        <div className="space-y-2">
            <section className="card">
                <div className="px-3 py-2">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Carian Pemilih</p>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-800">{selectedProgram.tajuk}</h3>
                    <div className="relative mt-2">
                        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={q} onChange={handleChange} placeholder="Ali, 900101025555..." className="input-field py-1.5 pl-8 pr-8 focus:ring-2 text-xs" />
                        {q && (
                            <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-green-50 text-green-700 transition hover:bg-green-100">
                                <XIcon className="h-2.5 w-2.5" />
                            </button>
                        )}
                        {(searching || suggestions.length > 0) && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                                {searching ? <div className="px-2.5 py-1.5 text-xs font-medium text-slate-500">Mencari...</div> : suggestions.map((v) => (
                                    <button key={v.id} onClick={() => pick(v)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_minmax(6rem,0.9fr)_auto] items-center gap-2 border-b border-slate-200 px-2.5 py-2 text-left transition hover:bg-green-50 last:border-b-0">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-700"><UserIcon className="h-3.5 w-3.5" /></div>
                                        <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{v.name}</p><p className="text-xs font-medium text-slate-500">IC: {v.no_kp || '-'} <span className="mx-1 text-slate-300">|</span> HP: {v.phone_mobile || '-'}</p></div>
                                        <div className="min-w-0 text-left"><p className="truncate text-xs font-bold text-slate-800">{v.dm || '-'}</p><p className="truncate text-xs font-medium text-slate-500">{v.locality || '-'}</p></div>
                                        <ChevronRightIcon className="h-3 w-3 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {err && <p className="mt-1 text-xs font-bold text-rose-500">{err}</p>}
                </div>
            </section>
            <VoterDetailCard voter={selected} onAdd={add} adding={adding} />
        </div>
    );
}

export default function ProgramIndex({ programs, selectedProgram, shareableUsers, groups }) {
    const [tab, setTab] = useState(selectedProgram ? 'senarai-program' : 'tambah-program');
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [selAttendee, setSelAttendee] = useState(null);
    const [selAttendeeProgs, setSelAttendeeProgs] = useState(null);
    const [selImage, setSelImage] = useState(null);
    const [selShare, setSelShare] = useState(null);
    const [deletingAtt, setDeletingAtt] = useState(null);
    const [openingTg, setOpeningTg] = useState(false);
    const imgRef = useRef(null);
    const defaultTempat = 'Kompleks PAS Sg PAU';
    const f = useForm({ tajuk: '', tempat: defaultTempat, tarikh: '', masa: '', group_id: '', gambar: null, gambar_url: null });
    const sf = useForm({ shared_user_ids: [] });
    const [previewUrl, setPreviewUrl] = useState(null);
    const showProgramSavedAlert = (isEditingMode) => Swal.fire({
        icon: 'success',
        title: 'Berjaya',
        text: isEditingMode ? 'Program berjaya dikemaskini.' : 'Program berjaya disimpan.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#059669',
        background: '#ffffff',
        color: '#0f172a',
        iconColor: '#059669',
    });

    useEffect(() => {
        if (!(f.data.gambar instanceof File)) { setPreviewUrl(f.data.gambar_url || null); return; }
        const u = URL.createObjectURL(f.data.gambar); setPreviewUrl(u); return () => URL.revokeObjectURL(u);
    }, [f.data.gambar, f.data.gambar_url]);

    const isEditing = editingId !== null;
    const submitProgram = (e) => {
        e.preventDefault();
        const editingMode = isEditing;
        const reset = () => { setEditingId(null); f.reset('tajuk', 'tarikh', 'masa', 'group_id', 'gambar', 'gambar_url'); f.setData('tempat', defaultTempat); f.setData('gambar_url', null); if (imgRef.current) imgRef.current.value = ''; };
        if (editingMode) {
            f.transform((d) => ({ ...d, _method: 'put' }));
            f.post(route('program.update', editingId), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    reset();
                    showProgramSavedAlert(true);
                },
            });
            return;
        }
        f.post(route('program.store'), {
            preserveScroll: true,
            forceFormData: f.data.gambar instanceof File,
            onSuccess: () => {
                reset();
                showProgramSavedAlert(false);
            },
        });
    };

    const selectProg = (id) => { setTab('senarai-program'); router.get(route('program.index'), { program: id }, { preserveScroll: true, preserveState: true, replace: true }); };
    const back = () => { setSelAttendee(null); router.get(route('program.index'), {}, { preserveScroll: true, preserveState: true, replace: true }); };
    const startEdit = (p) => { setEditingId(p.id); f.setData({ tajuk: p.tajuk ?? '', tempat: p.tempat ?? defaultTempat, tarikh: p.tarikh ?? '', masa: p.masa ?? '', group_id: p.group_id ?? '', gambar: null, gambar_url: p.gambar_url ?? null }); if (imgRef.current) imgRef.current.value = ''; setTab('tambah-program'); };
    const cancelEdit = () => { setEditingId(null); f.reset('tajuk', 'tarikh', 'masa', 'group_id', 'gambar', 'gambar_url'); f.setData('tempat', defaultTempat); f.setData('gambar_url', null); f.clearErrors(); if (imgRef.current) imgRef.current.value = ''; };
    const delProgram = (p) => { if (!window.confirm(`Padam "${p.tajuk}"?`)) return; setDeletingId(p.id); router.delete(route('program.destroy', p.id), { preserveScroll: true, onSuccess: () => { if (editingId === p.id) cancelEdit(); }, onFinish: () => setDeletingId(null) }); };
    const delAttendee = (a) => { if (!selectedProgram || !window.confirm(`Padam "${a.name}"?`)) return; setDeletingAtt(a.id); router.delete(route('program.attendees.destroy', [selectedProgram.id, a.id]), { preserveScroll: true, onSuccess: () => setSelAttendee(null), onFinish: () => setDeletingAtt(null) }); };
    const openTg = async (v, prefix) => { const c = cmd(v, prefix); if (!c) return; const w = window.open('about:blank', '_blank'); setOpeningTg(true); try { w?.location.replace(`tg://resolve?domain=${bot}&text=${encodeURIComponent(c)}`); } catch { w?.close(); } finally { setOpeningTg(false); } };
    const openShare = (p) => { setSelShare(p); sf.setData('shared_user_ids', (p.shared_users ?? []).map((u) => u.id)); sf.clearErrors(); };
    const closeShare = () => { setSelShare(null); sf.setData('shared_user_ids', []); sf.clearErrors(); };
    const submitShare = (e) => {
        e.preventDefault(); if (!selShare) return;
        const names = shareableUsers.filter((u) => sf.data.shared_user_ids.includes(u.id)).map((u) => u.name);
                sf.post(route('program.share.store', selShare.id), { preserveScroll: true, preserveState: true, onSuccess: () => { setTab('senarai-program'); Swal.fire({ icon: 'success', title: 'Berjaya', text: names.length > 0 ? `Dikongsi kepada ${names.join(', ')}.` : 'Dikemaskini.', confirmButtonText: 'OK', confirmButtonColor: '#059669', background: '#ffffff', color: '#0f172a', iconColor: '#059669' }).then(() => closeShare()); } });
    };

    const tabs = [
        { key: 'tambah-program', label: 'Tambah Program' },
        { key: 'group-program', label: 'Group Program' },
        { key: 'senarai-program', label: 'Senarai Program' },
    ];

    return (
        <AuthenticatedLayout header={
            <div><p className="label-section">Program</p><h2 className="mt-0.5 heading-lg">Program</h2></div>
        }>
            <Head title="Program" />
            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="card p-2">
                    <div className="grid gap-2 sm:grid-cols-3">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${tab === t.key ? 'border-emerald-600 bg-gradient-to-r from-green-700 to-green-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60'}`}>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tab === t.key ? 'bg-white/90 text-emerald-700' : 'bg-emerald-50 text-emerald-700'}`}>{t.key === 'tambah-program' ? '+' : t.key === 'group-program' ? '♧' : '☷'}</span>
                                <span className={`text-xs font-bold ${tab === t.key ? 'text-white' : 'text-emerald-800'}`}>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {tab === 'tambah-program' && (
                    <section>
                        <form onSubmit={submitProgram} className="card p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{isEditing ? 'Edit Program' : 'Tambah Program'}</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-800">{isEditing ? 'Kemaskini maklumat' : 'Maklumat program baru'}</h3>
                            <div className="mt-3 grid gap-3">
                                <div><RequiredLabel htmlFor="tajuk" value="Tajuk" /><TextInput id="tajuk" required value={f.data.tajuk} onChange={(e) => f.setData('tajuk', e.target.value)} className="mt-1 w-full text-xs" /><InputError className="mt-1" message={f.errors.tajuk} /></div>
                                <div><RequiredLabel htmlFor="tempat" value="Tempat" /><TextInput id="tempat" required value={f.data.tempat} onChange={(e) => f.setData('tempat', e.target.value)} className="mt-1 w-full text-xs" /><InputError className="mt-1" message={f.errors.tempat} /></div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div><RequiredLabel htmlFor="tarikh" value="Tarikh" /><TextInput id="tarikh" type="date" required value={f.data.tarikh} onChange={(e) => f.setData('tarikh', e.target.value)} className="mt-1 w-full text-xs" /><InputError className="mt-1" message={f.errors.tarikh} /></div>
                                    <div><InputLabel htmlFor="masa" value="Masa" /><TextInput id="masa" type="time" value={f.data.masa} onChange={(e) => f.setData('masa', e.target.value)} className="mt-1 w-full text-xs" /><InputError className="mt-1" message={f.errors.masa} /></div>
                                </div>
                                <div><RequiredLabel htmlFor="group_id" value="Group" /><select id="group_id" required value={f.data.group_id} onChange={(e) => f.setData('group_id', e.target.value)} className="input-field mt-1 text-xs"><option value="">Pilih</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><InputError className="mt-1" message={f.errors.group_id} /></div>
                                <div>
                                    <InputLabel htmlFor="gambar" value="Gambar" />
                                    <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                            {previewUrl ? <img src={previewUrl} alt="preview" className="h-16 w-full rounded-lg object-cover sm:w-28" /> : <div className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs font-bold uppercase text-slate-500 sm:w-28">Tiada</div>}
                                            <div className="min-w-0 flex-1">
                                                <input id="gambar" ref={imgRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 file:mr-2 file:rounded-md file:border file:border-slate-200 file:bg-green-50 file:px-2 file:py-0.5 file:text-xs file:font-bold file:text-green-700 hover:file:bg-green-100"
                                                    onChange={(e) => f.setData('gambar', e.target.files?.[0] ?? null)} />
                                                <p className="mt-1 text-xs text-slate-500">PNG/JPG/WEBP sehingga 2MB</p>
                                                <InputError className="mt-1" message={f.errors.gambar} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-center">
                                {isEditing && <button onClick={cancelEdit} className="btn-ghost text-xs mr-2">Batal</button>}
                                <PrimaryButton disabled={f.processing} className="px-4 py-1.5 text-xs">{f.processing ? '...' : isEditing ? 'Simpan' : 'Simpan Program'}</PrimaryButton>
                            </div>
                        </form>
                    </section>
                )}

                {tab === 'group-program' && <ProgramGroupManager groups={groups} />}

{tab === 'senarai-program' && (selectedProgram ? (
                    <section className="space-y-3">
                        <div className="card px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                                <div><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{selectedProgram.tajuk}</p><h3 className="mt-0.5 text-sm font-bold text-slate-800">Kehadiran Program</h3></div>
                                <button onClick={back} className="btn-ghost text-xs">Back</button>
                            </div>
                        </div>
                        <SearchVoterPanel selectedProgram={selectedProgram} />
<section className="card p-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Kehadiran</p>
                            <h3 className="mt-0.5 text-sm font-bold text-slate-800">{selectedProgram.attendees.length} orang</h3>
                            <div className="mt-3">
                                {selectedProgram.attendees.length === 0 ? <div className="card-dashed py-4 text-xs">Tiada</div> : (
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {selectedProgram.attendees.map((a) => (
                                            <div key={a.id} className={`rounded-md border p-2.5 transition ${selAttendee?.id === a.id ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:border-green-200'}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-bold text-slate-800">{a.name}</p>
                                                        <p className="text-xs text-slate-500">{a.dm || '-'}</p>
                                                        <p className="text-xs text-slate-400">{a.phone_mobile || a.phone_home || '-'}</p>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <button onClick={() => setSelAttendee(a)} title="Detail" className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${selAttendee?.id === a.id ? 'border-green-300 bg-green-50 text-green-700' : 'border-green-200 bg-white text-green-700 hover:bg-green-50'}`}>
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                                                        </button>
                                                        <button onClick={() => setSelAttendeeProgs(a)} title="Program" className="inline-flex h-5 w-5 items-center justify-center rounded border border-amber-200 bg-white text-amber-600 transition hover:bg-amber-50">
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
                                                        </button>
                                                        <button onClick={() => delAttendee(a)} disabled={deletingAtt === a.id} title="Padam" className="inline-flex h-5 w-5 items-center justify-center rounded border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                {(a.group_badges?.length > 0 || a.committee_badges?.length > 0) && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {a.group_badges?.map((b) => <span key={`${a.id}-${b.name}`} className="rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] font-bold text-amber-700">{b.name}</span>)}
                                                        {a.committee_badges?.map((b, index) => <span key={`${a.id}-${b.label}-${index}`} className="rounded border border-sky-200 bg-sky-50 px-1 py-0.5 text-[10px] font-bold text-sky-700">{b.label}</span>)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </section>
                ) : (
                    <div className="card p-3">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Senarai Program</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {programs.length === 0 ? <div className="card-dashed py-4 text-xs sm:col-span-2 xl:col-span-3">Belum ada</div> : programs.map((p) => (
                                <ProgramCard key={p.id} program={p} isActive={selectedProgram?.id === p.id} deleting={deletingId === p.id}
                                    onDelete={delProgram} onEdit={startEdit} onPreviewImage={setSelImage} onShare={openShare} onSelect={selectProg} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <AttendeeDetailModal attendee={selAttendee} onClose={() => setSelAttendee(null)} onOpenTelegram={openTg} tgReady={!openingTg && Boolean(cmd(selAttendee, 'kemascula'))} />
            <AttendeeProgramsModal attendee={selAttendeeProgs} onClose={() => setSelAttendeeProgs(null)} />
            <ProgramImageModal program={selImage} onClose={() => setSelImage(null)} />
            <ProgramShareModal program={selShare} users={shareableUsers} shareForm={sf} onClose={closeShare} onSubmit={submitShare} />
        </AuthenticatedLayout>
    );
}
