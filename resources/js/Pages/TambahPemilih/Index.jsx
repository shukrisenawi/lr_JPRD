import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
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

export default function TambahPemilih() {
    const { dms = [], localitiesByDm = {} } = usePage().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        no_kp: '',
        old_ic: '',
        phone_mobile: '',
        phone_home: '',
        address: '',
        dm: '',
        locality: '',
        gender: '',
        race: '',
    });

    const filteredLocalities = useMemo(() => {
        return data.dm ? (localitiesByDm[data.dm] ?? []) : [];
    }, [data.dm, localitiesByDm]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === '1') {
            Swal.fire({ icon: 'success', title: 'Berjaya', text: 'Pemilih manual berjaya ditambah.', timer: 2000, showConfirmButton: false });
            reset();
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleDmChange = (value) => {
        setData('dm', value);
        setData('locality', '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('tambah-pemilih.store'));
    };

    return (
        <AuthenticatedLayout header={
            <div>
                <p className="label-section">Tambah Pemilih</p>
                <h2 className="mt-0.5 heading-lg">Daftar pemilih secara manual</h2>
                <p className="text-muted mt-0.5">Pemilih ini hanya digunakan untuk kehadiran program, bukan untuk culaan.</p>
            </div>
        }>
            <Head title="Tambah Pemilih" />
            <div className="mx-auto max-w-2xl px-3 sm:px-4 lg:px-6">
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
            </div>
        </AuthenticatedLayout>
    );
}
