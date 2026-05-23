import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        userCog: <><path d="M20 21v-2a4 4 0 0 0-4-4h-1" /><circle cx="10" cy="7" r="4" /><path d="M8 15H6a4 4 0 0 0-4 4v2" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        mapPin: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></>,
        idCard: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h3v3H7z" /><path d="M14 7h3" /><path d="M14 11h3" /><path d="M7 14h10" /></>,
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
        <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
            <div className="rounded-t-[11px] border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                            <Icon name="userCog" className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-green-700">Jenis Jawatan</p>
                            <h3 className="text-sm font-bold text-slate-800">Tambah, edit dan padam jawatan</h3>
                        </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{positions.length} jawatan</span>
                </div>
            </div>

            <div className="p-3">
                <form onSubmit={submitCreate} className="grid gap-3 lg:grid-cols-[1fr_6rem_auto] lg:items-end">
                    <div>
                        <InputLabel htmlFor="position-name" value="Nama Jawatan" />
                        <TextInput
                            id="position-name"
                            value={createForm.data.name}
                            onChange={(event) => createForm.setData('name', event.target.value)}
                            className="input-field mt-1 text-xs"
                            placeholder="Contoh: Pengerusi, Setiausaha"
                        />
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
                        <PrimaryButton className="w-full justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold" disabled={createForm.processing}>
                            <Icon name="plus" className="h-4 w-4" />
                            {createForm.processing ? '...' : 'Tambah'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <div className="border-t border-green-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-green-100 text-xs">
                        <thead className="bg-green-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-green-700">Jawatan</th>
                                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-green-700">Susunan</th>
                                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-green-700">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-green-50 bg-white">
                            {positions.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-3 py-4 text-center text-xs text-slate-400">
                                        Belum ada jenis jawatan.
                                    </td>
                                </tr>
                            )}
                            {positions.map((position) => (
                                <tr key={position.id} className="transition hover:bg-green-50/50">
                                    {editingId === position.id ? (
                                        <>
                                            <td className="px-3 py-2">
                                                <form onSubmit={(event) => submitEdit(event, position.id)} className="grid gap-2">
                                                    <div>
                                                        <TextInput
                                                            id={`position-edit-name-${position.id}`}
                                                            value={editingData.name}
                                                            onChange={(event) => setEditingData((current) => ({ ...current, name: event.target.value }))}
                                                            className="input-field text-xs"
                                                        />
                                                        <InputError className="mt-1" message={editingErrors.name} />
                                                    </div>
                                                </form>
                                            </td>
                                            <td className="px-3 py-2">
                                                <TextInput
                                                    id={`position-edit-order-${position.id}`}
                                                    type="number"
                                                    min="0"
                                                    value={editingData.sort_order}
                                                    onChange={(event) => setEditingData((current) => ({ ...current, sort_order: event.target.value }))}
                                                    className="input-field text-xs"
                                                />
                                                <InputError className="mt-1" message={editingErrors.sort_order} />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button type="submit" onClick={(e) => { e.preventDefault(); submitEdit(e, position.id); }} className="rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-500">Simpan</button>
                                                    <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Batal</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"><Icon name="user" className="h-4 w-4" /></span>
                                                    <p className="font-bold text-slate-800">{position.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-green-50 text-xs font-bold text-green-700">{position.sort_order ?? 0}</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button type="button" onClick={() => startEdit(position)} className="rounded-md border border-green-200 bg-white px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-50">Edit</button>
                                                    <button type="button" onClick={() => remove(position)} className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50">Padam</button>
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

function escapeXml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function MembershipManager({ positions, memberships, scopes, auth }) {
    const tabs = [
        { key: 'jprd', label: 'JPRD', desc: 'Peringkat kawasan', icon: 'users' },
        { key: 'udm', label: 'UDM', desc: 'Unit daerah mengundi', icon: 'mapPin' },
        { key: 'cawangan', label: 'Cawangan', desc: 'Peringkat cawangan', icon: 'userCog' },
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
        notes: '',
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
                form.reset('pemilih_record_id', 'voter_search', 'notes');
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

    const exportToExcel = () => {
        const tabLabel = tabs.find((t) => t.key === activeTab)?.label ?? activeTab.toUpperCase();
        const scopeLabel = form.data.scope_key === 'jprd' ? 'JPRD' : currentScopes.find((s) => s.key === form.data.scope_key)?.parent_scope_name
            ? `${currentScopes.find((s) => s.key === form.data.scope_key)?.parent_scope_name} / ${currentScopes.find((s) => s.key === form.data.scope_key)?.name}`
            : (currentScopes.find((s) => s.key === form.data.scope_key)?.name ?? form.data.scope_key);

        const cols = ['Bil', 'Jawatan', 'Nama', 'No. IC', 'Telefon', 'UDM', 'Cawangan'];
        const align = ['center', 'center', 'left', 'center', 'center', 'center', 'center'];
        const widths = [35, 320, 520, 360, 280, 200, 280];

        const dataRows = filteredMemberships.map((m, i) => [
            { value: i + 1, type: 'Number', align: 'center' },
            { value: m.position?.name ?? '-', type: 'String', align: 'center' },
            { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
            { value: m.voter?.no_kp || m.voter?.old_ic || '-', type: 'String', align: 'center' },
            { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
            { value: m.voter?.dm || '-', type: 'String', align: 'center' },
            { value: m.voter?.locality || '-', type: 'String', align: 'center' },
        ]);

        const colXml = widths.map((w) => `<Column ss:AutoFitWidth="1" ss:Width="${w}"/>`).join('');
        const titleXml = `
            <Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleMain"><Data ss:Type="String">Ahli Jawatankuasa ${tabLabel}</Data></Cell></Row>
            <Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleSub"><Data ss:Type="String">${scopeLabel}</Data></Cell></Row>
        `;
        const headerXml = `<Row>${cols.map((h, i) => `<Cell ss:StyleID="${align[i] === 'center' ? 'headerCenter' : 'header'}"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`;
        const bodyXml = dataRows.map((cells) => `<Row>${cells.map((c) => `<Cell ss:StyleID="${c.align === 'center' ? 'cellCenter' : 'cell'}"><Data ss:Type="${c.type}">${escapeXml(c.value)}</Data></Cell>`).join('')}</Row>`).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style>
<Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
<Style ss:ID="titleSub"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
<Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
<Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
<Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style>
</Styles>
<Worksheet ss:Name="Jawatankuasa"><Table>${colXml}${titleXml}${headerXml}${bodyXml}</Table></Worksheet>
</Workbook>`;
        const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jawatankuasa_${activeTab}_${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
            <div className="rounded-t-[11px] border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                            <Icon name="users" className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-green-700">Ahli Jawatankuasa</p>
                            <h3 className="text-sm font-bold text-slate-800">Lantik pemilih ikut peringkat</h3>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-left transition ${activeTab === tab.key ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700'}`}
                                >
                                    <Icon name={tab.icon} className="h-3.5 w-3.5" />
                                    <span><span className={`block text-xs font-bold ${activeTab === tab.key ? 'text-white' : 'text-slate-900'}`}>{tab.label}</span><span className={`mt-0.5 block text-xs ${activeTab === tab.key ? 'text-green-50' : 'text-slate-500'}`}>{tab.desc}</span></span>
                                </button>
                            ))}
                        </div>
                        {filteredMemberships.length > 0 && (
                            <button type="button" onClick={exportToExcel}
                                className="hidden shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700 sm:inline-flex">
                                <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-black text-white">X</span>
                                Export Excel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-3">
                <form onSubmit={submit} className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-3">
                        <div className="relative">
                            <InputLabel htmlFor="committee-voter-search" value="Cari Pemilih Aktif" />
                            <div className="relative mt-1">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <TextInput
                                    id="committee-voter-search"
                                    value={form.data.voter_search}
                                    onChange={handleSearchChange}
                                    className="input-field pl-9 text-xs"
                                    placeholder="Nama, IC atau telefon"
                                />
                            </div>
                            <InputError className="mt-1" message={form.errors.pemilih_record_id} />
                            {(searching || suggestions.length > 0) && (
                                <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-green-200 bg-white shadow-lg">
                                    {searching ? (
                                        <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div>
                                    ) : (
                                        suggestions.map((voter) => (
                                            <button
                                                key={voter.id}
                                                type="button"
                                                onClick={() => selectVoter(voter)}
                                                className="flex w-full items-start justify-between gap-3 border-b border-green-100 px-3 py-2 text-left transition hover:bg-green-50 last:border-b-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800">{voter.name}</p>
                                                    <p className="text-xs text-slate-400">IC: {voter.no_kp || '-'} | HP: {voter.phone_mobile || '-'}</p>
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
                                className="input-field mt-1 text-xs"
                            >
                                <option value="">Pilih jawatan</option>
                                {positions.map((position) => (
                                    <option key={position.id} value={position.id}>{position.name}</option>
                                ))}
                            </select>
                            <InputError className="mt-1" message={form.errors.committee_position_id} />
                        </div>

                        <div>
                            <InputLabel htmlFor="committee-scope" value={activeTab === 'jprd' ? 'Peringkat' : 'Scope'} />
                            <select
                                id="committee-scope"
                                value={form.data.scope_key}
                                onChange={(event) => form.setData('scope_key', event.target.value)}
                                className="input-field mt-1 text-xs"
                            >
                                {currentScopes.map((scope) => (
                                    <option key={scope.key} value={scope.key}>
                                        {scope.parent_scope_name ? `${scope.parent_scope_name} / ${scope.name}` : scope.name}
                                    </option>
                                ))}
                            </select>
                            <InputError className="mt-1" message={form.errors.scope_key} />
                        </div>
                    </div>

                    {selectedVoter && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <Icon name="user" className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-green-800">{selectedVoter.name}</p>
                                    <p className="text-xs text-green-600">
                                        IC: {selectedVoter.no_kp || '-'} | UDM: {selectedVoter.dm || '-'} | Cawangan: {selectedVoter.locality || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <InputLabel htmlFor="committee-notes" value="Catatan / Remark (Optional)" />
                        <TextInput
                            id="committee-notes"
                            value={form.data.notes}
                            onChange={(event) => form.setData('notes', event.target.value)}
                            className="input-field mt-1 text-xs"
                            placeholder="Contoh: dilantik pada mesyuarat agung"
                        />
                        <InputError className="mt-1" message={form.errors.notes} />
                    </div>

                    <div className="flex justify-end">
                        <PrimaryButton disabled={form.processing || !positions.length} className="rounded-lg px-4 py-2 text-xs font-bold">
                            {form.processing ? '...' : 'Tambah Ahli'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <div className="border-t border-green-100 p-3">
                {filteredMemberships.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-4 text-center text-xs text-slate-400">Belum ada ahli untuk paparan ini.</div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMemberships.map((membership) => {
                            const canRemove = auth.user?.is_master_admin || membership.created_by === auth.user?.id;
                            return (
                                <div key={membership.id} className="group rounded-lg border border-green-100 bg-white p-2.5 shadow-sm transition hover:border-green-300 hover:shadow-md">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-bold text-slate-800">{membership.voter.name}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <p className="text-xs font-semibold text-green-700">{membership.position.name}</p>
                                                {membership.order && <span className="text-[10px] text-slate-400">#{membership.order}</span>}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Icon name="idCard" className="h-3 w-3" />
                                                    {membership.voter.no_kp || membership.voter.old_ic || '-'}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Icon name="phone" className="h-3 w-3" />
                                                    {membership.voter.phone_mobile || membership.voter.phone_home || '-'}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Icon name="mapPin" className="h-3 w-3" />
                                                    {membership.voter.dm || '-'}
                                                </p>
                                            </div>
                                            {membership.parent_scope_name && (
                                                <span className="mt-1.5 inline-block rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{membership.parent_scope_name} / {membership.scope_name}</span>
                                            )}
                                            {membership.notes && (
                                                <p className="mt-1.5 text-[10px] font-medium text-amber-700">{membership.notes}</p>
                                            )}
                                            {membership.creator_name && (
                                                <p className="mt-1 text-[10px] text-slate-400">Oleh: <span className="font-bold text-slate-600">{membership.creator_name}</span></p>
                                            )}
                                        </div>
                                        {canRemove && (
                                            <button type="button" onClick={() => removeMembership(membership)} className="shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 opacity-0 transition hover:bg-rose-50 group-hover:opacity-100">Buang</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function CommitteeIndex({ positions, memberships, scopes }) {
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];
    const canSenarai = allowedModules.includes('jawatankuasa.senarai');
    const canJawatan = allowedModules.includes('jawatankuasa.jawatan');

    const sectionTabs = [
        ...(canSenarai ? [{ key: 'senarai-jawatankuasa', label: 'Senarai Jawatankuasa', desc: 'Lantik dan semak ahli ikut peringkat.', icon: 'users' }] : []),
        ...(canJawatan ? [{ key: 'jawatan', label: 'Jawatan', desc: 'Urus jenis jawatan dan susunan.', icon: 'userCog' }] : []),
    ];

    const [activeSection, setActiveSection] = useState(() => {
        if (canJawatan && !canSenarai) return 'jawatan';
        return 'senarai-jawatankuasa';
    });

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
                {sectionTabs.length > 1 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {sectionTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveSection(tab.key)}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${activeSection === tab.key ? 'border-green-300 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md' : 'border-green-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50'}`}
                            >
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activeSection === tab.key ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}><Icon name={tab.icon} className="h-5 w-5" /></span>
                                <span><span className={`block text-xs font-bold uppercase tracking-wider ${activeSection === tab.key ? 'text-white' : 'text-green-700'}`}>{tab.label}</span><span className={`mt-0.5 block text-xs ${activeSection === tab.key ? 'text-green-100' : 'text-slate-500'}`}>{tab.desc}</span></span>
                            </button>
                        ))}
                    </div>
                )}

                {activeSection === 'senarai-jawatankuasa' && (
                    <MembershipManager positions={positions} memberships={memberships} scopes={scopes} auth={auth} />
                )}

                {activeSection === 'jawatan' && (
                    <PositionManager positions={positions} />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
