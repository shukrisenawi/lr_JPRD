import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        userCog: <><path d="M20 21v-2a4 4 0 0 0-4-4h-1" /><circle cx="10" cy="7" r="4" /><path d="M8 15H6a4 4 0 0 0-4 4v2" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function PositionManager({ positions }) {
    const createForm = useForm({ name: '', sort_order: 0 });
    const [editingId, setEditingId] = useState(null);
    const [editingData, setEditingData] = useState({ name: '', sort_order: 0 });
    const [editingErrors, setEditingErrors] = useState({});

    const submitCreate = (event) => {
        event.preventDefault();
        createForm.post(route('jawatankuasa.positions.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset('name', 'sort_order'),
        });
    };

    const startEdit = (position) => {
        setEditingId(position.id);
        setEditingData({
            name: position.name,
            sort_order: position.sort_order ?? 0,
        });
        setEditingErrors({});
    };

    const submitEdit = (event, positionId) => {
        event.preventDefault();
        router.put(route('jawatankuasa.positions.update', positionId), editingData, {
            preserveScroll: true,
            onError: (errors) => setEditingErrors(errors),
            onSuccess: () => {
                setEditingId(null);
                setEditingErrors({});
            },
        });
    };

    const remove = (position) => {
        if (window.confirm(`Padam jenis jawatan ${position.name}?`)) {
            router.delete(route('jawatankuasa.positions.destroy', position.id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <section className="card p-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Jenis Jawatan</p>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-950">Tambah, edit dan padam jawatan</h3>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{positions.length} jawatan</span>
            </div>

            <form onSubmit={submitCreate} className="mt-3 grid gap-3 lg:grid-cols-[1fr_6rem_auto] lg:items-end">
                <div>
                    <InputLabel htmlFor="position-name" value="Nama Jawatan" />
                    <TextInput
                        id="position-name"
                        value={createForm.data.name}
                        onChange={(event) => createForm.setData('name', event.target.value)}
                        className="input-field mt-1 text-xs"
                        placeholder="Contoh: Pengerusi, Setiausaha"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Asingkan dengan koma untuk cipta beberapa jawatan.</p>
                    <InputError className="mt-1" message={createForm.errors.name} />
                </div>
                <div>
                    <InputLabel htmlFor="position-order" value="Susunan" />
                    <TextInput
                        id="position-order"
                        type="number"
                        min="0"
                        value={createForm.data.sort_order}
                        onChange={(event) => createForm.setData('sort_order', event.target.value)}
                        className="input-field mt-1 text-xs"
                    />
                    <InputError className="mt-1" message={createForm.errors.sort_order} />
                </div>
                <div className="flex items-end">
                    <PrimaryButton className="w-full justify-center gap-1.5 px-3 py-1.5 text-xs" disabled={createForm.processing}>
                        <Icon name="plus" className="h-3.5 w-3.5" />
                        {createForm.processing ? '...' : 'Tambah'}
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="table-header">
                            <tr>
                                <th className="table-head-cell">Jawatan</th>
                                <th className="table-head-cell w-20">Susunan</th>
                                <th className="table-head-cell w-32">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {positions.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-3 py-4 text-center text-slate-500">
                                        Belum ada jenis jawatan.
                                    </td>
                                </tr>
                            )}
                            {positions.map((position) => (
                                <tr key={position.id} className="table-row">
                                    {editingId === position.id ? (
                                        <>
                                            <td className="table-cell">
                                                <form onSubmit={(event) => submitEdit(event, position.id)} className="grid gap-2">
                                                    <div>
                                                        <InputLabel htmlFor={`position-edit-name-${position.id}`} value="Nama Jawatan" />
                                                        <TextInput
                                                            id={`position-edit-name-${position.id}`}
                                                            value={editingData.name}
                                                            onChange={(event) => setEditingData((current) => ({ ...current, name: event.target.value }))}
                                                            className="input-field mt-1 text-xs"
                                                        />
                                                        <InputError className="mt-1" message={editingErrors.name} />
                                                    </div>
                                                </form>
                                            </td>
                                            <td className="table-cell">
                                                <InputLabel htmlFor={`position-edit-order-${position.id}`} value="Susunan" />
                                                <TextInput
                                                    id={`position-edit-order-${position.id}`}
                                                    type="number"
                                                    min="0"
                                                    value={editingData.sort_order}
                                                    onChange={(event) => setEditingData((current) => ({ ...current, sort_order: event.target.value }))}
                                                    className="input-field mt-1 text-xs"
                                                />
                                                <InputError className="mt-1" message={editingErrors.sort_order} />
                                            </td>
                                            <td className="table-cell">
                                                <div className="flex gap-1.5">
                                                    <button type="submit" onClick={(e) => { e.preventDefault(); submitEdit(e, position.id); }} className="btn-primary px-2 py-1 text-xs">Simpan</button>
                                                    <button type="button" onClick={() => setEditingId(null)} className="btn-ghost text-xs">Batal</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="table-cell align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="user" className="h-4 w-4" /></span>
                                                    <p className="font-bold text-slate-950">{position.name}</p>
                                                </div>
                                            </td>
                                            <td className="table-cell align-top font-bold text-slate-950">{position.sort_order ?? 0}</td>
                                            <td className="table-cell align-top">
                                                <div className="flex gap-1.5">
                                                    <button type="button" onClick={() => startEdit(position)} className="btn-secondary px-2 py-1 text-xs">Edit</button>
                                                    <button type="button" onClick={() => remove(position)} className="btn-danger px-2 py-1 text-xs">Padam</button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function MembershipManager({ positions, memberships, scopes }) {
    const tabs = [
        { key: 'jprd', label: 'JPRD' },
        { key: 'udm', label: 'UDM' },
        { key: 'cawangan', label: 'Cawangan' },
    ];
    const [activeTab, setActiveTab] = useState('jprd');
    const suggestionsAbort = useRef(null);
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoter, setSelectedVoter] = useState(null);

    const form = useForm({
        pemilih_record_id: '',
        committee_position_id: positions[0]?.id ?? '',
        level: 'jprd',
        scope_key: scopes.jprd?.[0]?.key ?? 'jprd',
        voter_search: '',
    });

    useEffect(() => {
        form.setData((current) => ({
            ...current,
            level: activeTab,
            scope_key: scopes[activeTab]?.[0]?.key ?? '',
        }));
        setSelectedVoter(null);
        setSuggestions([]);
    }, [activeTab]);

    const currentScopes = scopes[activeTab] ?? [];

    const filteredMemberships = useMemo(() => {
        return memberships.filter((membership) => {
            if (membership.level !== activeTab) {
                return false;
            }

            if (activeTab === 'jprd') {
                return true;
            }

            return membership.scope_key === form.data.scope_key;
        });
    }, [activeTab, form.data.scope_key, memberships]);

    const handleSearchChange = async (event) => {
        const value = event.target.value;
        form.setData('voter_search', value);
        setSelectedVoter(null);
        suggestionsAbort.current?.abort();

        if (value.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        const controller = new AbortController();
        suggestionsAbort.current = controller;
        setSearching(true);

        try {
            const response = await fetch(`${route('jawatankuasa.search')}?q=${encodeURIComponent(value)}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
            }
        } finally {
            setSearching(false);
        }
    };

    const selectVoter = (voter) => {
        setSelectedVoter(voter);
        setSuggestions([]);
        form.setData((current) => ({
            ...current,
            pemilih_record_id: voter.id,
            voter_search: voter.name ?? '',
        }));
    };

    const submit = (event) => {
        event.preventDefault();
        form.post(route('jawatankuasa.memberships.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedVoter(null);
                setSuggestions([]);
                form.reset('pemilih_record_id', 'voter_search');
                form.setData((current) => ({
                    ...current,
                    committee_position_id: positions[0]?.id ?? '',
                    level: activeTab,
                    scope_key: scopes[activeTab]?.[0]?.key ?? '',
                }));
            },
        });
    };

    const removeMembership = (membership) => {
        if (window.confirm(`Buang ${membership.voter.name} daripada jawatankuasa ini?`)) {
            router.delete(route('jawatankuasa.memberships.destroy', membership.id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="label-section">Ahli Jawatankuasa</p>
                    <h3 className="mt-0.5 heading-md">Lantik pemilih ikut peringkat</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === tab.key ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="relative">
                        <InputLabel htmlFor="committee-voter-search" value="Cari Pemilih Aktif" />
                        <TextInput
                            id="committee-voter-search"
                            value={form.data.voter_search}
                            onChange={handleSearchChange}
                            className="input-field mt-1.5"
                            placeholder="Nama, IC atau telefon"
                        />
                        <InputError className="mt-1.5" message={form.errors.pemilih_record_id} />
                        {(searching || suggestions.length > 0) && (
                            <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                                {searching ? (
                                    <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div>
                                ) : (
                                    suggestions.map((voter) => (
                                        <button
                                            key={voter.id}
                                            type="button"
                                            onClick={() => selectVoter(voter)}
                                            className="flex w-full items-start justify-between gap-3 border-b border-slate-700/50 px-3 py-2.5 text-left transition hover:bg-violet-500/10 last:border-b-0"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white">{voter.name}</p>
                                                <p className="mt-0.5 text-xs text-slate-400">IC: {voter.no_kp || '-'} | HP: {voter.phone_mobile || '-'}</p>
                                            </div>
                                            <div className="shrink-0 text-right text-xs text-slate-500">
                                                <p>{voter.dm || '-'}</p>
                                                <p className="mt-0.5">{voter.locality || '-'}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <InputLabel htmlFor="committee-position" value="Jawatan" />
                        <select
                            id="committee-position"
                            value={form.data.committee_position_id}
                            onChange={(event) => form.setData('committee_position_id', event.target.value)}
                            className="input-field mt-1.5"
                        >
                            <option value="">Pilih jawatan</option>
                            {positions.map((position) => (
                                <option key={position.id} value={position.id}>{position.name}</option>
                            ))}
                        </select>
                        <InputError className="mt-1.5" message={form.errors.committee_position_id} />
                    </div>

                    <div>
                        <InputLabel htmlFor="committee-scope" value={activeTab === 'jprd' ? 'Peringkat' : 'Scope'} />
                        <select
                            id="committee-scope"
                            value={form.data.scope_key}
                            onChange={(event) => form.setData('scope_key', event.target.value)}
                            className="input-field mt-1.5"
                        >
                            {currentScopes.map((scope) => (
                                <option key={scope.key} value={scope.key}>
                                    {scope.parent_scope_name ? `${scope.parent_scope_name} / ${scope.name}` : scope.name}
                                </option>
                            ))}
                        </select>
                        <InputError className="mt-1.5" message={form.errors.scope_key} />
                    </div>
                </div>

                {selectedVoter && (
                    <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3">
                        <p className="text-sm font-bold text-white">{selectedVoter.name}</p>
                        <p className="mt-1 text-xs text-slate-300">
                            IC: {selectedVoter.no_kp || '-'} | UDM: {selectedVoter.dm || '-'} | Cawangan: {selectedVoter.locality || '-'}
                        </p>
                    </div>
                )}

                <div className="flex justify-end">
                    <PrimaryButton disabled={form.processing || !positions.length}>
                        {form.processing ? '...' : 'Tambah Ahli'}
                    </PrimaryButton>
                </div>
            </form>

            <div className="mt-3">
                {filteredMemberships.length === 0 ? (
                    <div className="card-dashed py-4 text-xs">Belum ada ahli untuk paparan ini.</div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMemberships.map((membership) => (
                            <div key={membership.id} className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-green-200">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-slate-950">{membership.voter.name}</p>
                                        <p className="text-xs font-bold text-green-700">{membership.position.name}</p>
                                        <p className="text-xs text-slate-500">{membership.voter.no_kp || membership.voter.old_ic || '-'}</p>
                                        <p className="text-xs text-slate-400">{membership.voter.phone_mobile || membership.voter.phone_home || '-'}</p>
                                        <p className="text-xs text-slate-500">{membership.voter.dm || '-'}</p>
                                        <p className="text-xs text-slate-400">{membership.voter.locality || '-'}</p>
                                        {membership.parent_scope_name && <p className="mt-1 text-[10px] font-bold text-sky-600">{membership.parent_scope_name} / {membership.scope_name}</p>}
                                    </div>
                                    <button type="button" onClick={() => removeMembership(membership)} className="shrink-0 rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">Buang</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function CommitteeIndex({ positions, memberships, scopes }) {
    const [activeSection, setActiveSection] = useState('senarai-jawatankuasa');
    const sectionTabs = [
        { key: 'senarai-jawatankuasa', label: 'Senarai Jawatankuasa', desc: 'Lantik dan semak ahli ikut peringkat.', icon: 'users' },
        { key: 'jawatan', label: 'Jawatan', desc: 'Urus jenis jawatan dan susunan.', icon: 'userCog' },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Jawatankuasa</p>
                    <h2 className="mt-0.5 heading-lg">Urus jawatan dan pelantikan</h2>
                    <p className="text-muted mt-0.5">Semak jawatankuasa JPRD, UDM dan Cawangan dalam satu modul.</p>
                </div>
            }
        >
            <Head title="Jawatankuasa" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <div className="card p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {sectionTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveSection(tab.key)}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${activeSection === tab.key ? 'border-emerald-600 bg-gradient-to-r from-green-700 to-green-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60'}`}
                            >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activeSection === tab.key ? 'bg-white/90 text-emerald-700' : 'bg-emerald-50 text-emerald-700'}`}><Icon name={tab.icon} className="h-5 w-5" /></span>
                                <span><span className={`block text-xs font-bold uppercase tracking-[0.08em] ${activeSection === tab.key ? 'text-white' : 'text-emerald-800'}`}>{tab.label}</span><span className={`mt-0.5 block text-xs font-medium ${activeSection === tab.key ? 'text-emerald-50' : 'text-slate-500'}`}>{tab.desc}</span></span>
                            </button>
                        ))}
                    </div>
                </div>

                {activeSection === 'senarai-jawatankuasa' && (
                    <MembershipManager positions={positions} memberships={memberships} scopes={scopes} />
                )}

                {activeSection === 'jawatan' && (
                    <PositionManager positions={positions} />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
