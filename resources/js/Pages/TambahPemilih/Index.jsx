import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

function FormTab({ dms, localitiesByDm }) {
    const { flash } = usePage().props;
    const prevFlash = useRef(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', no_kp: '', old_ic: '', phone_mobile: '', phone_home: '',
        address: '', dm: '', locality: '', gender: '', race: '',
    });

    const filteredLocalities = useMemo(() => {
        return data.dm ? (localitiesByDm[data.dm] ?? []) : [];
    }, [data.dm, localitiesByDm]);

    useEffect(() => {
        if (flash?.success && flash.success !== prevFlash.current) {
            prevFlash.current = flash.success;
            Swal.fire({ icon: 'success', title: 'Berjaya', text: flash.success, timer: 2000, showConfirmButton: false });
            reset();
        }
    }, [flash?.success]);

    const handleDmChange = (value) => {
        setData('dm', value);
        setData('locality', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('tambah-pemilih.store'));
    };

    return (
        <form onSubmit={handleSubmit} className="card space-y-4 p-4 sm:p-6">
            <div>
                <label className="label-field" htmlFor="name">Nama Pemilih <span className="text-rose-500">*</span></label>
                <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                    className="input-field w-full mt-1" placeholder="NAMA PENUH" />
                {errors.name && <p className="mt-1 text-xs font-bold text-rose-500">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="no_kp">No. K/P (Baru) <span className="text-rose-500">*</span></label>
                    <input id="no_kp" type="text" value={data.no_kp} onChange={e => setData('no_kp', e.target.value)}
                        className="input-field w-full mt-1" placeholder="900101025555" />
                    {errors.no_kp && <p className="mt-1 text-xs font-bold text-rose-500">{errors.no_kp}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="old_ic">No. K/P (Lama)</label>
                    <input id="old_ic" type="text" value={data.old_ic} onChange={e => setData('old_ic', e.target.value)}
                        className="input-field w-full mt-1" placeholder="A1234567" />
                    {errors.old_ic && <p className="mt-1 text-xs font-bold text-rose-500">{errors.old_ic}</p>}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="phone_mobile">Tel. Bimbit</label>
                    <input id="phone_mobile" type="text" value={data.phone_mobile} onChange={e => setData('phone_mobile', e.target.value)}
                        className="input-field w-full mt-1" placeholder="0123456789" />
                    {errors.phone_mobile && <p className="mt-1 text-xs font-bold text-rose-500">{errors.phone_mobile}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="phone_home">Tel. Rumah</label>
                    <input id="phone_home" type="text" value={data.phone_home} onChange={e => setData('phone_home', e.target.value)}
                        className="input-field w-full mt-1" placeholder="045123456" />
                    {errors.phone_home && <p className="mt-1 text-xs font-bold text-rose-500">{errors.phone_home}</p>}
                </div>
            </div>

            <div>
                <label className="label-field" htmlFor="address">Alamat</label>
                <textarea id="address" value={data.address} onChange={e => setData('address', e.target.value)}
                    className="input-field w-full mt-1" rows="2" placeholder="Alamat kediaman" />
                {errors.address && <p className="mt-1 text-xs font-bold text-rose-500">{errors.address}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="dm">UDM / DM</label>
                    <select id="dm" value={data.dm} onChange={e => handleDmChange(e.target.value)}
                        className="input-field w-full mt-1">
                        <option value="">-- Pilih UDM --</option>
                        {dms.map(dm => <option key={dm} value={dm}>{dm}</option>)}
                    </select>
                    {errors.dm && <p className="mt-1 text-xs font-bold text-rose-500">{errors.dm}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="locality">Lokaliti</label>
                    <select id="locality" value={data.locality} onChange={e => setData('locality', e.target.value)}
                        className="input-field w-full mt-1" disabled={!data.dm}>
                        <option value="">{data.dm ? '-- Pilih Lokaliti --' : '-- Pilih UDM dahulu --'}</option>
                        {filteredLocalities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    {errors.locality && <p className="mt-1 text-xs font-bold text-rose-500">{errors.locality}</p>}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="gender">Jantina</label>
                    <select id="gender" value={data.gender} onChange={e => setData('gender', e.target.value)}
                        className="input-field w-full mt-1">
                        <option value="">-- Pilih --</option>
                        <option value="Lelaki">Lelaki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                    {errors.gender && <p className="mt-1 text-xs font-bold text-rose-500">{errors.gender}</p>}
                </div>
                <div>
                    <label className="label-field" htmlFor="race">Bangsa</label>
                    <select id="race" value={data.race} onChange={e => setData('race', e.target.value)}
                        className="input-field w-full mt-1">
                        <option value="">-- Pilih --</option>
                        <option value="Melayu">Melayu</option>
                        <option value="Cina">Cina</option>
                        <option value="India">India</option>
                        <option value="Lain-lain">Lain-lain</option>
                    </select>
                    {errors.race && <p className="mt-1 text-xs font-bold text-rose-500">{errors.race}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
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

function SenaraiTab({ manualVoters }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-3 py-2.5 font-bold text-slate-600">Nama</th>
                            <th className="px-3 py-2.5 font-bold text-slate-600">No. K/P (Baru)</th>
                            <th className="px-3 py-2.5 font-bold text-slate-600">Tel. Bimbit</th>
                            <th className="px-3 py-2.5 font-bold text-slate-600">UDM</th>
                            <th className="px-3 py-2.5 font-bold text-slate-600">Lokaliti</th>
                            <th className="px-3 py-2.5 font-bold text-slate-600">Daftar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manualVoters.data.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-8 text-center text-sm text-slate-500">
                                    Tiada pemilih manual lagi.
                                </td>
                            </tr>
                        ) : (
                            manualVoters.data.map(voter => (
                                <tr key={voter.id} className="border-b border-slate-100 transition hover:bg-green-50/50">
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">{voter.name}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{voter.no_kp || '-'}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{voter.phone_mobile || '-'}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{voter.dm || '-'}</td>
                                    <td className="px-3 py-2.5 text-slate-600">{voter.locality || '-'}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{voter.created_at ? new Date(voter.created_at).toLocaleDateString('ms-MY') : '-'}</td>
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
    );
}

export default function TambahPemilih() {
    const { dms = [], localitiesByDm = {}, manualVoters = { data: [] } } = usePage().props;
    const [tab, setTab] = useState('tambah');

    const tabs = [
        { key: 'tambah', label: 'Tambah Pemilih', icon: UserPlusIcon },
        { key: 'senarai', label: 'Senarai Pemilih', icon: ListIcon },
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
            <div className="mx-auto max-w-3xl px-3 sm:px-4 lg:px-6">
                <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition ${tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <Icon className="h-4 w-4" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'tambah' && <FormTab dms={dms} localitiesByDm={localitiesByDm} />}
                {tab === 'senarai' && <SenaraiTab manualVoters={manualVoters} />}
            </div>
        </AuthenticatedLayout>
    );
}
