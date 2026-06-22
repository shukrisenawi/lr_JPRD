import AvatarLightbox from '@/Components/AvatarLightbox';
import CropModal from '@/Components/CropModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
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

function FormTab({ dms, localitiesByDm, culaCodes, createdVoter }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', no_kp: '', old_ic: '', no_ahli: '', phone_mobile: '', phone_home: '',
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

    const avatarRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [cropFile, setCropFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCropFile(file);
        e.target.value = '';
    };

    const handleAvatarUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        setCropFile(null);
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', createdVoter.id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.success) {
                createdVoter.avatar_url = data.avatar_url;
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
        <form onSubmit={handleSubmit} className="card space-y-3 p-3 sm:p-4">
            <div>
                <label className="label-field" htmlFor="name">Nama Pemilih <span className="text-rose-500">*</span></label>
                <input id="name" type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                    className="input-field w-full mt-0.5" placeholder="NAMA PENUH" />
                {errors.name && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.name}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label-field" htmlFor="no_kp">No KP <span className="text-rose-500">*</span></label>
                    <input id="no_kp" type="text" value={data.no_kp} onChange={e => setData('no_kp', e.target.value)}
                        className="input-field w-full mt-0.5" placeholder="900101025555" />
                    {errors.no_kp && <p className="mt-0.5 text-xs font-bold text-rose-500">{errors.no_kp}</p>}
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
                    <label className="label-field" htmlFor="dm">UDM</label>
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
        {createdVoter && (
            <div className="card mt-3 space-y-3 p-3 sm:p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">Muat Naik Avatar</p>
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        {createdVoter.avatar_url ? (
                            <img src={createdVoter.avatar_url} alt="" className="h-12 w-12 cursor-pointer rounded-full object-cover border border-slate-200" onClick={() => setLightboxSrc(createdVoter.avatar_url)} />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 border border-slate-200">
                                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                        )}
                        {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{createdVoter.name}</p>
                        <p className="text-xs text-slate-500">{createdVoter.no_kp || '-'}</p>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => avatarRef.current?.click()} disabled={uploading} className="shrink-0 rounded-md border border-green-300 bg-white p-2 text-green-700 transition hover:bg-green-50 disabled:opacity-50" title="Muat Naik Avatar">{uploading ? <span className="text-xs font-bold">...</span> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>}</button>
                </div>
            </div>
        )}
        {cropFile && (
            <CropModal file={cropFile} onCrop={handleAvatarUpload} onClose={() => setCropFile(null)} />
        )}
    </>
    );
}

function DetailModal({ voter, onClose }) {
    if (!voter) return null;
    const avatarRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [cropFile, setCropFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCropFile(file);
        e.target.value = '';
    };

    const handleAvatarUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        setCropFile(null);
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', voter.id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.success) {
                voter.avatar_url = data.avatar_url;
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploading(false);
        }
    };

    const displayAddress = (voter.alamat_kediaman && voter.alamat_kediaman !== '-' && voter.alamat_kediaman !== '')
        ? voter.alamat_kediaman
        : (voter.alamat_kp && voter.alamat_kp !== '-' && voter.alamat_kp !== '' ? voter.alamat_kp : voter.address);

    const fields = [
        ['Nama', voter.name], ['No KP', voter.no_kp || '-'],
        ['No. Ahli', voter.no_ahli || '-'], ['Tel. Bimbit', voter.phone_mobile || '-'], ['Tel. Rumah', voter.phone_home || '-'],
        ['Alamat', displayAddress], ['UDM', voter.dm || '-'], ['Lokaliti', voter.locality || '-'],
        ['No. Rumah', voter.no_rumah || '-'], ['No. Siri', voter.no_siri || '-'],
        ['Kod Cula', voter.cula_code || '-'], ['Bangsa', voter.race || '-'],
        ['Catatan', voter.catatan || '-'],
        ['Dicipta Oleh', voter.creator?.name || '-'],
        ['Tarikh Daftar', voter.created_at ? new Date(voter.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                    <div className="relative shrink-0">
                        {voter.avatar_url ? (
                            <img src={voter.avatar_url} alt="" className="h-10 w-10 cursor-pointer rounded-full object-cover border border-slate-200" onClick={() => setLightboxSrc(voter.avatar_url)} />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 border border-slate-200">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                        )}
                        {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
                    <input ref={avatarRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <button onClick={() => avatarRef.current?.click()} disabled={uploading} className="absolute -bottom-1 -right-1 rounded-full border border-green-200 bg-white p-0.5 text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-50" title="Muat Naik Avatar">{uploading ? <span className="text-[10px] font-bold">...</span> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>}</button>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{voter.name}</h3>
                        <p className="text-xs text-slate-500">{voter.dm || '-'}</p>
                    </div>
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
            {cropFile && (
                <CropModal file={cropFile} onCrop={handleAvatarUpload} onClose={() => setCropFile(null)} />
            )}
        </div>
    );
}

function EditModal({ voter, dms, localitiesByDm, culaCodes, onClose, canEditNoAhli }) {
    const { data, setData, put, processing, errors } = useForm({
        name: voter.name || '',
        no_kp: voter.no_kp || '',
        old_ic: voter.old_ic || '',
        no_ahli: voter.no_ahli || '',
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
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <h3 className="text-sm font-bold text-slate-800">Edit Pemilih</h3>
                    <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-[6px] p-[11px]">
                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                        className="input-field w-full py-[5px] text-xs font-bold uppercase" placeholder="NAMA PENUH *" />
                    {errors.name && <p className="text-xs font-bold text-rose-500">{errors.name}</p>}

                    <div className="grid gap-y-[6px] gap-x-1 sm:grid-cols-3">
                        <div>
                            <label className="label-field">No KP</label>
                            <input type="text" value={data.no_kp} onChange={e => setData('no_kp', e.target.value)} className="input-field w-full py-[5px] text-xs" placeholder="900101025555" />
                            {errors.no_kp && <p className="text-xs font-bold text-rose-500">{errors.no_kp}</p>}
                        </div>
                        {canEditNoAhli && (
                            <div>
                                <label className="label-field">No. Ahli</label>
                                <input type="text" value={data.no_ahli} onChange={e => setData('no_ahli', e.target.value)} className="input-field w-full py-[5px] text-xs" placeholder="A0001" />
                            </div>
                        )}
                    </div>

                    <div className="grid gap-y-[6px] gap-x-1 sm:grid-cols-2">
                        <div>
                            <label className="label-field">Tel. Bimbit</label>
                            <input type="text" value={data.phone_mobile} onChange={e => setData('phone_mobile', e.target.value)} className="input-field w-full py-[5px] text-xs" placeholder="0123456789" />
                        </div>
                        <div>
                            <label className="label-field">Tel. Rumah</label>
                            <input type="text" value={data.phone_home} onChange={e => setData('phone_home', e.target.value)} className="input-field w-full py-[5px] text-xs" placeholder="045123456" />
                        </div>
                    </div>

                    <textarea value={data.address} onChange={e => setData('address', e.target.value)}
                        className="input-field w-full py-[5px] text-xs" rows="3" placeholder="Alamat" />

                    <div className="grid gap-y-[6px] gap-x-1 sm:grid-cols-2">
                        <div>
                            <label className="label-field">UDM</label>
                            <select value={data.dm} onChange={e => handleDmChange(e.target.value)} className="input-field w-full py-[5px] text-xs">
                                <option value="">-- Pilih UDM --</option>
                                {dms.map(dm => <option key={dm} value={dm}>{dm}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Lokaliti</label>
                            <select value={data.locality} onChange={e => setData('locality', e.target.value)} className="input-field w-full py-[5px] text-xs" disabled={!data.dm}>
                                <option value="">{data.dm ? '-- Pilih Lokaliti --' : '-- Pilih UDM dahulu --'}</option>
                                {filteredLocalities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-y-[6px] gap-x-1 sm:grid-cols-3">
                        <div>
                            <label className="label-field">Jantina</label>
                            <select value={data.gender} onChange={e => setData('gender', e.target.value)} className="input-field w-full py-[5px] text-xs">
                                <option value="">-- Pilih --</option>
                                <option value="Lelaki">Lelaki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Bangsa</label>
                            <select value={data.race} onChange={e => setData('race', e.target.value)} className="input-field w-full py-[5px] text-xs">
                                <option value="">-- Pilih --</option>
                                <option value="Melayu">Melayu</option>
                                <option value="Cina">Cina</option>
                                <option value="India">India</option>
                                <option value="Lain-lain">Lain-lain</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-field">Kod Cula</label>
                            <select value={data.cula_code} onChange={e => setData('cula_code', e.target.value)} className="input-field w-full py-[5px] text-xs">
                                <option value="">-- Pilih --</option>
                                {culaCodes.map(c => <option key={c.cula_code} value={c.cula_code}>{c.cula_code} - {c.cula_display_label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-center gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-md bg-slate-200 px-3 py-[5px] text-xs font-bold text-slate-700 hover:bg-slate-300">Batal</button>
                        <button type="submit" disabled={processing} className="btn-primary text-xs py-[5px]">{processing ? 'Menyimpan...' : 'Simpan'}</button>
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
    const canEditNoAhli = currentUser?.allowed_modules?.includes('kemaskini-no-ahli');
    const canModify = (voter) => isMasterAdmin || voter.created_by === currentUser.id;

    const [detailVoter, setDetailVoter] = useState(null);
    const [editVoter, setEditVoter] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState({});
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const avatarInputRefs = useRef({});

    const handleAvatarUpload = async (voter, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(prev => ({ ...prev, [voter.id]: true }));
        try {
            const form = new FormData();
            form.append('avatar', file);
            const res = await fetch(route('pemilih.avatar.upload', voter.id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content, 'Accept': 'application/json' },
                body: form,
            });
            if (!res.ok) throw new Error('Upload gagal');
            const data = await res.json();
            if (data.success) {
                voter.avatar_url = data.avatar_url;
            }
        } catch {
            alert('Gagal muat naik gambar.');
        } finally {
            setUploadingAvatar(prev => ({ ...prev, [voter.id]: false }));
        }
    };

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
            {editVoter && <EditModal voter={editVoter} dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} onClose={() => setEditVoter(null)} canEditNoAhli={canEditNoAhli} />}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-3 py-2.5 font-bold text-slate-600">Nama</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">No KP</th>
                                <th className="px-3 py-2.5 font-bold text-slate-600">No. Ahli</th>
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
                                    <td colSpan="9" className="px-3 py-8 text-center text-sm text-slate-500">
                                        Tiada pemilih manual lagi.
                                    </td>
                                </tr>
                            ) : (
                                manualVoters.data.map(voter => (
                                    <tr key={voter.id} className="border-b border-slate-100 transition hover:bg-green-50/50">
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                {voter.avatar_url ? (
                                                    <img src={voter.avatar_url} alt="" className="h-6 w-6 shrink-0 cursor-pointer rounded-full object-cover border border-slate-200" onClick={() => setLightboxSrc(voter.avatar_url)} />
                                                ) : null}
                                                {lightboxSrc && <AvatarLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
                                                <span className="font-semibold text-slate-800">{voter.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.no_kp || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.no_ahli || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.phone_mobile || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.cula_code || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.dm || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.locality || '-'}</td>
                                        <td className="px-3 py-2.5 text-slate-600">{voter.creator?.name || '-'}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1">
                                                <input ref={(el) => { avatarInputRefs.current[voter.id] = el; }} type="file" accept="image/*" onChange={(e) => handleAvatarUpload(voter, e)} className="hidden" />
                                                <button onClick={() => avatarInputRefs.current[voter.id]?.click()} disabled={uploadingAvatar[voter.id]} className="rounded border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-green-50 disabled:opacity-50" title="Muat Naik Avatar">{uploadingAvatar[voter.id] ? <span className="text-[10px] font-bold">...</span> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>}</button>
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
    const { dms = [], localitiesByDm = {}, manualVoters = { data: [] }, culaCodes = [], created_voter: createdVoter } = usePage().props;
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

                {tab === 'tambah' && <FormTab dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} createdVoter={createdVoter} />}
                {tab === 'senarai' && <SenaraiTab manualVoters={manualVoters} dms={dms} localitiesByDm={localitiesByDm} culaCodes={culaCodes} />}
            </div>
        </AuthenticatedLayout>
    );
}
