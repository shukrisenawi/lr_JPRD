import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';

function UserPlusIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
    );
}

function ListIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="8" x2="21" y1="6" y2="6" />
            <line x1="8" x2="21" y1="12" y2="12" />
            <line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" />
            <line x1="3" x2="3.01" y1="12" y2="12" />
            <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
    );
}

function FormTab({ dms, localitiesByDm, culaCodes }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', no_kp: '', old_ic: '', phone_mobile: '', phone_home: '',
        address: '', dm: '', locality: '', gender: '', race: '',
        cula_code: '', cula_display_label: '',
    });

    const filteredLocalities = useMemo(() => {
        return data.dm ? (localitiesByDm[data.dm] ?? []) : [];
    }, [data.dm, localitiesByDm]);

    const handleCulaChange = (value) => {
        const match = culaCodes.find(c => c.cula_code === value);
        setData('cula_code', value);
        setData('cula_display_label', match ? match.cula_display_label : '');
    };

    const handleDmChange = (value) => {
        setData('dm', value);
        setData('locality', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('tambah-pemilih.store'), {
            onSuccess: () => {
                Swal.fire({ icon: 'success', title: 'Berjaya', text: 'Pemilih manual berjaya ditambah.', timer: 2000, showConfirmButton: false });
                reset();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="card space-y-3 p-3 sm:p-4">
            <div>
                <label className="label-field" htmlFor="name">Nama Pemilih <span className="text-rose-500">*</span></label>
                <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                    className="input-field w-full mt-0.5" placeholder="NAMA PENUH" />
                {errors.name && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.name}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="no_kp">No. K/P (Baru) <span className="text-rose-500">*</span></label>
                    <input id="no_kp" type="text" value={data.no_kp} onChange={e => setData('no_kp', e.target.value)}
                        className="input-field w-full mt-0.5" placeholder="900101025555" />
                    {errors.no_kp && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.no_kp}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="old_ic">No. K/P (Lama)</label>
                    <input id="old_ic" type="text" value={data.old_ic} onChange={e => setData('old_ic', e.target.value)}
                        className="input-field w-full mt-0.5" placeholder="A1234567" />
                    {errors.old_ic && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.old_ic}</p>}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="phone_mobile">Tel. Bimbit</label>
                    <input id="phone_mobile" type="text" value={data.phone_mobile} onChange={e => setData('phone_mobile', e.target.value)}
                        className="input-field w-full mt-0.5" placeholder="0123456789" />
                    {errors.phone_mobile && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.phone_mobile}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="phone_home">Tel. Rumah</label>
                    <input id="phone_home" type="text" value={data.phone_home} onChange={e => setData('phone_home', e.target.value)}
                        className="input-field w-full mt-0.5" placeholder="045123456" />
                    {errors.phone_home && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.phone_home}</p>}
                </div>
            </div>

            <div>
                <label className="label-field" htmlFor="address">Alamat</label>
                <textarea id="address" value={data.address} onChange={e => setData('address', e.target.value)}
                    className="input-field w-full mt-0.5" rows="1" placeholder="Alamat kediaman" />
                {errors.address && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.address}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="dm">UDM / DM</label>
                    <select id="dm" value={data.dm} onChange={e => handleDmChange(e.target.value)}
                        className="input-field w-full mt-0.5">
                        <option value="">-- Pilih UDM --</option>
                        {dms.map(dm => <option key={dm} value={dm}>{dm}</option>)}
                    </select>
                    {errors.dm && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.dm}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="locality">Lokaliti</label>
                    <select id="locality" value={data.locality} onChange={e => setData('locality', e.target.value)}
                        className="input-field w-full mt-0.5" disabled={!data.dm}>
                        <option value="">{data.dm ? '-- Pilih Lokaliti --' : '-- Pilih UDM dahulu --'}</option>
                        {filteredLocalities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    {errors.locality && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.locality}</p>}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="gender">Jantina</label>
                    <select id="gender" value={data.gender} onChange={e => setData('gender', e.target.value)}
                        className="input-field w-full mt-0.5">
                        <option value="">-- Pilih --</option>
                        <option value="Lelaki">Lelaki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                    {errors.gender && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.gender}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="race">Bangsa</label>
                    <select id="race" value={data.race} onChange={e => setData('race', e.target.value)}
                        className="input-field w-full mt-0.5">
                        <option value="">-- Pilih --</option>
                        <option value="Melayu">Melayu</option>
                        <option value="Cina">Cina</option>
                        <option value="India">India</option>
                        <option value="Lain-lain">Lain-lain</option>
                    </select>
                    {errors.race && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.race}</p>}
                </div>
            </div>

            <div>
                <label className="label-field" htmlFor="cula_code">Kod Cula</label>
                <select id="cula_code" value={data.cula_code} onChange={e => handleCulaChange(e.target.value)}
                    className="input-field w-full mt-0.5">
                    <option value="">-- Pilih Kod Cula --</option>
                    {culaCodes.map(c => <option key={c.cula_code} value={c.cula_code}>{c.cula_code} - {c.cula_display_label}</option>)}
                </select>
                {errors.cula_code && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.cula_code}</p>}
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
                <button type="submit" disabled={processing}
                    className="btn-primary inline-flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4" />
                    {processing ? 'Menyimpan...' : 'Tambah Pemilih'}
                </button>
                <button type="button" onClick={() => reset()}
                    className="rounded-md bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300">
                    Set Semula
                </button>
            </div>
        </form>
    );
}

function DetailModal({ voter, onClose }) {
    if (!voter) return null;
    const fields = [
        ['Nama', voter.name], ['No. IC Baru', voter.no_kp || '-'], ['No. IC Lama', voter.old_ic || '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['Alamat', voter.address || '-'], ['UDM', voter.dm || '-'], ['Lokaliti', voter.locality || '-'],
        ['Kod Cula', voter.cula_code || '-'], ['Jantina', voter.gender || '-'], ['Bangsa', voter.race || '-'],
        ['Dicipta Oleh', voter.creator?.name || '-'],
        ['Tarikh Daftar', voter.created_at ? new Date(voter.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-800">Detail Pemilih</h3>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>
                <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {fields.map(([l, v]) => (
                        <div key={l} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-green-700">{l}</p>
                            <p className="mt-0.5 text-xs font-medium text-slate-800">{v}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function EditModal({ voter, dms, localitiesByDm, culaCodes, onClose }) {
    const { data, setData, put, processing, errors } = useForm({
        name: voter.name || '',
        no_kp: voter.no_kp || '',
        old_ic: voter.old_ic || '',
        phone_mobile: voter.phone_mobile || '',
        phone_home: voter.phone_home || '',
        address: voter.address || '',
        dm: voter.dm || '',
        locality: voter.locality || '',
        gender: voter.gender || '',
        race: voter.race || '',
        cula_code: voter.cula_code || '',
    });

    const filteredLocalities = useMemo(() => {
        return data.dm ? (localitiesByDm[data.dm] ?? []) : [];
    }, [data.dm, localitiesByDm]);

    const handleDmChange = (value) => {
        setData('dm', value);
        setData('locality', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('tambah-pemilih.update', voter.id), {
            onSuccess: () => {
                Swal.fire({ icon: 'success', title: 'Berjaya', text: 'Pemilih berjaya dikemaskini.', timer: 1500, showConfirmButton: false });
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-800">Edit Pemilih</h3>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3 p-4">
                    <div>
                        <label className="label-field">Nama Pemilih <span className="text-rose-500">*</span></label>
                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="input-field w-full mt-1" />
                        {errors.name && <p className="mt-1 text-xs font-bold text-rose-500">{errors.name}</p>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="label-field">No. K/P (Baru)</label>
                            <input type="text" value={data.no_kp} onChange={e => setData('no_kp', e.target.value)} className="input-field w-full mt-1" />
                            {errors.no_kp && <p className="mt-1 text-xs font-bold text-rose-500">{errors.no_kp}</p>}
                        </div>
                        <div>
                            <label className="label-field">No. K/P (Lama)</label>
                            <input type="text" value={data.old_ic} onChange={e => setData('old_ic', e.target.value)} className="input-field w-full mt-1" />
                            {errors.old_ic && <p className="mt-1 text-xs font-bold text-rose-500">{errors.old_ic}</p>}
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="label-field">Tel. Bimbit</label>
                            <input type="text" value={data.phone_mobile} onChange={e => setData('phone_mobile', e.target.value)} className="input-field w-full mt-1" />
                        </div>
                        <div>
                            <label className="label-field">Tel. Rumah</label>
                            <input type="text" value={data.phone_home} onChange={e => setData('phone_home', e.target.value)} className="input-field w-full mt-1" />
                        </div>
                    </div>
                    <div>
                        <label className="label-field">Alamat</label>
                        <textarea value={data.address} onChange={e => setData('address', e.target.value)} className="input-field w-full mt-1" rows="2" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="label-field">UDM / DM</label>
                            <select value={data.dm} onChange={e => handleDmChange(e.target.value)} className="input-field w-full mt-1">
                                <option value="">-- Pilih UDM --</option>
                                {dms.map(dm => <option key={dm} value={dm}>{dm}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Lokaliti</label>
                            <select value={data.locality} onChange={e => setData('locality', e.target.value)} className="input-field w-full mt-1" disabled={!data.dm}>
                                <option value="">{data.dm ? '-- Pilih Lokaliti --' : '-- Pilih UDM dahulu --'}</option>
                                {filteredLocalities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="label-field">Jantina</label>
                            <select value={data.gender} onChange={e => setData('gender', e.target.value)} className="input-field w-full mt-1">
                                <option value="">-- Pilih --</option>
                                <option value="Lelaki">Lelaki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Bangsa</label>
                            <select value={data.race} onChange={e => setData('race', e.target.value)} className="input-field w-full mt-1">
                                <option value="">-- Pilih --</option>
                                <option value="Melayu">Melayu</option>
                                <option value="Cina">Cina</option>
                                <option value="India">India</option>
                                <option value="Lain-lain">Lain-lain</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label-field">Kod Cula</label>
                        <select value={data.cula_code} onChange={e => setData('cula_code', e.target.value)} className="input-field w-full mt-1">
                            <option value="">-- Pilih Kod Cula --</option>
                            {culaCodes.map(c => <option key={c.cula_code} value={c.cula_code}>{c.cula_code} - {c.cula_display_label}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="rounded-md bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300">Batal</button>
                        <button type="submit" disabled={processing} className="btn-primary text-xs">{processing ? 'Menyimpan...' : 'Simpan'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SenaraiTab({ manualVoters, dms, localitiesByDm, culaCodes }) {
    const { auth } = usePage().props;
    const currentUser = auth.user;
    const isMasterAdmin = currentUser.role?.is_master_admin === true;
    const canModify = (voter) => isMasterAdmin || voter.created_by === currentUser.id;

    const [detailVoter, setDetailVoter] = useState(null);
    const [editVoter, setEditVoter] = useState(null);

    const confirmDelete = (voter) => {
        Swal.fire({
            title: 'Padam Pemilih?',
            text: `Padam ${voter.name}? Tindakan ini tidak boleh dibatalkan.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Padam', cancelButtonText: 'Batal',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('tambah-pemilih.destroy', voter.id), {
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Berjaya', text: 'Pemilih berjaya dipadam.', timer: 1500, showConfirmButton: false });
                    },
                });
            }
        });
    };

    return (
        <>
            {detailVoter && <DetailModal voter={detailVoter} onClose={() => setDetailVoter(null)} />}
            {editVoter && <EditModal voter={editVoter} dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} onClose={() => setEditVoter(null)} />}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-3 py-2.5 font-bold text-slate-600">Nama</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">No. K/P (Baru)</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">Tel. Bimbit</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">Kod Cula</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">UDM</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">Lokaliti</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">Dicipta Oleh</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manualVoters.data.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-3 py-8 text-center text-sm text-slate-500">
                                        Tiada pemilih manual lagi.
                                    </td>
                                </tr>
                            ) : (
                                manualVoters.data.map(voter => (
                                    <tr key={voter.id} className="border-b border-slate-100 transition hover:bg-green-50/50">
                                        <td className="px-3 py-2.5 font-semibold text-slate-800">{voter.name}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.no_kp || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.phone_mobile || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.cula_code || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.dm || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.locality || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.creator?.name || '-'}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex gap-1">
                                                <button onClick={() => setDetailVoter(voter)}
                                                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100">Detail</button>
                                                {canModify(voter) && (
                                                    <>
                                                        <button onClick={() => setEditVoter(voter)}
                                                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-amber-600 transition hover:bg-amber-50">Edit</button>
                                                        <button onClick={() => confirmDelete(voter)}
                                                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50">Padam</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {manualVoters.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
                        <p className="text-xs text-slate-500">
                            {manualVoters.from}-{manualVoters.to} dari {manualVoters.total}
                        </p>
                        <div className="flex gap-1">
                            {manualVoters.links.filter(l => l.label !== '&laquo; Previous' && l.label !== 'Next &raquo;').map((link, i) => (
                                <Link key={i} href={link.url || '#'}
                                    className={`rounded px-2 py-1 text-xs font-bold transition ${link.active ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default function TambahPemilih() {
    const { dms = [], localitiesByDm = {}, manualVoters = { data: [] }, culaCodes = [] } = usePage().props;
    const [tab, setTab] = useState('tambah');

    const tabs = [
        { key: 'tambah', label: 'Tambah Pemilih', desc: 'Daftar pemilih baru secara manual.', icon: UserPlusIcon },
        { key: 'senarai', label: 'Senarai Pemilih Manual', desc: 'Lihat, edit dan padam pemilih manual.', icon: ListIcon },
    ];

    return (
        <AuthenticatedLayout header={
            <div>
                <p className="label-section">Pemilih Manual</p>
                <h2 className="mt-0.5 heading-lg">Urus pemilih manual</h2>
                <p className="text-muted mt-0.5">Tambah atau lihat senarai pemilih untuk kehadiran program.</p>
            </div>
        }>
            <Head title="Pemilih Manual" />
            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.key} type="button" onClick={() => setTab(t.key)}
                                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${tab === t.key ? 'border-green-300 bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md' : 'border-green-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50'}`}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tab === t.key ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span>
                                    <span className={`block text-xs font-bold uppercase tracking-wider ${tab === t.key ? 'text-white' : 'text-green-700'}`}>{t.label}</span>
                                    <span className={`mt-0.5 block text-xs ${tab === t.key ? 'text-green-100' : 'text-slate-500'}`}>{t.desc}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {tab === 'tambah' && <FormTab dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} />}
                {tab === 'senarai' && <SenaraiTab manualVoters={manualVoters} dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} />}
            </div>
        </AuthenticatedLayout>
    );
}
