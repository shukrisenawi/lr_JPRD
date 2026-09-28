import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const emptyVehicle = (udm = '') => ({
    udm,
    no_plate: '',
    jenis_kenderaan: '',
    nama_pemandu: '',
    no_tel: '',
    lokaliti: '',
});

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        car: <><path d="M5 17h14" /><path d="M6 17v2" /><path d="M18 17v2" /><path d="M4 17l1.5-6h13L20 17" /><path d="M7 11l1.5-4h7L17 11" /><circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
        layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
        list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
    };

    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function VehicleRow({ vehicle, onEdit, onDelete }) {
    return (
        <div className="flex flex-col gap-3 px-4 py-3 transition hover:bg-green-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon name="car" className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="font-mono text-sm font-black tracking-wide text-slate-900">{vehicle.no_plate}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{vehicle.jenis_kenderaan}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-700">{vehicle.nama_pemandu || 'Pemandu belum ditetapkan'}</p>
                    {(vehicle.no_tel || vehicle.lokaliti) && <p className="mt-0.5 truncate text-[10px] text-slate-400">{[vehicle.no_tel, vehicle.lokaliti].filter(Boolean).join(' · ')}</p>}
                </div>
            </div>
            <div className="pointer-events-auto flex shrink-0 gap-2 pl-12 sm:pl-0">
                <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(vehicle); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-50">
                    <Icon name="edit" className="h-3.5 w-3.5" />Edit
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(vehicle); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">
                    <Icon name="trash" className="h-3.5 w-3.5" />Padam
                </button>
            </div>
        </div>
    );
}

function UdmCard({ summary, showVehicles, onSelect, onEdit, onDelete }) {
    const selectCard = () => onSelect(summary.udm);

    return (
        <section
            className="relative cursor-pointer overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
        >
            <a href={route('kenderaan.index', { udm: summary.udm })} onClick={(event) => { event.preventDefault(); selectCard(); }} aria-label={`Lihat kenderaan ${summary.udm}`} className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500">
                <span className="sr-only">Lihat kenderaan {summary.udm}</span>
            </a>

            <div className="relative z-10 pointer-events-none">
                <div className="flex w-full items-start justify-between gap-3 border-b border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-4 text-left transition hover:from-green-100 hover:to-emerald-100">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm shadow-green-600/20">
                            <Icon name="layers" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-green-700">UDM</p>
                            <h2 className="truncate text-base font-black text-slate-900">{summary.udm}</h2>
                        </div>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                        <p className="text-lg font-black leading-none text-green-700">{summary.count}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Kenderaan</p>
                    </div>
                </div>

                {showVehicles && (summary.vehicles.length > 0 ? (
                    <div className="grid gap-2 p-2 sm:grid-cols-2">
                        {summary.vehicles.map((vehicle) => <VehicleRow key={vehicle.id} vehicle={vehicle} onEdit={onEdit} onDelete={onDelete} />)}
                    </div>
                ) : (
                    <div className="px-4 py-7 text-center">
                        <p className="text-xs font-bold text-slate-500">Belum ada kenderaan</p>
                        <p className="mt-1 text-[11px] text-slate-400">Tambah rekod pertama untuk UDM ini.</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function Index({ vehicles = [], udms = [], udmSummaries = [], selectedUdm = '', defaultUdm = '', canSelectAll = true, localitiesByUdm = {} }) {
    const form = useForm(emptyVehicle(defaultUdm || selectedUdm));
    const [editing, setEditing] = useState(null);
    const [driverSearch, setDriverSearch] = useState('');
    const [driverSuggestions, setDriverSuggestions] = useState([]);
    const [searchingDrivers, setSearchingDrivers] = useState(false);
    const driverSearchController = useRef(null);
    const driverSearchRequestId = useRef(0);
    const { setData } = form;

    useEffect(() => {
        if (!editing) {
            setData('udm', selectedUdm || defaultUdm || '');
        }
    }, [selectedUdm, defaultUdm, editing, setData]);

    useEffect(() => () => driverSearchController.current?.abort(), []);

    const openEdit = (vehicle) => {
        setEditing(vehicle);
        form.clearErrors();
        form.setData({
            udm: vehicle.udm,
            no_plate: vehicle.no_plate,
            jenis_kenderaan: vehicle.jenis_kenderaan,
            nama_pemandu: vehicle.nama_pemandu ?? '',
            no_tel: vehicle.no_tel ?? '',
            lokaliti: vehicle.lokaliti ?? '',
        });
    };

    const closeForm = () => {
        setEditing(null);
        form.clearErrors();
        form.setData({
            udm: selectedUdm || defaultUdm || '',
            no_plate: '',
            jenis_kenderaan: '',
            nama_pemandu: '',
            no_tel: '',
            lokaliti: '',
        });
    };

    const preferredDriverUdm = selectedUdm || defaultUdm || form.data.udm;

    const searchDriverOptions = async (value) => {
        driverSearchController.current?.abort();
        const requestId = ++driverSearchRequestId.current;
        const query = value.trim();

        if (query.length < 2) {
            setDriverSuggestions([]);
            setSearchingDrivers(false);
            return;
        }

        const controller = new AbortController();
        driverSearchController.current = controller;
        setSearchingDrivers(true);

        try {
            const params = new URLSearchParams({ q: query });
            if (preferredDriverUdm) params.set('udm', preferredDriverUdm);
            const response = await fetch(`${route('kenderaan.pemandu-search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
            const contentType = response.headers.get('content-type') ?? '';
            if (!response.ok || !contentType.includes('application/json')) throw new Error();

            const payload = await response.json();
            if (driverSearchRequestId.current === requestId) setDriverSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError' && driverSearchRequestId.current === requestId) setDriverSuggestions([]);
        } finally {
            if (driverSearchRequestId.current === requestId) setSearchingDrivers(false);
        }
    };

    const selectDriver = (driver) => {
        driverSearchController.current?.abort();
        driverSearchRequestId.current += 1;
        form.setData('nama_pemandu', driver.name ?? '');
        form.setData('no_tel', driver.phone_mobile || driver.phone_home || '');
        form.setData('lokaliti', driver.locality ?? '');
        setDriverSuggestions([]);
        setSearchingDrivers(false);
    };

    const submit = (event) => {
        event.preventDefault();
        const activeUdmFilter = selectedUdm || defaultUdm;
        const options = {
            preserveScroll: true,
            onSuccess: closeForm,
        };
        form.transform((data) => ({ ...data, _redirect_udm: activeUdmFilter }));

        if (editing) {
            form.put(route('kenderaan.update', editing.id), options);
        } else {
            form.post(activeUdmFilter ? route('kenderaan.store', { udm: activeUdmFilter }) : route('kenderaan.store'), options);
        }
    };

    const deleteVehicle = (vehicle) => {
        if (!window.confirm(`Padam kenderaan ${vehicle.no_plate}?`)) return;
        router.delete(route('kenderaan.destroy', vehicle.id), { preserveScroll: true });
    };

    const selectUdm = (udm) => {
        router.get(route('kenderaan.index'), { udm }, {
            preserveScroll: false,
            preserveState: false,
            replace: true,
        });
    };

    const changeUdm = (event) => {
        const value = event.target.value;
        router.get(route('kenderaan.index'), value ? { udm: value } : {}, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    };

    const changeFormUdm = (event) => {
        form.setData('udm', event.target.value);
        form.setData('lokaliti', '');
    };

    const normalizedDriverSearch = driverSearch.trim().toLowerCase();
    const visibleSummaries = normalizedDriverSearch === ''
        ? udmSummaries
        : udmSummaries
            .map((summary) => {
                const matchedVehicles = summary.vehicles.filter((vehicle) => (vehicle.nama_pemandu || '').toLowerCase().includes(normalizedDriverSearch));

                return { ...summary, count: matchedVehicles.length, vehicles: matchedVehicles };
            })
            .filter((summary) => summary.vehicles.length > 0);
    const visibleVehicleCount = normalizedDriverSearch === ''
        ? vehicles.length
        : visibleSummaries.reduce((total, summary) => total + summary.count, 0);
    const localitiesForSelectedUdm = [...new Set([...(localitiesByUdm[form.data.udm] ?? []), form.data.lokaliti].filter(Boolean))].sort((left, right) => left.localeCompare(right));

    return (
        <AuthenticatedLayout>
            <Head title="Kenderaan" />

            <div className="mx-auto max-w-7xl space-y-5 px-3 sm:px-4 lg:px-6">
                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-green-900 to-emerald-800 p-5 text-white shadow-lg shadow-green-900/10 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-200">Operasi UDM</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Kenderaan</h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-50">Urus nombor kenderaan, jenis kenderaan dan maklumat pemandu untuk setiap UDM.</p>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-100">Jumlah kenderaan</p><p className="mt-0.5 text-lg font-black">{visibleVehicleCount}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-100">UDM dipaparkan</p><p className="mt-0.5 text-lg font-black">{visibleSummaries.length}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-100">Paparan</p><p className="mt-0.5 text-lg font-black">{selectedUdm || 'Semua UDM'}</p></div>
                    </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
                    <section className="order-2 rounded-2xl border border-green-100 bg-white p-4 shadow-sm sm:p-5 lg:order-1">
                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-green-700">Ringkasan mengikut UDM</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Senarai kenderaan</h2>
                                <p className="mt-1 text-xs text-slate-500">Pilih satu UDM untuk melihat rekod kenderaannya.</p>
                            </div>
                            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(13rem,1fr)_14rem]">
                                <div>
                                    <InputLabel htmlFor="kenderaan-carian-pemandu" value="Cari nama pemandu" />
                                    <input id="kenderaan-carian-pemandu" type="search" value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Contoh: Ahmad bin Ali" className="input-field mt-1.5" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="kenderaan-filter-udm" value="Tapis UDM" />
                                    <select id="kenderaan-filter-udm" value={selectedUdm} onChange={changeUdm} disabled={!canSelectAll} className="input-field mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100">
                                        {canSelectAll && <option value="">Semua UDM</option>}
                                        {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={`mt-4 grid gap-4 ${selectedUdm === '' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                            {visibleSummaries.length > 0 ? visibleSummaries.map((summary) => <UdmCard key={summary.udm} summary={summary} showVehicles={selectedUdm !== ''} onSelect={selectUdm} onEdit={openEdit} onDelete={deleteVehicle} />) : (
                                <div className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50/50 px-5 py-12 text-center md:col-span-2">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-green-600 shadow-sm"><Icon name="list" className="h-6 w-6" /></div>
                                    <h3 className="mt-3 text-sm font-black text-slate-800">{normalizedDriverSearch ? 'Tiada kenderaan ditemui' : 'Belum ada UDM'}</h3>
                                    <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{normalizedDriverSearch ? `Tiada nama pemandu sepadan dengan "${driverSearch.trim()}".` : 'UDM aktif akan muncul di sini apabila data pemilih tersedia.'}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="relative z-30 order-1 overflow-visible rounded-2xl border border-emerald-200 bg-white shadow-sm lg:order-2">
                        <div className="rounded-t-2xl bg-gradient-to-br from-emerald-50 to-green-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><Icon name={editing ? 'edit' : 'plus'} className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{editing ? 'Kemaskini rekod' : 'Rekod baharu'}</p>
                                    <h2 className="mt-0.5 text-base font-black text-slate-900">{editing ? 'Ubah kenderaan' : 'Tambah kenderaan'}</h2>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="space-y-4 p-5">
                            <div>
                                <InputLabel htmlFor="kenderaan-udm" value="UDM" />
                                <select id="kenderaan-udm" value={form.data.udm} onChange={changeFormUdm} disabled={!canSelectAll} className="input-field mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100" required>
                                    <option value="">Pilih UDM</option>
                                    {udms.map((udm) => <option key={udm} value={udm}>{udm}</option>)}
                                </select>
                                <InputError message={form.errors.udm} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="kenderaan-no-plate">No. Kenderaan <span className="text-rose-500">*</span></InputLabel>
                                <input id="kenderaan-no-plate" type="text" className="input-field mt-1.5 font-mono uppercase" placeholder="Contoh: KCA 1234" value={form.data.no_plate} onChange={(event) => form.setData('no_plate', event.target.value.toUpperCase())} required />
                                <InputError message={form.errors.no_plate} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="kenderaan-jenis" value="Jenis Kenderaan" />
                                <input id="kenderaan-jenis" type="text" className="input-field mt-1.5" placeholder="Contoh: MPV, Sedan, Van" value={form.data.jenis_kenderaan} onChange={(event) => form.setData('jenis_kenderaan', event.target.value)} />
                                <InputError message={form.errors.jenis_kenderaan} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="kenderaan-pemandu" value="Nama Pemandu" />
                                <div className="relative">
                                    <input id="kenderaan-pemandu" type="text" autoComplete="off" className="input-field mt-1.5" placeholder="Taip nama pemilih untuk mencari" value={form.data.nama_pemandu} onFocus={() => searchDriverOptions(form.data.nama_pemandu)} onBlur={() => window.setTimeout(() => setDriverSuggestions([]), 150)} onChange={(event) => { form.setData('nama_pemandu', event.target.value); searchDriverOptions(event.target.value); }} />
                                    {searchingDrivers && <p className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">Mencari pemilih...</p>}
                                    {!searchingDrivers && driverSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                            {driverSuggestions.map((driver) => (
                                                <button key={driver.id} type="button" onClick={() => selectDriver(driver)} className="block w-full border-b border-slate-100 px-3 py-2.5 text-left transition last:border-0 hover:bg-green-50">
                                                    <span className={`block truncate text-xs font-bold ${preferredDriverUdm && driver.dm?.toLowerCase() === preferredDriverUdm.toLowerCase() ? 'text-green-700' : 'text-slate-800'}`}>{driver.name}</span>
                                                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">{driver.is_manual ? 'Pemilih manual' : 'Data pemilih'}{driver.no_kp ? ` · ${driver.no_kp}` : ''}</span>
                                                    {(driver.phone_mobile || driver.phone_home) && <span className="mt-0.5 block truncate text-[10px] text-green-700">Tel: {driver.phone_mobile || driver.phone_home}</span>}
                                                    {(driver.dm || driver.locality) && <span className="mt-0.5 block truncate text-[10px] text-slate-400">{[driver.dm, driver.locality].filter(Boolean).join(' · ')}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <InputError message={form.errors.nama_pemandu} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="kenderaan-no-tel" value="No. Telefon" />
                                <input id="kenderaan-no-tel" type="tel" className="input-field mt-1.5" placeholder="Contoh: 012-3456789" value={form.data.no_tel} onChange={(event) => form.setData('no_tel', event.target.value)} />
                                <InputError message={form.errors.no_tel} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="kenderaan-lokaliti" value="Lokaliti" />
                                <select id="kenderaan-lokaliti" value={form.data.lokaliti} onChange={(event) => form.setData('lokaliti', event.target.value)} disabled={!form.data.udm || localitiesForSelectedUdm.length === 0} className="input-field mt-1.5 disabled:cursor-not-allowed disabled:bg-slate-100">
                                    <option value="">{!form.data.udm ? 'Pilih UDM dahulu' : localitiesForSelectedUdm.length === 0 ? 'Tiada lokaliti tersedia' : 'Pilih lokaliti'}</option>
                                    {localitiesForSelectedUdm.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
                                </select>
                                <InputError message={form.errors.lokaliti} className="mt-1" />
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                                {editing && <button type="button" onClick={closeForm} className="btn-outline w-full sm:w-auto">Batal</button>}
                                <PrimaryButton disabled={form.processing} className="w-full justify-center gap-1.5 sm:w-auto"><Icon name={editing ? 'edit' : 'plus'} className="h-4 w-4" />{form.processing ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah kenderaan'}</PrimaryButton>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
