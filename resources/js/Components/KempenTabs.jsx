import { Link } from '@inertiajs/react';

export default function KempenTabs({ active, udm = '', locality = '', udms = [], localities = [], onFilterChange, udmLocked = false, loading = false, errors = {} }) {
    return (
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Tab Kempen" className="flex shrink-0 gap-2">
            {[
                ['sasaran', 'Pemilih Sasaran', 'keluarga-disemak.index'],
                ['hari-jadi', 'Hari Jadi', 'kempen.hari-jadi.index'],
            ].map(([key, label, destination]) => (
                <Link key={key} href={route(destination, { udm, locality })} aria-current={active === key ? 'page' : undefined}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${active === key ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700'}`}>
                    {label}
                </Link>
            ))}
        </nav>
        <div aria-label="Penapis lokasi Kempen" className="grid gap-3 sm:grid-cols-2 lg:w-[30rem]">
            <div>
                <label htmlFor="kempen-udm" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">UDM</label>
                <select id="kempen-udm" value={udm} disabled={udmLocked || loading} onChange={(event) => onFilterChange('udm', event.target.value)} className="input-field mt-1 disabled:opacity-60">
                    <option value="">Semua UDM</option>
                    {udms.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                {errors.udm && <p role="alert" className="mt-1 text-sm text-red-700">{errors.udm}</p>}
            </div>
            <div>
                <label htmlFor="kempen-locality" className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lokaliti</label>
                <select id="kempen-locality" value={locality} disabled={!udm || loading} onChange={(event) => onFilterChange('locality', event.target.value)} className="input-field mt-1 disabled:opacity-60">
                    <option value="">{udm ? 'Semua Lokaliti' : 'Pilih UDM dahulu'}</option>
                    {localities.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                {errors.locality && <p role="alert" className="mt-1 text-sm text-red-700">{errors.locality}</p>}
            </div>
        </div>
        </div>
    );
}
