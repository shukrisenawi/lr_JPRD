import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { formatPhoneNumber } from '@/Utils/formatPhoneNumber';
import { orderUdms } from '@/Utils/udmOrder';
import { Icon, UdmSummaryCard } from './Index';

function LeaderForm({ kad, onClose }) {
    const form = useForm({ pemimpin_id: kad?.pemimpin_id || '', name: kad?.name || '', level: kad?.level || 'udm', notes: kad?.notes || '' });
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected] = useState(kad?.pemimpin || null);
    const [searchError, setSearchError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(route('kad-ten.suggest-pemimpin', { q: query, level: form.data.level }), { signal: controller.signal });
                if (!response.ok) throw new Error('Carian ketua tidak berjaya.');
                setSuggestions((await response.json()).suggestions || []);
                setSearchError('');
            } catch (error) {
                if (error.name !== 'AbortError') setSearchError(error.message);
            }
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, form.data.level]);
    const submit = event => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (kad) form.put(route('kad-ten.update', kad.id), options);
        else form.post(route('kad-ten.store'), options);
    };
    return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="leader-title" className="mx-auto mt-12 max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h3 id="leader-title" className="font-bold">{kad ? 'Edit ketua' : 'Tambah ketua'} KKR10</h3><button type="button" onClick={onClose} className="text-sm text-slate-600">Tutup</button></div>
        <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label htmlFor="leader-level" className="block text-sm font-semibold">Peringkat</label><select id="leader-level" className="input-field mt-1 w-full" value={form.data.level} onChange={e => form.setData('level', e.target.value)}><option value="udm">UDM</option><option value="cawangan">Cawangan</option></select></div>
            <div><label htmlFor="leader-search" className="block text-sm font-semibold">Cari ketua</label><input id="leader-search" className="input-field mt-1 w-full" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nama atau nombor KP" />
                {searchError && <p role="alert" className="text-sm text-red-700">{searchError}</p>}
                <div className="mt-2 max-h-48 overflow-auto divide-y">{suggestions.map(voter => <button type="button" key={voter.id} className="block w-full px-2 py-2 text-left text-sm hover:bg-green-50" onClick={() => { setSelected(voter); form.setData(data => ({ ...data, pemimpin_id: voter.id, name: voter.name })); }}>{voter.name}<span className="block text-xs text-slate-600">{voter.no_kp || voter.old_ic} · {voter.dm}</span></button>)}</div>
                {selected && <p className="mt-2 rounded-lg bg-green-50 p-2 text-sm font-bold text-green-800">Dipilih: {selected.name}</p>}
                {form.errors.pemimpin_id && <p role="alert" className="text-sm text-red-700">{form.errors.pemimpin_id}</p>}
            </div>
            <div><label htmlFor="leader-notes" className="block text-sm font-semibold">Nota</label><textarea id="leader-notes" className="input-field mt-1 w-full" value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} /></div>
            {Object.entries(form.errors).filter(([key]) => key !== 'pemimpin_id').map(([key, error]) => <p key={key} role="alert" className="text-sm text-red-700">{error}</p>)}
            <button disabled={form.processing} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{form.processing ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
    </section></div>;
}

export default function KkrIndex({ kads, udms, filters, udm_summaries: udmSummaries = [], can_manage: canManage, can_auto: canAuto, available_families: availableFamilies }) {
    const { flash = {} } = usePage().props;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(undefined);
    const [expandedKadId, setExpandedKadId] = useState(null);
    const allUdmSelected = !canManage && !filters.udm;
    const selectUdm = udm => {
        setExpandedKadId(null);
        router.get(route('kad-ten.index'), udm ? { udm } : {}, { preserveScroll: true });
    };
    const [exporting, setExporting] = useState(false);
    const exportFamilies = async (selectedKad = null) => {
        setExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'JPRD - KKR10';
            const sheet = workbook.addWorksheet('KKR10', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
            sheet.columns = [28, 24, 30, 42, 30, 18, 18, 26].map(width => ({ width }));
            sheet.addRow(['Ketua', 'UDM / Lokaliti', 'Keluarga', 'Alamat keluarga', 'Nama pemilih', 'No. KP', 'Telefon', 'Cula']);
            sheet.getRow(1).font = { bold: true };
            for (const kad of selectedKad ? [selectedKad] : kads.data) {
                for (const family of kad.families) {
                    for (const member of family.members.length ? family.members : [{}]) {
                        sheet.addRow([kad.pemimpin?.name || kad.name, kad.scope_name, family.name, family.address,
                            member.name || '-', member.no_kp || member.old_ic || '-',
                            formatPhoneNumber(member.phone_mobile || member.phone_home), member.cula_display_label || member.cula_code || '-']);
                    }
                }
            }
            sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true }; });
            const url = URL.createObjectURL(new Blob([await workbook.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'KKR10.xlsx';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Eksport tidak berjaya. Sila cuba lagi.');
        } finally {
            setExporting(false);
        }
    };
    const run = (name, confirmation) => {
        if (busy || !window.confirm(confirmation)) return;
        setBusy(true);
        setError('');
        router.post(route(name), {}, { preserveScroll: true, onError: () => setError('Tindakan tidak berjaya. Sila cuba lagi.'), onFinish: () => setBusy(false) });
    };
    return <AuthenticatedLayout header={<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="heading-lg">KKR10</h2><p className="mt-1 text-sm text-slate-600">10 keluarga bagi setiap ketua. Agihan mengutamakan alamat keluarga.</p></div><div className="flex flex-wrap gap-2">{canAuto && <><button disabled={busy} onClick={() => run('kad-ten.auto-input', 'Agihkan keluarga yang telah disemak mengikut alamat, maksimum 10 keluarga setiap ketua?')} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Memproses...' : 'Auto keluarga'}</button><button disabled={busy} onClick={() => run('kad-ten.reset-auto-input', 'Kosongkan semua tugasan keluarga? Ketua dan rekod keluarga dikekalkan.')} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Kosongkan tugasan</button></>}{canManage && <button onClick={() => setEditing(null)} className="rounded-lg border border-green-300 px-4 py-2 text-sm font-bold text-green-800">Tambah ketua</button>}</div></div>}>
        <Head title="KKR10" />
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        {!allUdmSelected && kads.data.length > 0 && <div className="mt-3 flex justify-end"><button type="button" disabled={exporting} onClick={() => exportFamilies()} className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800 disabled:opacity-50">{exporting ? 'Menyediakan...' : 'Eksport halaman'}</button></div>}
        {flash.success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{flash.success}</p>}
        {(flash.error || error) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{flash.error || error}</p>}
        <div className="my-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between"><div><label htmlFor="udm-filter" className="block text-xs font-bold text-slate-600">UDM</label><select id="udm-filter" className="input-field mt-1" value={filters.udm} onChange={e => selectUdm(e.target.value)}><option value="">Semua UDM</option>{orderUdms(udms.map(name => ({ name }))).map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></div><p className="text-sm text-slate-600">{availableFamilies} keluarga disemak belum diagih · <Link href={route('keluarga-pemilih.index')} className="font-semibold text-green-800 underline">Senarai keluarga</Link></p></div>
        <p className="mb-4 text-xs text-slate-600">Auto keluarga memilih keluarga yang telah disemak dan mempunyai alamat sahaja. Ahli dipaparkan hanya cula 2, semua kategori 3, dan 4P; cula lain disembunyikan tanpa memadam rekod.</p>
        {allUdmSelected ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{orderUdms(udmSummaries).map(summary => <UdmSummaryCard key={summary.key} summary={summary} onSelect={selectUdm} />)}</div> : <div className="grid gap-3">{kads.data.map((kad, cardIndex) => <section key={kad.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex w-full items-start justify-between gap-3 px-3 py-3 sm:px-4">
                <button type="button" aria-expanded={expandedKadId === kad.id} onClick={() => setExpandedKadId(current => current === kad.id ? null : kad.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:bg-green-50/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">{String((kads.from || 1) + cardIndex).padStart(2, '0')}</span>
                        <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                        <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{kad.pemimpin?.name || kad.name || 'KKR10'}<span className="ml-2 text-[10px] font-normal text-slate-400">· {kad.pemimpin?.no_kp || kad.pemimpin?.old_ic || '-'}</span></p><p className="mt-0.5 truncate text-[10px] text-slate-500">{kad.level === 'cawangan' ? `${kad.parent_scope_name || '-'} / ${kad.scope_name || '-'}` : (kad.scope_name || kad.level || '-')}</p></div>
                    </div>
                </button>
                <div className="flex min-w-0 max-w-[70%] shrink-0 flex-col items-end gap-1.5 sm:max-w-none sm:flex-row sm:items-center">
                    <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' + (kad.families.length >= 10 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{kad.families.length >= 10 ? 'Lengkap' : 'Belum cukup'} · {kad.families.length}/10 keluarga</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" disabled={exporting} onClick={() => exportFamilies(kad)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-green-300 hover:text-green-700 disabled:opacity-50"><Icon name="download" className="h-3.5 w-3.5" /> Excel</button>
                        {canManage && <><button type="button" onClick={() => setEditing(kad)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700 hover:bg-green-50"><Icon name="edit" className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => { if (window.confirm('Padam ketua KKR10 ini? Tugasan keluarga dilepaskan, rekod keluarga tidak dipadam.')) router.delete(route('kad-ten.destroy', kad.id)); }} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><Icon name="trash" className="h-3.5 w-3.5" /> Padam</button></>}
                    </div>
                </div>
            </div>
            {expandedKadId === kad.id && <div className="border-t border-slate-100">
            <div className="border-b border-slate-100 px-3 py-2 sm:px-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Senarai keluarga</p><p className="mt-0.5 text-[10px] text-slate-400">{kad.families.length >= 10 ? 'Kad sudah mencapai minimum 10 keluarga.' : `Masih perlu ${10 - kad.families.length} keluarga untuk lengkap.`}</p></div>
            {!kad.families.length && <p className="p-6 text-center text-sm text-slate-600">Belum ada keluarga. Gunakan Auto keluarga untuk agihan keluarga yang telah disemak.</p>}
            <div className="divide-y divide-slate-200">{kad.families.map((family, index) => <details key={family.id} className="p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-800">{index + 1}. {family.name} <span className="font-normal text-slate-600">· {family.members.length} pemilih sasaran</span></summary>
                <p className="my-2 text-xs text-slate-600">Alamat keluarga: {family.address || 'Belum dinyatakan'}{!family.reviewed_at && ' · Semakan telah ditarik balik'}</p>
                <div className="space-y-2">{family.members.map(member => <div key={member.id} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold text-slate-800">{member.name}</p><p className="text-slate-600">{member.no_kp || member.old_ic} · {member.dm} / {member.locality}</p></div>
                    <p className="text-slate-600">{formatPhoneNumber(member.phone_mobile || member.phone_home)}</p><span className="font-bold text-green-800">{member.cula_display_label || member.cula_code}</span>
                </div>)}{!family.members.length && <p className="text-xs text-slate-600">Tiada ahli dengan cula sasaran.</p>}</div>
                {canManage && <button type="button" className="mt-3 text-xs font-semibold text-red-700" onClick={() => {
                    if (window.confirm('Keluarkan keluarga ini daripada jagaan ketua? Rekod keluarga dikekalkan.')) {
                        router.delete(route('kad-ten.families.destroy', [kad.id, family.id]), { preserveScroll: true });
                    }
                }}>Keluarkan keluarga</button>}
            </details>)}</div>
            </div>}
        </section>)}{!kads.data.length && <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">Belum ada ketua KKR10 dalam skop ini.</p>}</div>}
        {!allUdmSelected && <nav aria-label="Halaman KKR10" className="mt-4 flex flex-wrap gap-2">{kads.links.map((link, index) => link.url ? <Link key={index} href={link.url} className={`rounded-lg border px-3 py-2 text-sm ${link.active ? 'bg-green-700 text-white' : 'bg-white text-slate-700'}`} dangerouslySetInnerHTML={{ __html: link.label }} /> : null)}</nav>}
        {editing !== undefined && <LeaderForm kad={editing} onClose={() => setEditing(undefined)} />}
        </div>
    </AuthenticatedLayout>;
}
