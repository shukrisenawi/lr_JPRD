import AvatarLightbox from '@/Components/AvatarLightbox';
import CropModal from '@/Components/CropModal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
        layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
        chevronDown: <><path d="m6 9 6 6 6-6" /></>,
        eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
        link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

const levelMeta = {
    jprd: { label: 'JPRD', bg: 'bg-green-100', text: 'text-green-700' },
    udm: { label: 'UDM', bg: 'bg-sky-100', text: 'text-sky-700' },
    cawangan: { label: 'Cawangan', bg: 'bg-purple-100', text: 'text-purple-700' },
};

const levelOptions = [
    { key: 'jprd', label: 'JPRD' },
    { key: 'udm', label: 'UDM' },
    { key: 'cawangan', label: 'Cawangan' },
];

function LevelBadge({ level, size = 'sm' }) {
    const meta = levelMeta[level] || { label: level, bg: 'bg-slate-100', text: 'text-slate-700' };
    const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
    return <span className={'inline-block rounded-md font-bold ' + meta.bg + ' ' + meta.text + ' ' + sizing}>{meta.label}</span>;
}

// ─── GroupManager ─────────────────────────────────────────────────────────

function GroupManager({ groups, positions: allPositions }) {
    const createForm = useForm({ name: '', levels: [], description: '' });
    const [editingId, setEditingId] = useState(null);
    const editForm = useForm({ name: '', levels: [], description: '' });
    const [expandedId, setExpandedId] = useState(null);
    const [addModal, setAddModal] = useState(null); // { groupId, level } or null
    const [selectedPositionIds, setSelectedPositionIds] = useState([]);
    const expandedRef = useRef(null);
    const [animExpandId, setAnimExpandId] = useState(null);
    const [positionSearch, setPositionSearch] = useState('');
    const [modalPositionSearch, setModalPositionSearch] = useState('');

    useEffect(() => {
        if (expandedId === null) setPositionSearch('');
        const handleClickOutside = (event) => {
            if (expandedRef.current && !expandedRef.current.contains(event.target)) {
                if (addModal) return;
                setExpandedId(null);
                setAddModal(null);
                setSelectedPositionIds([]);
            }
        };
        if (expandedId !== null) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [expandedId, addModal]);

    const submitCreate = (e) => {
        e.preventDefault();
        if (createForm.data.levels.length === 0) {
            createForm.setError('levels', 'Sila pilih sekurang-kurangnya satu peringkat.');
            return;
        }
        createForm.post(route('jawatankuasa.groups.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset('name', 'levels', 'description'),
        });
    };

    const startEdit = (group) => {
        setEditingId(group.id);
        editForm.setData({
            name: group.name,
            levels: [...(group.levels || [])],
            description: group.description || '',
        });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        if (editForm.data.levels.length === 0) {
            editForm.setError('levels', 'Sila pilih sekurang-kurangnya satu peringkat.');
            return;
        }
        editForm.put(route('jawatankuasa.groups.update', editingId), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const remove = (group) => {
        if (window.confirm('Padam kumpulan ' + group.name + '?')) {
            router.delete(route('jawatankuasa.groups.destroy', group.id), {
                preserveScroll: true,
            });
        }
    };

    const toggleLevel = (form, key) => {
        const levels = form.data.levels;
        if (levels.includes(key)) {
            form.setData('levels', levels.filter((l) => l !== key));
        } else {
            form.setData('levels', [...levels, key]);
        }
    };

    const CheckboxLevel = ({ form, level }) => (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-green-300 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
            <input
                type="checkbox"
                checked={form.data.levels.includes(level.key)}
                onChange={() => toggleLevel(form, level.key)}
                className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs font-bold text-slate-700">{level.label}</span>
        </label>
    );

    const toggleExpand = (groupId) => {
        const next = expandedId === groupId ? null : groupId;
        setExpandedId(next);
        setAddModal(null);
        setSelectedPositionIds([]);
        if (next) setAnimExpandId((prev) => prev === groupId ? prev : groupId);
    };

    const positionsByLevel = (group, level) => {
        return (group.positions || []).filter((p) => p.pivot_level === level);
    };

    const availablePositionsForLevel = (groupId, level) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return [];
        const assigned = positionsByLevel(group, level);
        const assignedIds = new Set(assigned.map((p) => p.id));
        return allPositions.filter((p) => !assignedIds.has(p.id) && (!p.level || p.level === level));
    };

    const openAddModal = (groupId, level) => {
        setAddModal({ groupId, level });
        setSelectedPositionIds([]);
    };

    const closeAddModal = () => {
        setAddModal(null);
        setSelectedPositionIds([]);
        setModalPositionSearch('');
    };

    const toggleSelectedPosition = (positionId) => {
        setSelectedPositionIds((prev) =>
            prev.includes(positionId)
                ? prev.filter((id) => id !== positionId)
                : [...prev, positionId]
        );
    };

    const submitAddPositions = () => {
        if (!addModal || selectedPositionIds.length === 0) return;
        router.post(route('jawatankuasa.groups.positions.store-bulk', addModal.groupId), {
            committee_position_ids: selectedPositionIds,
            level: addModal.level,
        }, {
            preserveScroll: true,
            onSuccess: () => closeAddModal(),
        });
    };

    const removePosition = (groupId, positionId, level) => {
        router.delete(route('jawatankuasa.groups.positions.destroy', [groupId, positionId]), {
            data: { level },
            preserveScroll: true,
        });
    };

    return (
        <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
            <div className="rounded-t-[11px] border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                            <Icon name="layers" className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-green-700">Kumpulan</p>
                            <h3 className="text-sm font-bold text-slate-800">Tambah, edit dan urus jawatan kumpulan</h3>
                        </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{groups.length} kumpulan</span>
                </div>
            </div>

            <div className="p-3">
                <form onSubmit={submitCreate} className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                            <InputLabel htmlFor="group-name" value="Nama Kumpulan" />
                            <TextInput
                                id="group-name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="input-field mt-1 text-xs"
                                placeholder="Contoh: AJK, Bilik Operasi"
                            />
                            <InputError className="mt-1" message={createForm.errors.name} />
                        </div>
                        <div className="flex items-end gap-2">
                            <PrimaryButton className="w-full justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold" disabled={createForm.processing}>
                                <Icon name="plus" className="h-4 w-4" />
                                {createForm.processing ? '...' : 'Tambah'}
                            </PrimaryButton>
                        </div>
                    </div>
                    <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-600">Peringkat:</p>
                        <div className="flex flex-wrap gap-2">
                            {levelOptions.map((level) => (
                                <CheckboxLevel key={level.key} form={createForm} level={level} />
                            ))}
                        </div>
                        <InputError className="mt-1" message={createForm.errors.levels} />
                    </div>
                </form>
            </div>

            <div className="border-t border-green-100 p-3">
                {groups.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-4 text-center text-xs text-slate-400">Belum ada kumpulan.</div>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {groups.map((group) => {
                            const isEditing = editingId === group.id;
                            const isExpanded = expandedId === group.id && !isEditing;

                            if (isEditing) {
                                return (
                                    <div key={group.id} className="rounded-lg border-2 border-green-400 bg-green-50 p-3">
                                        <form onSubmit={submitEdit} className="space-y-2">
                                            <TextInput
                                                value={editForm.data.name}
                                                onChange={(e) => editForm.setData('name', e.target.value)}
                                                className="input-field text-xs"
                                            />
                                            <InputError className="mt-1" message={editForm.errors.name} />
                                            <div className="flex flex-wrap gap-1.5">
                                                {levelOptions.map((level) => (
                                                    <CheckboxLevel key={level.key} form={editForm} level={level} />
                                                ))}
                                            </div>
                                            <InputError className="mt-1" message={editForm.errors.levels} />
                                            <div className="flex justify-end gap-1.5">
                                                <button type="submit" className="rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-500">Simpan</button>
                                                <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Batal</button>
                                            </div>
                                        </form>
                                    </div>
                                );
                            }

                            return (
                                <div key={group.id} ref={isExpanded ? expandedRef : null} className="rounded-lg border border-green-100 bg-white shadow-sm transition hover:border-green-300 hover:shadow-md">
                                    <div className="flex items-start justify-between gap-2 p-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800">{group.name}</p>
                                            {group.description && <p className="mt-0.5 text-[10px] text-slate-400">{group.description}</p>}
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {(group.levels || []).map((level) => (
                                                    <LevelBadge key={level} level={level} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button type="button" onClick={() => toggleExpand(group.id)} className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50">Jawatan</button>
                                            <button type="button" onClick={() => startEdit(group)} className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50">Edit</button>
                                            <button type="button" onClick={() => remove(group)} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">Padam</button>
                                        </div>
                                    </div>

                                    {animExpandId === group.id && (
                                        <div
                                            className="border-t border-green-100 transition-all duration-300 ease-in-out"
                                            style={{ opacity: isExpanded ? 1 : 0 }}
                                        >
                                            <div className="border-b border-green-100 px-2.5 py-2">
                                                <input
                                                    type="text"
                                                    value={positionSearch}
                                                    onChange={(e) => setPositionSearch(e.target.value)}
                                                    placeholder="Cari jawatan..."
                                                    className="input-field w-full text-xs"
                                                />
                                            </div>
                                            <div className="p-2.5 space-y-3">
                                                {(group.levels || []).map((level) => {
                                                    const assigned = positionsByLevel(group, level).filter((p) =>
                                                        !positionSearch || p.name.toLowerCase().includes(positionSearch.toLowerCase())
                                                    );

                                                    return (
                                                        <div key={level}>
                                                            <div className="mb-1 flex items-center justify-between">
                                                                <LevelBadge level={level} />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openAddModal(group.id, level)}
                                                                    className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-0.5 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                                                >
                                                                    <Icon name="plus" className="h-3 w-3" />
                                                                    Tambah
                                                                </button>
                                                            </div>

                                                            {assigned.length === 0 ? (
                                                                <p className="text-[10px] text-slate-400">Tiada jawatan.</p>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {assigned.map((p) => (
                                                                        <span key={p.id} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                                                                            {p.name}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removePosition(group.id, p.id, level)}
                                                                                className="text-green-500 hover:text-rose-600"
                                                                            >
                                                                                <Icon name="x" className="h-3 w-3" />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {addModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={closeAddModal}>
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Tambah Jawatan</p>
                            <button type="button" onClick={closeAddModal} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="border-b border-slate-100 px-4 py-2">
                            <input
                                type="text"
                                value={modalPositionSearch}
                                onChange={(e) => setModalPositionSearch(e.target.value)}
                                placeholder="Cari jawatan..."
                                className="input-field w-full text-xs"
                            />
                        </div>

                        <div className="max-h-72 overflow-y-auto p-4 space-y-1.5">
                            {(() => {
                                const available = availablePositionsForLevel(addModal.groupId, addModal.level)
                                    .filter((p) => !modalPositionSearch || p.name.toLowerCase().includes(modalPositionSearch.toLowerCase()));
                                if (available.length === 0) {
                                    return <p className="py-4 text-center text-xs text-slate-400">Semua jawatan telah ditambah.</p>;
                                }
                                return available.map((p) => (
                                    <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-green-300 has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                        <input
                                            type="checkbox"
                                            checked={selectedPositionIds.includes(p.id)}
                                            onChange={() => toggleSelectedPosition(p.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                                    </label>
                                ));
                            })()}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                            <span className="text-xs text-slate-400">{selectedPositionIds.length} dipilih</span>
                            <div className="flex gap-2">
                                <button type="button" onClick={closeAddModal} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Batal</button>
                                <button
                                    type="button"
                                    onClick={submitAddPositions}
                                    disabled={selectedPositionIds.length === 0}
                                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Tambah
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── PositionManager ──────────────────────────────────────────────────────

function DragHandle() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
        </svg>
    );
}

function SortablePositionRow({ position, editingId, editingData, editingErrors, onStartEdit, onSubmitEdit, onCancelEdit, onRemove, onEditingChange }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: position.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isEditing = editingId === position.id;

    const submitEdit = (event) => {
        event.preventDefault();
        onSubmitEdit(event, position.id);
    };

    const handleEditingDataChange = (field) => (event) => {
        onEditingChange((current) => ({ ...current, [field]: event.target.value }));
    };

    if (isEditing) {
        return (
            <div ref={setNodeRef} style={style} className={'rounded-lg border-2 border-green-400 bg-green-50 p-3 transition ' + (isDragging ? 'z-10 opacity-50 shadow-lg' : '')}>
                <div className="flex items-center gap-2">
                    <span {...attributes} {...listeners} className="cursor-grab shrink-0 text-slate-400 hover:text-slate-600"><DragHandle /></span>
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{position.name}</p>
                    <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">{position.sort_order ?? 0}</span>
                    {position.level && <LevelBadge level={position.level} />}
                </div>
                <form onSubmit={submitEdit} className="mt-2 space-y-2">
                    <div className="grid grid-cols-[1fr_5rem] gap-2">
                        <TextInput
                            id={'position-edit-name-' + position.id}
                            value={editingData.name}
                            onChange={handleEditingDataChange('name')}
                            className="input-field text-xs"
                        />
                        <TextInput
                            id={'position-edit-order-' + position.id}
                            type="number"
                            min="0"
                            value={editingData.sort_order}
                            onChange={handleEditingDataChange('sort_order')}
                            className="input-field text-xs"
                        />
                    </div>
                    <InputError className="mt-1" message={editingErrors.name} />
                    <InputError className="mt-1" message={editingErrors.sort_order} />
                    <div className="flex justify-end gap-1.5">
                        <button type="submit" className="rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-green-500">Simpan</button>
                        <button type="button" onClick={onCancelEdit} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Batal</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className={'flex items-center gap-2.5 rounded-lg border border-green-100 bg-white p-2.5 shadow-sm transition hover:border-green-300 hover:shadow-md ' + (isDragging ? 'z-10 opacity-50 shadow-lg' : '')}>
            <span {...attributes} {...listeners} className="cursor-grab shrink-0 text-slate-400 hover:text-slate-600"><DragHandle /></span>
            <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{position.name}</p>
            {position.level && <LevelBadge level={position.level} />}
            <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">{position.sort_order ?? 0}</span>
            <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => onStartEdit(position)} className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50">Edit</button>
                <button type="button" onClick={() => onRemove(position)} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">Padam</button>
            </div>
        </div>
    );
}

function PositionManager({ positions }) {
    const createForm = useForm({ name: '', sort_order: 0 });
    const [editingId, setEditingId] = useState(null);
    const [editingData, setEditingData] = useState({ name: '', sort_order: 0, level: '' });
    const [editingErrors, setEditingErrors] = useState({});

    const [items, setItems] = useState([]);

    useEffect(() => {
        setItems(positions.map((p) => p.id));
    }, [positions]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

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
            level: position.level ?? '',
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
        if (window.confirm('Padam jawatan ' + position.name + '? Tindakan ini akan membuang jawatan dari semua kumpulan.')) {
            router.delete(route('jawatankuasa.positions.destroy', position.id), {
                preserveScroll: true,
            });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const reordered = [...items];
        reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, active.id);

        setItems(reordered);

        const payload = reordered.map((id, i) => ({ id, sort_order: i }));
        router.put(route('jawatankuasa.positions.reorder'), { positions: payload }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const sortedPositions = useMemo(() => {
        const map = {};
        positions.forEach((p) => { map[p.id] = p; });
        return items.map((id) => map[id]).filter(Boolean);
    }, [positions, items]);

    return (
        <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20 overflow-hidden">
            <div className="rounded-t-[11px] border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                            <Icon name="userCog" className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-green-700">Jawatan</p>
                            <h3 className="text-sm font-bold text-slate-800">Senarai master jawatan (digunakan oleh semua kumpulan)</h3>
                        </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{positions.length} jawatan</span>
                </div>
            </div>

            <div className="p-3 space-y-3">
                <form onSubmit={submitCreate} className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <div>
                        <InputLabel htmlFor="position-name" value="Nama Jawatan (asingkan dengan koma)" />
                        <TextInput
                            id="position-name"
                            value={createForm.data.name}
                            onChange={(event) => createForm.setData('name', event.target.value)}
                            className="input-field mt-1 text-xs"
                            placeholder="Contoh: Pengerusi, Timbalan Pengerusi, Setiausaha, Bendahari"
                        />
                        <InputError className="mt-1" message={createForm.errors.name} />
                    </div>

                    <div className="flex items-end">
                        <PrimaryButton className="w-full justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold" disabled={createForm.processing}>
                            <Icon name="plus" className="h-4 w-4" />
                            {createForm.processing ? '...' : 'Tambah'}
                        </PrimaryButton>
                    </div>
                </form>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        <div className="border-t border-green-100 pt-3">
                            {sortedPositions.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-4 text-center text-xs text-slate-400">
                                    Belum ada jawatan.
                                </div>
                            ) : (
                                <div className="grid gap-2" style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(' + Math.ceil(sortedPositions.length / 2) + ', auto)' }}>
                                    {sortedPositions.map((position) => (
                                        <SortablePositionRow
                                            key={position.id}
                                            position={position}
                                            editingId={editingId}
                                            editingData={editingData}
                                            editingErrors={editingErrors}
                                            onStartEdit={startEdit}
                                            onSubmitEdit={submitEdit}
                                            onCancelEdit={() => setEditingId(null)}
                                            onRemove={remove}
                                            onEditingChange={setEditingData}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </section>
    );
}

// ─── MembershipManager ────────────────────────────────────────────────────

function escapeXml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const committeeTabs = [
    { key: 'jprd', label: 'JPRD', desc: 'Peringkat kawasan', icon: 'users' },
    { key: 'udm', label: 'UDM', desc: 'Unit daerah mengundi', icon: 'mapPin' },
    { key: 'cawangan', label: 'Cawangan', desc: 'Peringkat cawangan', icon: 'userCog' },
];

const MembershipManager = forwardRef(function MembershipManager({ groups, memberships, scopes, auth, activeTab, onTabChange }, ref) {
    const userLevel = auth?.user?.access_level ?? 'jprd';
    const levelPriority = { jprd: 3, udm: 2, cawangan: 1 };
    const tabs = committeeTabs.filter(t => levelPriority[t.key] <= levelPriority[userLevel]);
    const defaultTab = userLevel === 'jprd' ? 'jprd' : userLevel;
    const [activeTabLocal, setActiveTabLocal] = useState(defaultTab);
    const resolvedTab = activeTab ?? activeTabLocal;
    const setResolvedTab = onTabChange ?? setActiveTabLocal;
    const suggestionsAbort = useRef(null);
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoter, setSelectedVoter] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const positionsForForm = useMemo(() => {
        if (!selectedGroupId) return [];
        const group = groups.find((g) => g.id === selectedGroupId);
        if (!group) return [];
        return (group.positions || []).filter((p) => p.pivot_level === resolvedTab);
    }, [groups, selectedGroupId, resolvedTab]);

    const form = useForm({
        pemilih_record_id: '',
        committee_position_id: '',
        committee_group_id: '',
        level: 'jprd',
        scope_key: scopes.jprd?.[0]?.key ?? 'jprd',
        voter_search: '',
        notes: '',
    });

    useEffect(() => {
        form.setData((current) => ({
            ...current,
            level: resolvedTab,
            scope_key: scopes[resolvedTab]?.[0]?.key ?? '',
        }));
        setSelectedGroupId('');
        setSelectedVoter(null);
        setSuggestions([]);
    }, [resolvedTab]);

    useEffect(() => {
        if (positionsForForm.length > 0) {
            form.setData('committee_position_id', positionsForForm[0].id);
        } else {
            form.setData('committee_position_id', '');
        }
    }, [positionsForForm]);

    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const expandedGroupRef = useRef(null);

    const [multiPosExpand, setMultiPosExpand] = useState({});
    const [quickAddModal, setQuickAddModal] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState({});
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [cropFile, setCropFile] = useState(null);
    const [cropTargetMember, setCropTargetMember] = useState(null);
      const avatarInputRefs = useRef({});
  
      const handleFileSelect = (m, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCropTargetMember(m);
        setCropFile(file);
        e.target.value = '';
    };

      const handleAvatarUpload = async (file) => {
        const m = cropTargetMember;
        if (!m) return;
        const id = m.id;
        setUploadingAvatar(prev => ({ ...prev, [id]: true }));
        setCropFile(null);
        setCropTargetMember(null);
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', m.pemilih_record_id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.success) {
                m.voter.avatar_url = data.avatar_url;
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploadingAvatar(prev => ({ ...prev, [id]: false }));
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (expandedGroupRef.current && !expandedGroupRef.current.contains(event.target)) {
                setExpandedGroupId(null);
            }
        };
        if (expandedGroupId !== null) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [expandedGroupId]);

    const voterMembershipsMap = useMemo(() => {
        const map = {};
        memberships.forEach((m) => {
            const vid = m.voter.id;
            if (!map[vid]) map[vid] = [];
            map[vid].push(m);
        });
        return map;
    }, [memberships]);

    const currentScopes = scopes[resolvedTab] ?? [];

    const filteredMemberships = useMemo(() => {
        return memberships.filter((membership) => {
            if (membership.level !== resolvedTab) return false;
            if (resolvedTab === 'jprd') return true;
            return membership.scope_key === form.data.scope_key;
        });
    }, [resolvedTab, form.data.scope_key, memberships]);

    const unassignedMemberships = useMemo(() => {
        return filteredMemberships.filter(m => !m.committee_group_id);
    }, [filteredMemberships]);

    const groupsWithMembers = useMemo(() => {
        return groups
            .filter(g => g.levels && g.levels.includes(resolvedTab))
            .map(group => {
                const levelPositions = (group.positions || [])
                    .filter(p => p.pivot_level === resolvedTab)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                const positionsWithMembers = levelPositions.map(pos => ({
                    ...pos,
                    members: filteredMemberships.filter(m =>
                        m.position?.id === pos.id &&
                        m.committee_group_id === group.id
                    )
                }));

                const totalMembers = positionsWithMembers.reduce((sum, p) => sum + p.members.length, 0);

                return { ...group, positionsWithMembers, totalMembers };
            })
            .filter(g => g.totalMembers > 0);
    }, [groups, resolvedTab, filteredMemberships]);

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
            const params = new URLSearchParams({ q: value, scope_key: form.data.scope_key, level: resolvedTab });
            const response = await fetch(route('jawatankuasa.search') + '?' + params.toString(), {
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
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedVoter(null);
                setSuggestions([]);
                form.reset('pemilih_record_id', 'voter_search', 'notes');
                form.setData((current) => ({
                    ...current,
                    committee_position_id: positionsForForm[0]?.id ?? '',
                    committee_group_id: selectedGroupId || '',
                    level: resolvedTab,
                }));
            },
        });
    };

    const removeMembership = (membership) => {
        if (window.confirm('Buang ' + membership.voter.name + ' daripada jawatankuasa ini?')) {
            router.delete(route('jawatankuasa.memberships.destroy', membership.id), {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const exportToExcel = useCallback(() => {
        const tabKey = resolvedTab;
        const tabLabel = tabs.find((t) => t.key === tabKey)?.label ?? tabKey.toUpperCase();
        const scope = currentScopes.find((s) => s.key === form.data.scope_key);
        const scopePart = tabKey === 'jprd' ? '' : ((scope?.parent_scope_name ? scope.parent_scope_name + '_' + scope.name : (scope?.name ?? '')).replace(/[\/\s]+/g, '_'));

        const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
        const align = ['center', 'center', 'left', 'center'];
        const widths = [30, 150, 520, 100];

        const dataRows = filteredMemberships.map((m, i) => [
            { value: i + 1, type: 'Number', align: 'center' },
            { value: m.position?.name ?? '-', type: 'String', align: 'center' },
            { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
            { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
        ]);

        const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
        const titleXml = `
            <Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleMain"><Data ss:Type="String">Ahli Jawatankuasa ${tabLabel}</Data></Cell></Row>
            ${tabKey === 'jprd' ? '' : `<Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleSub"><Data ss:Type="String">${scopePart.replace(/_/g, ' ')}</Data></Cell></Row>`}
        `;
        const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
        const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');

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
        link.download = 'AJK_' + tabLabel + (scopePart ? '_' + scopePart : '') + '.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [resolvedTab, currentScopes, form.data.scope_key, filteredMemberships]);

    const exportGroupToExcel = useCallback((group) => {
        const tabKey = resolvedTab;
        const tabLabel = tabs.find((t) => t.key === tabKey)?.label ?? tabKey.toUpperCase();
        const scope = currentScopes.find((s) => s.key === form.data.scope_key);
        const scopePart = tabKey === 'jprd' ? '' : ((scope?.parent_scope_name ? scope.parent_scope_name + '_' + scope.name : (scope?.name ?? '')).replace(/[\/\s]+/g, '_'));

        const allMembers = [];
        group.positionsWithMembers.forEach(pos => {
            pos.members.forEach(m => {
                allMembers.push({ ...m, positionName: pos.name });
            });
        });

        const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
        const align = ['center', 'center', 'left', 'center'];
        const widths = [30, 150, 520, 100];

        const dataRows = allMembers.map((m, i) => [
            { value: i + 1, type: 'Number', align: 'center' },
            { value: m.positionName ?? '-', type: 'String', align: 'center' },
            { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
            { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
        ]);

        const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
        const titleXml = `
            <Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleMain"><Data ss:Type="String">${group.name} — ${tabLabel}</Data></Cell></Row>
            ${tabKey === 'jprd' ? '' : `<Row><Cell ss:MergeAcross="${cols.length - 1}" ss:StyleID="titleSub"><Data ss:Type="String">${scopePart.replace(/_/g, ' ')}</Data></Cell></Row>`}
        `;
        const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
        const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');

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
        const groupNameClean = group.name.replace(/[\/\s]+/g, '_');
        link.download = 'AJK_' + groupNameClean + '_' + tabLabel + (scopePart ? '_' + scopePart : '') + '.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [resolvedTab, currentScopes, form.data.scope_key]);

    useImperativeHandle(ref, () => ({ exportToExcel }), [exportToExcel]);

    return (
        <>
        <section className="rounded-xl border border-green-600 bg-white shadow-sm shadow-green-600/20">
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
                                    onClick={() => setResolvedTab(tab.key)}
                                    className={'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-left transition ' + (resolvedTab === tab.key ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700')}
                                >
                                    <Icon name={tab.icon} className="h-3.5 w-3.5" />
                                    <span><span className={'block text-xs font-bold ' + (resolvedTab === tab.key ? 'text-white' : 'text-slate-900')}>{tab.label}</span><span className={'mt-0.5 block text-xs ' + (resolvedTab === tab.key ? 'text-green-50' : 'text-slate-500')}>{tab.desc}</span></span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3">
                <form onSubmit={submit} className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-4">
                        <div className="relative">
                            <InputLabel htmlFor="committee-voter-search" value="Cari Pemilih Aktif" />
                            <div className="relative mt-1">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <TextInput
                                    id="committee-voter-search"
                                    value={form.data.voter_search}
                                    onChange={handleSearchChange}
                                    className="input-field pl-9 text-xs"
                                    placeholder="Nama, No Kp atau telefon"
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
                                <InputLabel htmlFor="membership-group" value="Kumpulan" />
                                <select
                                    id="membership-group"
                                    value={selectedGroupId}
                                    onChange={(e) => {
                                        const gid = Number(e.target.value);
                                        setSelectedGroupId(gid);
                                        form.setData('committee_group_id', gid || '');
                                    }}
                                    className="input-field mt-1 text-xs"
                                >
                                <option value="">Pilih kumpulan</option>
                                {groups.filter(g => g.levels && g.levels.includes(resolvedTab)).map((group) => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </select>
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
                                {positionsForForm.map((position) => (
                                    <option key={position.id} value={position.id}>{position.name}</option>
                                ))}
                            </select>
                            <InputError className="mt-1" message={form.errors.committee_position_id} />
                        </div>

                        <div>
                            <InputLabel htmlFor="committee-scope" value={resolvedTab === 'jprd' ? 'Peringkat' : 'Scope'} />
                            <select
                                id="committee-scope"
                                value={form.data.scope_key}
                                onChange={(event) => form.setData('scope_key', event.target.value)}
                                className="input-field mt-1 text-xs"
                            >
                                {currentScopes.map((scope) => (
                                    <option key={scope.key} value={scope.key}>
                                        {scope.parent_scope_name ? scope.parent_scope_name + ' / ' + scope.name : scope.name}
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
                                        UDM: {selectedVoter.dm || '-'} | Cawangan: {selectedVoter.locality || '-'}
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
                        <PrimaryButton disabled={form.processing || !positionsForForm.length} className="rounded-lg px-4 py-2 text-xs font-bold">
                            {form.processing ? '...' : 'Tambah Ahli'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <div className="border-t border-green-100 p-3">
                {groupsWithMembers.length === 0 && unassignedMemberships.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 py-4 text-center text-xs text-slate-400">Belum ada kumpulan atau ahli untuk peringkat ini.</div>
                ) : (
                    <div className="space-y-2">
                        {groupsWithMembers.map((group) => {
                            const isExpanded = expandedGroupId === group.id;
                            return (
                                <div key={group.id} className="rounded-lg border border-green-100 bg-white shadow-sm overflow-hidden" ref={isExpanded ? expandedGroupRef : null}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-green-50"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={'shrink-0 transition-transform duration-200 ' + (isExpanded ? 'rotate-90' : '')}>
                                                <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">{group.name}</span>
                                            {group.description && <span className="text-[10px] text-slate-400 truncate">— {group.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); exportGroupToExcel(group); }}
                                                className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                            >
                                                <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white mr-1">X</span>
                                                Excel
                                            </button>
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{group.totalMembers} ahli</span>
                                            <LevelBadge level={resolvedTab} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-green-100 p-3">
                                            {group.positionsWithMembers.length === 0 ? (
                                                <p className="text-center text-xs text-slate-400">Tiada jawatan untuk kumpulan ini.</p>
                                            ) : (
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                {group.positionsWithMembers.map((pos) => {
                                                    const voterGroupPositions = {};
                                                    const isSingle = pos.members.length <= 1;
                                                    group.positions?.forEach(p => {
                                                        const posMemberships = memberships.filter(m => m.position?.id === p.id);
                                                        posMemberships.forEach(m => {
                                                            const vid = m.voter?.id;
                                                            if (!vid) return;
                                                            if (!voterGroupPositions[vid]) voterGroupPositions[vid] = [];
                                                            const key = `${p.id}-${m.scope_key || ''}`;
                                                            if (!voterGroupPositions[vid].find(x => x.key === key)) {
                                                                voterGroupPositions[vid].push({ key, positionName: p.name, scopeName: m.scope_name, groupName: group.name });
                                                            }
                                                        });
                                                    });
                                                    return (
                                                    <div key={pos.id} className={isSingle ? '' : 'sm:col-span-3'}>
                                                        <div className="mb-2">
                                                            <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">{pos.name}</span>
                                                        </div>
                                                        {pos.members.length === 0 ? (
                                                            <button type="button" onClick={() => setQuickAddModal({ group, position: pos, level: resolvedTab })} className="flex items-center gap-1 rounded-md border border-dashed border-green-300 bg-green-50 px-2.5 py-1.5 text-[10px] font-bold text-green-700 transition hover:bg-green-100 hover:border-green-400">
                                                                <Icon name="plus" className="h-3.5 w-3.5" /> Tambah Ahli
                                                            </button>
                                                        ) : (
                                                            <div className={'grid gap-1.5 ' + (pos.members.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}>
                                                                 {pos.members.map((m, i) => {
                                                                     const canRemove = auth.user?.is_master_admin || m.created_by === auth.user?.id;
                                                                     const voterPositions = (voterGroupPositions[m.voter?.id] || []).filter(p => p.key !== `${pos.id}-${m.scope_key || ''}`);
                                                                     const multiKey = `${pos.id}-${m.id}`;
                                                                      const showMore = multiPosExpand[multiKey];
                                                                      const avatarId = m.id;
                                                                      return (
                                                                          <div key={m.id} className="rounded-md border border-green-50 bg-green-50/50 px-2.5 py-2">
                                                                              <div className="flex items-start gap-2.5">
{m.voter.avatar_url ? (
                                                                                        <img src={m.voter.avatar_url} alt="" className="mt-0.5 h-10 w-10 shrink-0 cursor-pointer self-center rounded-full border border-slate-200 object-cover" onClick={() => setLightboxSrc(m.voter.avatar_url)} />
                                                                                    ) : null}
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <p className="text-xs font-bold text-slate-800">{pos.members.length > 1 ? `${i + 1}. ` : ''}{m.voter.name}</p>
                                                                                        <p className="text-xs text-slate-500">{m.voter.no_kp || m.voter.old_ic || '-'}</p>
                                                                                    </div>
                                                                                    <div className="flex shrink-0 items-center gap-1">
                                                                                         <input ref={(el) => { avatarInputRefs.current[avatarId] = el; }} type="file" accept="image/*" onChange={(e) => handleFileSelect(m, e)} className="hidden" />
                                                                                       <button onClick={() => avatarInputRefs.current[avatarId]?.click()} disabled={uploadingAvatar[avatarId]} className="shrink-0 rounded border border-green-200 bg-white p-1 text-green-700 transition hover:bg-green-50 disabled:opacity-50" title="Muat Naik Avatar">{uploadingAvatar[avatarId] ? <span className="text-[10px] font-bold">...</span> : <Icon name="camera" className="h-3.5 w-3.5" />}</button>
                                                                                  </div>
                                                                              </div>
                                                                             {m.notes && <p className="mt-1 text-[10px] font-medium text-amber-700">{m.notes}</p>}
                                                                              {voterPositions.length > 0 ? (
                                                                                  <div className="mt-1">
                                                                                      <div className="flex items-center gap-2">
                                                                                          <button type="button" onClick={() => setMultiPosExpand(prev => ({ ...prev, [multiKey]: !showMore }))} className="text-[10px] font-medium text-green-600 hover:text-green-800">
                                                                                              {showMore ? '- Sembunyi jawatan lain' : `+ ${voterPositions.length} jawatan lain`}
                                                                                          </button>
                                                                                          {canRemove && (
                                                                                               <button type="button" onClick={() => removeMembership(m)} className="ml-auto text-rose-600 hover:text-rose-800" title="Buang"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                                                                                          )}
                                                                                      </div>
                                                      {showMore && (
                                                          <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">
                                                               {voterPositions.map(vp => (
                                                                    <span key={vp.key} className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">{vp.groupName} - {vp.positionName} ({vp.scopeName})</span>
                                                               ))}
                                                          </div>
                                                      )}
                                                                                  </div>
                                                                              ) : canRemove ? (
                                                                                  <div className="mt-1 flex items-center justify-end">
                                                                                       <button type="button" onClick={() => removeMembership(m)} className="text-rose-600 hover:text-rose-800" title="Buang"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                                                                                  </div>
                                                                              ) : null}
                                                                         </div>
                                                                     );
                        })}
                    </div>
                )}

                {unassignedMemberships.length > 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
                        <p className="mb-2 text-xs font-bold text-amber-700">Ahli tanpa kumpulan</p>
                        <div className="flex flex-wrap gap-1">
                            {unassignedMemberships.map((m) => (
                                <span key={m.id} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                    {m.voter?.name} — {m.position?.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
                                                    );
                                                })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
            {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
            {cropFile && (
                <CropModal file={cropFile} onCrop={handleAvatarUpload} onClose={() => { setCropFile(null); setCropTargetMember(null); }} />
            )}
            {quickAddModal && (
                <QuickAddMemberModal
                    group={quickAddModal.group}
                    position={quickAddModal.position}
                    level={quickAddModal.level}
                    scopes={scopes}
                    currentScopeKey={form.data.scope_key}
                    onClose={() => setQuickAddModal(null)}
                />
            )}
        </>
    );
});

// ─── QuickAddMemberModal ──────────────────────────────────────────────────

function QuickAddMemberModal({ group, position, level, scopes, currentScopeKey, onClose }) {
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoter, setSelectedVoter] = useState(null);
    const suggestionsAbort = useRef(null);

    const form = useForm({
        pemilih_record_id: '',
        committee_position_id: position.id,
        committee_group_id: group.id,
        level: level,
        scope_key: currentScopeKey || (scopes[level]?.[0]?.key ?? ''),
        voter_search: '',
        notes: '',
    });

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
            const params = new URLSearchParams({ q: value, scope_key: form.data.scope_key, level: form.data.level });
            const response = await fetch(route('jawatankuasa.search') + '?' + params.toString(), {
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
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedVoter(null);
                setSuggestions([]);
                onClose();
            },
        });
    };

    if (!group || !position) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                        <p className="text-sm font-bold text-slate-800">Tambah Ahli — {position.name}</p>
                        <p className="text-[10px] text-slate-500">Kumpulan: {group.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-4 p-4">
                    <div className="relative">
                        <InputLabel htmlFor="quick-voter-search" value="Cari Pemilih Aktif" />
                        <div className="relative mt-1">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <TextInput
                                id="quick-voter-search"
                                value={form.data.voter_search}
                                onChange={handleSearchChange}
                                className="input-field pl-9 text-xs"
                                placeholder="Nama, No Kp atau telefon"
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

                    {selectedVoter && (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <Icon name="user" className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-green-800">{selectedVoter.name}</p>
                                    <p className="text-xs text-green-600">
                                        UDM: {selectedVoter.dm || '-'} | Cawangan: {selectedVoter.locality || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <InputLabel htmlFor="quick-notes" value="Catatan (Optional)" />
                        <TextInput
                            id="quick-notes"
                            value={form.data.notes}
                            onChange={(event) => form.setData('notes', event.target.value)}
                            className="input-field mt-1 text-xs"
                            placeholder="Contoh: dilantik pada mesyuarat agung"
                        />
                        <InputError className="mt-1" message={form.errors.notes} />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                            Batal
                        </button>
                        <PrimaryButton disabled={form.processing || !selectedVoter} className="rounded-lg px-4 py-2 text-xs font-bold">
                            {form.processing ? '...' : 'Tambah Ahli'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── CommitteeSearchModal ─────────────────────────────────────────────────

function CommitteeSearchModal({ memberships: allMemberships, isOpen, onClose }) {
    const [query, setQuery] = useState('');

    const results = useMemo(() => {
        if (!query.trim()) return [];

        const q = query.toLowerCase();
        const matched = allMemberships.filter((m) =>
            m.voter.name.toLowerCase().includes(q) ||
            (m.voter.no_kp && m.voter.no_kp.includes(q)) ||
            (m.voter.old_ic && m.voter.old_ic.includes(q))
        );

        const grouped = {};
        matched.forEach((m) => {
            const vid = m.voter.id;
            if (!grouped[vid]) grouped[vid] = { voter: m.voter, memberships: [] };
            grouped[vid].memberships.push(m);
        });

        return Object.values(grouped).sort((a, b) => a.voter.name.localeCompare(b.voter.name));
    }, [query, allMemberships]);

    if (!isOpen) return null;

    const levelColors = {
        jprd: { bg: 'bg-green-100', text: 'text-green-700', label: 'JPRD' },
        udm: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'UDM' },
        cawangan: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Cawangan' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                    <Icon name="search" className="h-5 w-5 shrink-0 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari nama ahli jawatankuasa..."
                        className="flex-1 border-0 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                        autoFocus
                    />
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4">
                    {!query.trim() ? (
                        <p className="py-8 text-center text-xs text-slate-400">Taip nama atau No Kp untuk mula mencari.</p>
                    ) : results.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada hasil carian.</p>
                    ) : (
                        <div className="space-y-3">
                            {results.map(({ voter, memberships: vms }) => (
                                <div key={voter.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                    <p className="text-sm font-bold text-slate-800">{voter.name}</p>
                                    <p className="text-xs text-slate-400">No Kp: {voter.no_kp || voter.old_ic || '-'}</p>
                                    <div className="mt-2 space-y-1">
                                        {vms.map((m) => {
                                            const lc = levelColors[m.level] || { bg: 'bg-slate-100', text: 'text-slate-700', label: m.level };
                                            return (
                                                <div key={m.id} className="flex items-center gap-2">
                                                    <span className={'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ' + lc.bg + ' ' + lc.text}>{lc.label}</span>
                                                    <span className="text-xs font-semibold text-slate-700">{m.position.name}</span>
                                                    {m.scope_name && <span className="text-[10px] text-slate-400">({m.scope_name})</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {results.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-2 text-right text-[10px] text-slate-400">
                        {results.length} orang dijumpai
                    </div>
                )}
            </div>
            </div>
    );
}

// ─── CommitteeDetailPopup ─────────────────────────────────────────────────

function CommitteeDetailPopup({ scope, members, level, groups, highlight, onClose }) {
    if (!scope) return null;

    const groupedByGroup = {};
    members.forEach((m) => {
        const gid = m.committee_group_id || 'tanpa-kumpulan';
        const grp = groups.find((g) => g.id === m.committee_group_id);
        if (!groupedByGroup[gid]) groupedByGroup[gid] = { groupName: grp?.name || 'Tanpa Kumpulan', members: [] };
        groupedByGroup[gid].members.push(m);
    });

    const isMatching = (name) => {
        if (!highlight || !highlight.trim()) return false;
        return name?.toLowerCase().includes(highlight.toLowerCase());
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-8 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            {levelMeta[level]?.label ?? level} — {scope.parent_scope_name ? `${scope.parent_scope_name} / ` : ''}{scope.name}
                        </p>
                        <p className="text-xs text-slate-500">{members.length} orang ahli jawatankuasa</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-4">
                    {members.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada ahli jawatankuasa.</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedByGroup).map(([gid, g]) => (
                                <div key={gid} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{g.groupName}</p>
                                            <p className="text-[10px] text-slate-400">{g.members.length} ahli{(() => {
                                                const latest = Math.max(...g.members.map((m) => new Date(m.updated_at).getTime()), 0);
                                                if (!latest) return '';
                                                const d = new Date(latest);
                                                const dd = String(d.getDate()).padStart(2, '0');
                                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                const yy = d.getFullYear();
                                                const hh = String(d.getHours()).padStart(2, '0');
                                                const mi = String(d.getMinutes()).padStart(2, '0');
                                                return ' — kemaskini: ' + dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mi;
                                            })()}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cols = ['Bil', 'Jawatan', 'Nama', 'No. Tel'];
                                                const align = ['center', 'center', 'left', 'center'];
                                                const widths = [30, 150, 520, 100];
                                                const dataRows = g.members.map((m, i) => [
                                                    { value: i + 1, type: 'Number', align: 'center' },
                                                    { value: m.position?.name ?? '-', type: 'String', align: 'center' },
                                                    { value: m.voter?.name ?? '-', type: 'String', align: 'left' },
                                                    { value: m.voter?.phone_mobile || m.voter?.phone_home || '-', type: 'String', align: 'center' },
                                                ]);
                                                const colXml = widths.map((w) => '<Column ss:AutoFitWidth="1" ss:Width="' + w + '"/>').join('');
                                                const titleXml = '<Row><Cell ss:MergeAcross="' + (cols.length - 1) + '" ss:StyleID="titleMain"><Data ss:Type="String">' + escapeXml(g.groupName) + ' — ' + (levelMeta[level]?.label ?? level) + '</Data></Cell></Row>';
                                                const headerXml = '<Row>' + cols.map((h, i) => '<Cell ss:StyleID="' + (align[i] === 'center' ? 'headerCenter' : 'header') + '"><Data ss:Type="String">' + escapeXml(h) + '</Data></Cell>').join('') + '</Row>';
                                                const bodyXml = dataRows.map((cells) => '<Row>' + cells.map((c) => '<Cell ss:StyleID="' + (c.align === 'center' ? 'cellCenter' : 'cell') + '"><Data ss:Type="' + c.type + '">' + escapeXml(c.value) + '</Data></Cell>').join('') + '</Row>').join('');
                                                const xml = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style><Style ss:ID="titleMain"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="24" ss:Bold="1"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style><Style ss:ID="header"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="headerCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style><Style ss:ID="cell"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="cellCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:FontName="Calibri" ss:Size="11"/></Style></Styles><Worksheet ss:Name="' + escapeXml(g.groupName) + '"><Table>' + colXml + titleXml + headerXml + bodyXml + '</Table></Worksheet></Workbook>';
                                                const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                const scopePart = scope.parent_scope_name ? scope.parent_scope_name.replace(/[\/\s]+/g, '_') + '_' + scope.name.replace(/[\/\s]+/g, '_') : scope.name.replace(/[\/\s]+/g, '_');
                                                link.download = 'AJK_' + g.groupName.replace(/[\/\s]+/g, '_') + '_' + (levelMeta[level]?.label ?? level) + '_' + scopePart + '.xls';
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="flex items-center gap-1 rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 transition hover:bg-green-50"
                                        >
                                            <span className="rounded bg-green-600 px-1 py-0.5 text-[9px] font-black text-white">X</span>
                                            Excel
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {g.members.map((m) => {
                                            const match = isMatching(m.voter?.name);
                                            return (
                                            <div key={m.id} className={'flex items-center gap-3 px-3 py-2 transition ' + (match ? 'bg-amber-50 ring-1 ring-amber-300 rounded-md' : '')}>
                                                <div className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' + (match ? 'bg-amber-200 text-amber-800' : 'bg-green-100 text-green-700')}>
                                                    <Icon name="user" className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={'text-xs font-bold ' + (match ? 'text-amber-900' : 'text-slate-800')}>{m.voter?.name}</p>
                                                    <p className="text-[10px] text-slate-400">{m.voter?.no_kp || m.voter?.old_ic || '-'}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className="inline-block rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">{m.position?.name}</span>
                                                    {m.notes && <p className="mt-0.5 text-[9px] text-amber-600">{m.notes}</p>}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── CommitteeLaporanModal ─────────────────────────────────────────────────

function CommitteeLaporanModal({ memberships, scopes, groups, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('jprd');
    const [detailScope, setDetailScope] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const currentScopes = scopes[activeTab] ?? [];

    const scopeStats = useMemo(() => {
        return currentScopes.map((scope) => {
            const scopeMembers = memberships.filter((m) => m.level === activeTab && m.scope_key === scope.key);
            const groupSet = new Set();
            scopeMembers.forEach((m) => {
                const g = groups.find((g) => g.id === m.committee_group_id);
                groupSet.add(g?.name ?? 'Tanpa Kumpulan');
            });
            return {
                ...scope,
                totalMembers: scopeMembers.length,
                groupNames: [...groupSet],
                members: scopeMembers,
            };
        });
    }, [currentScopes, memberships, activeTab]);

    const filteredScopeStats = useMemo(() => {
        let list = scopeStats;
        if (activeTab === 'cawangan') {
            list = list.filter((scope) => scope.totalMembers > 0);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((scope) => {
                if (scope.name.toLowerCase().includes(q)) return true;
                if (scope.parent_scope_name && scope.parent_scope_name.toLowerCase().includes(q)) return true;
                if (scope.members.some((m) => m.voter?.name?.toLowerCase().includes(q))) return true;
                if (scope.groupNames.some((g) => g.toLowerCase().includes(q))) return true;
                return false;
            });
        }
        return [...list].sort((a, b) => {
            const aLatest = Math.max(...a.members.map((m) => new Date(m.updated_at).getTime()), 0);
            const bLatest = Math.max(...b.members.map((m) => new Date(m.updated_at).getTime()), 0);
            return bLatest - aLatest;
        });
    }, [scopeStats, searchQuery, activeTab]);

    const detailMembers = detailScope ? memberships.filter((m) => m.level === activeTab && m.scope_key === detailScope.key) : [];

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 sm:pt-16" onClick={onClose}>
            <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-800">Laporan Jawatankuasa</p>
                        <p className="text-xs text-slate-500">Senarai kumpulan mengikut peringkat</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <Icon name="x" className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 border-b border-slate-200 px-4 py-2 shrink-0">
                    {levelOptions.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setActiveTab(opt.key)}
                            className={'rounded-lg px-3 py-1.5 text-xs font-bold transition ' + (activeTab === opt.key ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700')}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="border-b border-slate-200 px-4 py-2 shrink-0">
                    <div className="relative">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama ahli, peringkat atau kumpulan..."
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-green-300 focus:ring-1 focus:ring-green-300"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-y-auto p-4">
                    {filteredScopeStats.length === 0 ? (
                        <p className="py-8 text-center text-xs text-slate-400">Tiada data untuk peringkat ini.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredScopeStats.map((scope) => {
                                const hasMembers = scope.totalMembers > 0;
                                return (
                                    <div key={scope.key} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition hover:bg-slate-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800">
                                                {scope.parent_scope_name && (
                                                    <span className="text-slate-400">{scope.parent_scope_name} / </span>
                                                )}
                                                {scope.name}
                                            </p>
                                            {hasMembers ? (
                                                <p className="mt-0.5 text-[10px] text-green-600">
                                                    {scope.totalMembers} ahli — {scope.groupNames.join(', ')}
                                                </p>
                                            ) : (
                                                <p className="mt-0.5 text-[10px] text-amber-600">Belum ada ahli</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {hasMembers && (
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">{scope.totalMembers}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setDetailScope(hasMembers ? scope : null)}
                                                disabled={!hasMembers}
                                                className={'rounded-lg border px-3 py-1.5 text-xs font-bold transition ' + (hasMembers ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed')}
                                            >
                                                Jawatankuasa
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {detailScope && (
            <CommitteeDetailPopup
                scope={detailScope}
                members={memberships.filter((m) => m.level === activeTab && m.scope_key === detailScope.key)}
                level={activeTab}
                groups={groups}
                highlight={searchQuery}
                onClose={() => setDetailScope(null)}
            />
        )}
        </>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────

export default function CommitteeIndex({ groups, positions, memberships, scopes }) {
    const { auth } = usePage().props;
    const allowedModules = auth.user?.allowed_modules ?? [];
    const canKumpulan = allowedModules.includes('jawatankuasa.kumpulan');
    const canJawatan = allowedModules.includes('jawatankuasa.jawatan');
    const canSenarai = allowedModules.includes('jawatankuasa.senarai');

    const [searchOpen, setSearchOpen] = useState(false);
    const membershipRef = useRef(null);

    const sectionTabs = [
        ...(canSenarai ? [{ key: 'senarai-jawatankuasa', label: 'Senarai Jawatankuasa', desc: 'Lantik dan semak ahli ikut peringkat.', icon: 'users' }] : []),
        ...(canKumpulan ? [{ key: 'kumpulan', label: 'Kumpulan', desc: 'Urus kumpulan dan jawatan kumpulan.', icon: 'layers' }] : []),
        ...(canJawatan ? [{ key: 'jawatan', label: 'Jawatan', desc: 'Senarai master jawatan.', icon: 'userCog' }] : []),
    ];

    const [activeSection, setActiveSection] = useState(() => {
        if (canSenarai) return 'senarai-jawatankuasa';
        if (canKumpulan) return 'kumpulan';
        return 'jawatan';
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Jawatankuasa</p>
                        <h2 className="mt-0.5 heading-lg">Urus jawatan dan pelantikan</h2>

                    </div>
                    <div className="mt-1 flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => setSearchOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                            <Icon name="search" className="h-4 w-4" />
                            Cari Ahli
                        </button>

                    </div>
                </div>
            }
        >
            <Head title="Jawatankuasa" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                {sectionTabs.length > 1 && (
                    <div className={'grid gap-2 ' + (sectionTabs.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                        {sectionTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveSection(tab.key)}
                                className={'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ' + (activeSection === tab.key ? 'border-green-300 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md' : 'border-green-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50')}
                            >
                                <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' + (activeSection === tab.key ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700')}><Icon name={tab.icon} className="h-5 w-5" /></span>
                                <span><span className={'block text-xs font-bold uppercase tracking-wider ' + (activeSection === tab.key ? 'text-white' : 'text-green-700')}>{tab.label}</span><span className={'mt-0.5 block text-xs ' + (activeSection === tab.key ? 'text-green-100' : 'text-slate-500')}>{tab.desc}</span></span>
                            </button>
                        ))}
                    </div>
                )}

                {activeSection === 'kumpulan' && (
                    <GroupManager groups={groups} positions={positions} />
                )}

                {activeSection === 'jawatan' && (
                    <PositionManager positions={positions} />
                )}

                {activeSection === 'senarai-jawatankuasa' && (
                    <MembershipManager ref={membershipRef} groups={groups} memberships={memberships} scopes={scopes} auth={auth} />
                )}
            </div>

            <CommitteeSearchModal memberships={memberships} isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </AuthenticatedLayout>
    );
}
