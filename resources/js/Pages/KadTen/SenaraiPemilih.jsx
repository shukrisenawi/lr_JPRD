import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        check: <><path d="M20 6 9 17l-5-5" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function AssignModal({ voter, kads, onAssign, onClose }) {
    const [assigning, setAssigning] = useState(null);

    const handleAssign = async (kad) => {
        setAssigning(kad.id);
        try {
            const res = await fetch(route('kad-ten.assign-voter', kad.id), {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ pemilih_record_id: voter.id }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || 'Gagal.');
                return;
            }
            onAssign(voter.id, kad);
        } catch {
            alert('Ralat. Sila cuba lagi.');
        } finally {
            setAssigning(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 sm:pt-24" onClick={onClose}>
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Pilih Ketua</p>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-500 mb-3">Agihkan <span className="font-bold text-slate-700">{voter.name}</span> ke kad:</p>
                    {kads.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">Tiada Kad 10. Cipta kad dahulu.</p>
                    ) : kads.map(kad => (
                        <button key={kad.id} type="button" disabled={assigning === kad.id}
                            onClick={() => handleAssign(kad)}
                            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-green-300 hover:bg-green-50 disabled:opacity-50">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <Icon name="user" className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800">{kad.name || 'Kad 10'}</p>
                                {kad.pemimpin_name && <p className="text-[10px] text-slate-400">Ketua: {kad.pemimpin_name}</p>}
                            </div>
                            <span className="rounded bg-green-600 px-2.5 py-1 text-[10px] font-bold text-white">{assigning === kad.id ? '...' : 'Pilih'}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Pagination({ voters, onPage }) {
    if (!voters || voters.last_page <= 1) return null;
    return (
        <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
                Papar {voters.from ?? 0} - {voters.to ?? 0} daripada {voters.total} rekod
            </p>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onPage(voters.current_page - 1)} disabled={!voters.prev_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Sebelum</button>
                {voters.links?.filter(l => /^\d+$/.test(String(l.label))).map(l => (
                    <button key={l.label} type="button" onClick={() => onPage(Number(l.label))}
                        className={'rounded-lg px-3 py-1.5 text-xs font-bold transition ' + (l.active ? 'bg-green-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:text-green-700')}>{l.label}</button>
                ))}
                <button type="button" onClick={() => onPage(voters.current_page + 1)} disabled={!voters.next_page_url}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Seterusnya</button>
            </div>
        </div>
    );
}

export default function SenaraiPemilih({ filters, voters, udms, localities, kads }) {
    const tabs = [
        { key: 'index', label: 'Kad Saya' },
        { key: 'senarai-pemilih', label: 'Senarai Pemilih' },
    ];
    const [form, setForm] = useState({
        udm: filters.udm || '',
        locality: filters.locality || '',
        q: filters.q || '',
    });
    const [localVoters, setLocalVoters] = useState(voters);
    const [selectedVoter, setSelectedVoter] = useState(null);

    const applyFilters = (next) => {
        const params = {};
        if (next.udm) params.udm = next.udm;
        if (next.locality) params.locality = next.locality;
        if (next.q) params.q = next.q;
        router.get(route('kad-ten.senarai-pemilih'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const updateFilter = (key, value) => {
        const next = { ...form, [key]: value };
        if (key === 'udm') next.locality = '';
        setForm(next);
        applyFilters(next);
    };

    const goToPage = (page) => {
        const params = {};
        if (form.udm) params.udm = form.udm;
        if (form.locality) params.locality = form.locality;
        if (form.q) params.q = form.q;
        params.page = page;
        router.get(route('kad-ten.senarai-pemilih'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleAssign = (voterId, kad) => {
        setLocalVoters(prev => ({
            ...prev,
            data: (prev.data ?? []).filter(v => v.id !== voterId),
            total: Math.max(0, (prev.total ?? 0) - 1),
        }));
        setSelectedVoter(null);
    };

    const rows = localVoters.data ?? [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="label-section">Kad 10</p>
                        <h2 className="mt-0.5 heading-lg">Senarai Pemilih (Culaan 2 & 3)</h2>
                    </div>
                </div>
            }
        >
            <Head title="Kad 10 - Senarai Pemilih" />

            <div className="mx-auto max-w-7xl space-y-3 px-3 sm:px-4 lg:px-6">
                <div className="flex gap-1 border-b border-slate-200 pb-0">
                    {tabs.map(t => (
                        <button key={t.key} type="button" onClick={() => {
                            if (t.key === 'index') router.get(route('kad-ten.index'));
                        }}
                            className={'rounded-t-lg px-4 py-2 text-xs font-bold transition ' + (t.key === 'senarai-pemilih' ? 'border-x border-t border-slate-200 bg-white text-green-700' : 'text-slate-500 hover:bg-green-50 hover:text-green-700')}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-xl border border-green-600 bg-white p-4 shadow-sm shadow-green-600/20">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_12rem_1fr]">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                            <select value={form.udm} onChange={e => updateFilter('udm', e.target.value)}
                                className="input-field mt-1.5">
                                <option value="">Semua UDM</option>
                                {udms.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                            <select value={form.locality} onChange={e => updateFilter('locality', e.target.value)}
                                className="input-field mt-1.5">
                                <option value="">Semua Lokaliti</option>
                                {localities.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Carian</label>
                            <div className="relative mt-1.5">
                                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={form.q} onChange={e => updateFilter('q', e.target.value)} placeholder="Nama / No KP..."
                                    className="input-field w-full pl-9" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-600">{localVoters.total ?? 0} pemilih ditemui</p>
                    </div>

                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sm font-bold text-slate-400">Tiada pemilih</p>
                            <p className="mt-1 text-xs text-slate-400">Semua pemilih yang layak sudah diagihkan atau tiada dalam skop.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="px-3 py-2 text-left font-bold text-slate-500 w-8">#</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">Nama</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">No KP</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">UDM</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">Lokaliti</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">Telefon</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-500">Cula</th>
                                        <th className="px-3 py-2 text-center font-bold text-slate-500 w-16">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((voter, i) => (
                                        <tr key={voter.id} className="hover:bg-green-50/50 transition">
                                            <td className="px-3 py-2 text-slate-400 font-bold">{(localVoters.from ?? 1) + i}</td>
                                            <td className="px-3 py-2">
                                                <p className="font-semibold text-slate-800">{voter.name}</p>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{voter.no_kp || voter.old_ic || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600">{voter.dm || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600">{voter.locality || '-'}</td>
                                            <td className="px-3 py-2 text-slate-600">{voter.phone_mobile || voter.phone_home || '-'}</td>
                                            <td className="px-3 py-2">
                                                <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                                    {voter.cula_display_label || voter.cula_code || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button type="button" onClick={() => setSelectedVoter(voter)}
                                                    className="rounded-lg bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-green-500 transition">
                                                    Pilih
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-4">
                        <Pagination voters={localVoters} onPage={goToPage} />
                    </div>
                </div>
            </div>

            {selectedVoter && (
                <AssignModal voter={selectedVoter} kads={kads} onAssign={handleAssign} onClose={() => setSelectedVoter(null)} />
            )}
        </AuthenticatedLayout>
    );
}
