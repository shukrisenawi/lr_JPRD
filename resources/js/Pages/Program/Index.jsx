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

function RequiredLabel({ htmlFor, value }) {
    return <div className="flex items-center gap-1"><InputLabel htmlFor={htmlFor} value={value} /><span className="text-xs font-bold text-rose-400">*</span></div>;
}

function IconBtn({ label, children, className = '', ...props }) {
    return <button type="button" title={label} aria-label={label}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition ${className}`} {...props}>{children}</button>;
}

function ProgramImageModal({ program, onClose }) {
    if (!program?.gambar_url) return null;
    return (
        <Modal show={Boolean(program?.gambar_url)} onClose={onClose} maxWidth="4xl">
            <div className="p-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3">
                    <h3 className="heading-md">{program.tajuk}</h3>
                    <button onClick={onClose} className="btn-ghost px-2.5 py-1.5 text-[10px]">Tutup</button>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl bg-slate-800">
                    <img src={program.gambar_url} alt={program.tajuk} className="max-h-[75vh] w-full object-contain" />
                </div>
            </div>
        </Modal>
    );
}

function ProgramShareModal({ program, users, shareForm, onClose, onSubmit }) {
    if (!program) return null;
    return (
        <Modal show={Boolean(program)} onClose={onClose} maxWidth="lg">
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                    <div><p className="label-section">Share Program</p><h3 className="mt-0.5 heading-md">{program.tajuk}</h3></div>
                    <button onClick={onClose} className="btn-ghost px-2.5 py-1.5 text-[10px]">Tutup</button>
                </div>
                <form onSubmit={onSubmit} className="mt-4 space-y-3">
                    <div>
                        <InputLabel value="Pilih Pengguna Admin" />
                        <div className="mt-2 max-h-60 space-y-1.5 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/60 p-2.5">
                            {users.map((user) => {
                                const checked = shareForm.data.shared_user_ids.includes(user.id);
                                return (
                                    <label key={user.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-slate-800 px-2.5 py-2 ring-1 ring-slate-700 transition hover:bg-violet-500/10">
                                        <input type="checkbox" checked={checked}
                                            onChange={(e) => shareForm.setData('shared_user_ids', e.target.checked ? [...shareForm.data.shared_user_ids, user.id] : shareForm.data.shared_user_ids.filter((id) => id !== user.id))}
                                            className="mt-0.5 rounded border-slate-600 bg-slate-700 text-violet-600 shadow-sm focus:ring-violet-500" />
                                        <span className="min-w-0"><span className="block text-xs font-bold text-white">{user.name}</span><span className="block text-[10px] text-slate-400">{user.email}</span></span>
                                    </label>
                                );
                            })}
                        </div>
                        <InputError className="mt-2" message={shareForm.errors.shared_user_ids} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="btn-ghost">Batal</button>
                        <PrimaryButton disabled={shareForm.processing}>{shareForm.processing ? 'Menyimpan...' : 'Share'}</PrimaryButton>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

function ProgramCard({ program, isActive, deleting, onDelete, onEdit, onPreviewImage, onSelect, onShare }) {
    const s = program.masa ? `${program.tarikh} • ${program.masa}` : program.tarikh;
    return (
        <div className={`rounded-lg border px-3 py-3 transition ${isActive ? 'tab-btn-active' : 'border-slate-700 bg-slate-800/50 hover:border-violet-500/30 hover:bg-violet-500/5'}`}>
            <div role="button" tabIndex={0} onClick={() => onSelect(program.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(program.id); } }} className="w-full text-left outline-none">
                {program.gambar_url && (
                    <button onClick={(e) => { e.stopPropagation(); onPreviewImage(program); }} className="mb-2 block w-full overflow-hidden rounded-lg">
                        <img src={program.gambar_url} alt={program.tajuk} className="h-24 w-full object-cover transition hover:scale-[1.02]" />
                    </button>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-400">{s}</p>
                <h3 className="mt-0.5 text-sm font-bold text-white">{program.tajuk}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{program.tempat}</p>
                {program.group_name && <p className="badge-amber mt-1.5 inline-block">{program.group_name}</p>}
                <p className="mt-1.5 text-[10px] text-slate-500">{program.attendees_count} hadir</p>
            </div>
            <div className="mt-2 flex flex-wrap justify-end gap-1.5 border-t border-slate-700/60 pt-2">
                {program.can_share && <button onClick={() => onShare(program)} className="btn-amber px-2 py-1 text-[10px]">Share</button>}
                {program.can_edit && <>
                    <button onClick={() => onEdit(program)} className="btn-ghost px-2 py-1 text-[10px]">Edit</button>
                    <button onClick={() => onDelete(program)} disabled={deleting} className="btn-danger px-2 py-1 text-[10px]">{deleting ? '...' : 'Padam'}</button>
                </>}
            </div>
        </div>
    );
}

function VoterDetailCard({ voter, onAdd, adding }) {
    if (!voter) return null;
    const fields = [
        ['Nama', voter.name], ['No. IC Baru', voter.no_kp || '-'], ['No. IC Lama', voter.old_ic || '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm || '-'], ['Lokaliti', voter.locality || '-'], ['Jantina', voter.gender || '-'],
        ['Bangsa', voter.race || '-'], ['Status Culaan', voter.cula_display_label || voter.cula_code || '-'], ['Alamat', voter.address || '-'],
    ];
    return (
        <section className="card-accent">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 px-4 py-3">
                <div><p className="label-section">Pemilih Dipilih</p><h3 className="mt-0.5 heading-lg">{voter.name}</h3></div>
                <button onClick={() => onAdd(voter)} disabled={adding} className="btn-emerald-lg">{adding ? 'Menyimpan...' : 'Tambah ke Program'}</button>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
                {fields.map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-slate-800/60 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{l}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-200">{v}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AttendeeDetailModal({ attendee, onClose, onOpenTelegram, tgReady }) {
    if (!attendee) return null;
    const fields = [
        ['Nama', attendee.name], ['No. IC Baru', attendee.no_kp || '-'], ['No. IC Lama', attendee.old_ic || '-'],
        ['Tel. Bimbit', attendee.phone_mobile || '-'], ['Tel. Rumah', attendee.phone_home || '-'],
        ['UDM', attendee.dm || '-'], ['Lokaliti', attendee.locality || '-'], ['Jantina', attendee.gender || '-'],
        ['Bangsa', attendee.race || '-'], ['Status Culaan', attendee.cula_display_label || attendee.cula_code || '-'],
        ['Alamat', attendee.address || '-'], ['Direkod', attendee.attended_at || '-'],
    ];
    return (
        <Modal show={Boolean(attendee)} onClose={onClose} maxWidth="2xl">
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                    <div><p className="label-section">Detail Kehadiran</p><h3 className="mt-0.5 heading-md">{attendee.name}</h3></div>
                    <button onClick={onClose} className="btn-ghost px-2.5 py-1.5 text-[10px]">Tutup</button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {fields.map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-slate-800/60 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{l}</p>
                            <p className="mt-0.5 text-xs font-medium text-slate-200">{v}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-700/60 pt-3">
                    <button onClick={() => onOpenTelegram(attendee, 'kemascula')} disabled={!tgReady} className="btn-primary">Kemas Cula</button>
                    <button onClick={() => onOpenTelegram(attendee, 'kemastel')} disabled={!tgReady} className="btn-emerald">Kemaskini Tel</button>
                </div>
            </div>
        </Modal>
    );
}

function AttendeeProgramsModal({ attendee, onClose }) {
    if (!attendee) return null;
    const programs = attendee.joined_programs ?? [];
    return (
        <Modal show={Boolean(attendee)} onClose={onClose} maxWidth="2xl">
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                    <div><p className="label-section">Program Disertai</p><h3 className="mt-0.5 heading-md">{attendee.name}</h3></div>
                    <button onClick={onClose} className="btn-ghost px-2.5 py-1.5 text-[10px]">Tutup</button>
                </div>
                <div className="mt-3">
                    {programs.length === 0 ? <div className="card-dashed py-6 text-xs">Tiada</div> : (
                        <div className="card overflow-hidden">
                            <ul className="divide-y divide-slate-700/50">
                                {programs.map((p) => (
                                    <li key={p.program_id} className="px-3 py-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-white">{p.tajuk}</p>
                                                <p className="mt-0.5 text-[10px] text-slate-400">{p.masa ? `${p.tarikh} • ${p.masa}` : p.tarikh || '-'}</p>
                                            </div>
                                            {p.group_name && <span className="badge-amber shrink-0">{p.group_name}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
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
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <form onSubmit={submit} className="card p-5">
                <p className="label-section">{editingId ? 'Edit Group' : 'Tambah Group'}</p>
                <h3 className="mt-0.5 heading-md">{editingId ? 'Kemaskini nama' : 'Daftar group baru'}</h3>
                <div className="mt-4">
                    <RequiredLabel htmlFor="gn" value="Nama Group" />
                    <TextInput id="gn" required value={f.data.name} onChange={(e) => f.setData('name', e.target.value)} className="input-field mt-1.5" />
                    <InputError className="mt-2" message={f.errors.name} />
                </div>
                <div className="mt-4 flex justify-end">
                    {editingId && <button onClick={() => { setEditingId(null); f.reset(); f.clearErrors(); }} className="btn-ghost mr-2">Batal</button>}
                    <PrimaryButton disabled={f.processing}>{f.processing ? '...' : editingId ? 'Simpan' : 'Tambah'}</PrimaryButton>
                </div>
            </form>

            <section className="card p-5">
                <p className="label-section">Senarai Group</p>
                <h3 className="mt-0.5 heading-md">{groups.length} group</h3>
                <div className="mt-4 space-y-2">
                    {groups.length === 0 ? <div className="card-dashed py-6 text-xs">Belum ada</div> : groups.map((g) => (
                        <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5">
                            <div><p className="text-xs font-bold text-white">{g.name}</p><p className="text-[10px] text-slate-400">{g.programs_count} program</p></div>
                            <div className="flex gap-1.5">
                                <button onClick={() => { setEditingId(g.id); f.setData('name', g.name); f.clearErrors(); }} className="btn-ghost px-2 py-1 text-[10px]">Edit</button>
                                <button onClick={() => del(g)} className="btn-danger px-2 py-1 text-[10px]">Padam</button>
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

    if (!selectedProgram) return <div className="card-dashed"><p className="text-sm font-bold text-white">Pilih program</p></div>;

    return (
        <div className="space-y-3">
            <section className="card">
                <div className="px-4 py-3">
                    <p className="label-section">Carian Pemilih</p>
                    <h3 className="mt-0.5 heading-md">{selectedProgram.tajuk}</h3>
                    <div className="relative mt-2">
                        <input type="search" value={q} onChange={handleChange} placeholder="Ali, 900101025555..." className="input-field" />
                        {(searching || suggestions.length > 0) && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                                {searching ? <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div> : suggestions.map((v) => (
                                    <button key={v.id} onClick={() => pick(v)} className="flex w-full items-start justify-between gap-3 border-b border-slate-700/50 px-3 py-2.5 text-left transition hover:bg-violet-500/10 last:border-b-0">
                                        <div className="min-w-0"><p className="text-xs font-bold text-white">{v.name}</p><p className="mt-0.5 text-[10px] text-slate-400">IC: {v.no_kp || '-'}</p></div>
                                        <div className="shrink-0 text-right text-[10px] text-slate-500"><p>{v.dm}</p><p>{v.locality}</p></div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {err && <p className="mt-1.5 text-xs font-bold text-rose-400">{err}</p>}
                </div>
            </section>
            <VoterDetailCard voter={selected} onAdd={add} adding={adding} />
        </div>
    );
}

export default function ProgramIndex({ programs, selectedProgram, shareableUsers, groups }) {
    const [tab, setTab] = useState('tambah-program');
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

    useEffect(() => {
        if (!(f.data.gambar instanceof File)) { setPreviewUrl(f.data.gambar_url || null); return; }
        const u = URL.createObjectURL(f.data.gambar); setPreviewUrl(u); return () => URL.revokeObjectURL(u);
    }, [f.data.gambar, f.data.gambar_url]);

    const isEditing = editingId !== null;
    const submitProgram = (e) => {
        e.preventDefault();
        const reset = () => { setEditingId(null); f.reset('tajuk', 'tarikh', 'masa', 'group_id', 'gambar', 'gambar_url'); f.setData('tempat', defaultTempat); f.setData('gambar_url', null); if (imgRef.current) imgRef.current.value = ''; };
        if (isEditing) { f.transform((d) => ({ ...d, _method: 'put' })); f.post(route('program.update', editingId), { preserveScroll: true, forceFormData: true, onSuccess: reset }); return; }
        f.post(route('program.store'), { preserveScroll: true, forceFormData: f.data.gambar instanceof File, onSuccess: reset });
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
                sf.post(route('program.share.store', selShare.id), { preserveScroll: true, preserveState: true, onSuccess: () => { setTab('senarai-program'); Swal.fire({ icon: 'success', title: 'Berjaya', text: names.length > 0 ? `Dikongsi kepada ${names.join(', ')}.` : 'Dikemaskini.', confirmButtonText: 'OK', confirmButtonColor: '#8b5cf6', background: '#1e293b', color: '#e2e8f0', iconColor: '#34d399' }).then(() => closeShare()); } });
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
            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="card p-1.5">
                    <div className="grid gap-1.5 sm:grid-cols-3">
                        {tabs.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`rounded-lg border px-3 py-2.5 text-left transition ${tab === t.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
                                <p className="label-section">{t.label}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {tab === 'tambah-program' && (
                    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                        <form onSubmit={submitProgram} className="card p-5">
                            <p className="label-section">{isEditing ? 'Edit Program' : 'Tambah Program'}</p>
                            <h3 className="mt-0.5 heading-md">{isEditing ? 'Kemaskini maklumat' : 'Maklumat program baru'}</h3>
                            <div className="mt-4 grid gap-4">
                                <div><RequiredLabel htmlFor="tajuk" value="Tajuk" /><TextInput id="tajuk" required value={f.data.tajuk} onChange={(e) => f.setData('tajuk', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={f.errors.tajuk} /></div>
                                <div><RequiredLabel htmlFor="tempat" value="Tempat" /><TextInput id="tempat" required value={f.data.tempat} onChange={(e) => f.setData('tempat', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={f.errors.tempat} /></div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div><RequiredLabel htmlFor="tarikh" value="Tarikh" /><TextInput id="tarikh" type="date" required value={f.data.tarikh} onChange={(e) => f.setData('tarikh', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={f.errors.tarikh} /></div>
                                    <div><InputLabel htmlFor="masa" value="Masa" /><TextInput id="masa" type="time" value={f.data.masa} onChange={(e) => f.setData('masa', e.target.value)} className="input-field mt-1.5" /><InputError className="mt-1.5" message={f.errors.masa} /></div>
                                </div>
                                <div><RequiredLabel htmlFor="group_id" value="Group" /><select id="group_id" required value={f.data.group_id} onChange={(e) => f.setData('group_id', e.target.value)} className="input-field mt-1.5"><option value="">Pilih</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><InputError className="mt-1.5" message={f.errors.group_id} /></div>
                                <div>
                                    <InputLabel htmlFor="gambar" value="Gambar" />
                                    <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                            {previewUrl ? <img src={previewUrl} alt="preview" className="h-24 w-full rounded-lg object-cover sm:w-36" /> : <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-800 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:w-36">Tiada</div>}
                                            <div className="min-w-0 flex-1">
                                                <input id="gambar" ref={imgRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    className="block w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-violet-500"
                                                    onChange={(e) => f.setData('gambar', e.target.files?.[0] ?? null)} />
                                                <p className="mt-1 text-[10px] text-slate-500">PNG/JPG/WEBP sehingga 2MB</p>
                                                <InputError className="mt-1.5" message={f.errors.gambar} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                {isEditing && <button onClick={cancelEdit} className="btn-ghost mr-2">Batal</button>}
                                <PrimaryButton disabled={f.processing}>{f.processing ? '...' : isEditing ? 'Simpan' : 'Simpan Program'}</PrimaryButton>
                            </div>
                        </form>
                        <div className="card p-5">
                            <p className="label-section">Ringkasan</p>
                            <h3 className="mt-0.5 heading-md">{programs.length} program</h3>
                        </div>
                    </section>
                )}

                {tab === 'group-program' && <ProgramGroupManager groups={groups} />}

                {tab === 'senarai-program' && (selectedProgram ? (
                    <section className="space-y-4">
                        <div className="card px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div><p className="label-section">{selectedProgram.tajuk}</p><h3 className="mt-0.5 heading-md">Kehadiran Program</h3></div>
                                <button onClick={back} className="btn-ghost">Back</button>
                            </div>
                        </div>
                        <SearchVoterPanel selectedProgram={selectedProgram} />
                        <section className="card p-5">
                            <p className="label-section">Kehadiran</p>
                            <h3 className="mt-0.5 heading-md">{selectedProgram.tajuk}</h3>
                            <div className="mt-4">
                                {selectedProgram.attendees.length === 0 ? <div className="card-dashed py-6 text-xs">Tiada</div> : (
                                    <div className="card overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-700/60 text-xs">
                                                <thead className="bg-slate-700/60"><tr>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300">Nama</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300">UDM</th>
                                                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300">Telefon</th>
                                                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300">Tindakan</th>
                                                </tr></thead>
                                                <tbody className="divide-y divide-slate-700/40 bg-slate-800/30 text-slate-300">
                                                    {selectedProgram.attendees.map((a) => (
                                                        <tr key={a.id} className={selAttendee?.id === a.id ? 'bg-violet-500/15' : 'hover:bg-slate-700/20'}>
                                                            <td className="px-3 py-2.5 font-semibold">
                                                                <div>{a.name}</div>
                                                                {a.group_badges?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{a.group_badges.map((b) => <span key={`${a.id}-${b.name}`} className="badge-amber text-[9px]">{b.name}{b.count > 1 ? ` - ${b.count}` : ''}</span>)}</div>}
                                                            </td>
                                                            <td className="px-3 py-2.5">{a.dm || '-'}</td>
                                                            <td className="px-3 py-2.5">{a.phone_mobile || a.phone_home || '-'}</td>
                                                            <td className="px-3 py-2.5"><div className="flex justify-end gap-1">
                                                                <IconBtn label="Detail" onClick={() => setSelAttendee(a)} className={selAttendee?.id === a.id ? 'border-violet-500/50 bg-violet-500/20 text-violet-300' : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-violet-500/50 hover:text-violet-300'}>
                                                                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                                                                </IconBtn>
                                                                <IconBtn label="Program" onClick={() => setSelAttendeeProgs(a)} className="border-amber-600/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                                                                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
                                                                </IconBtn>
                                                                <IconBtn label="Padam" onClick={() => delAttendee(a)} disabled={deletingAtt === a.id} className="border-rose-600/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50">
                                                                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                                                                </IconBtn>
                                                            </div></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </section>
                ) : (
                    <div className="card p-5">
                        <p className="label-section">Senarai Program</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {programs.length === 0 ? <div className="card-dashed py-6 text-xs sm:col-span-2 xl:col-span-3">Belum ada</div> : programs.map((p) => (
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
