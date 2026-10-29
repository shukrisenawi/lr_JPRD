import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { compareUdms } from '@/Utils/udmOrder';

const fmt = (value) => new Intl.NumberFormat('ms-MY').format(value ?? 0);

export default function FamilyCreationMovement({ summary }) {
    const [confirming, setConfirming] = useState(false);
    const [notice, setNotice] = useState('');
    const { post, processing, errors, clearErrors } = useForm({ confirmed: true });
    if (!summary) return null;

    const rows = [...summary.rows].sort((a, b) => compareUdms({ name: a.udm }, { name: b.udm }));
    const submit = (event) => {
        event.preventDefault();
        post(route('laporan.keluarga.reset'), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirming(false);
                setNotice('Kiraan telah direset. Data keluarga dan ahli tidak dipadam.');
            },
        });
    };

    return (
        <section className="card overflow-hidden" aria-labelledby="family-movement-title">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                    <h3 id="family-movement-title" className="text-sm font-bold text-slate-900">Pergerakan Keluarga Dicipta Mengikut UDM</h3>
                    <p className="mt-1 text-xs text-slate-600">Keluarga baharu dibentuk secara manual atau automatik. Tambah ahli tidak menambah kiraan.</p>
                    <p className="mt-1 text-xs text-slate-500">{summary.reset_at ? `Sejak reset: ${summary.reset_at}` : 'Belum direset. Termasuk keluarga sedia ada semasa penjejakan bermula.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-emerald-800">{fmt(summary.total)} keluarga unik</span>
                    {summary.can_reset && <button type="button" className="rounded-md border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={processing} onClick={() => { clearErrors(); setConfirming(true); }}>Reset kiraan</button>}
                </div>
            </div>
            {notice && <p role="status" className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">{notice}</p>}
            <table className="w-full text-xs">
                <thead className="table-header"><tr><th scope="col" className="px-4 py-2">UDM</th><th scope="col" className="px-4 py-2 text-right">Keluarga dicipta</th></tr></thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                    {rows.map((row) => <tr key={row.udm} className="odd:bg-slate-50 hover:bg-emerald-50"><th scope="row" className="px-4 py-2 text-left font-semibold">{row.udm}</th><td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(row.total)}</td></tr>)}
                    {rows.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">Belum ada keluarga dicipta. Cipta keluarga melalui menu Keluarga Pemilih.</td></tr>}
                </tbody>
                <tfoot className="border-t border-emerald-200 bg-emerald-50 font-bold text-emerald-900"><tr><th scope="row" className="px-4 py-2 text-left">Jumlah keluarga unik</th><td className="px-4 py-2 text-right tabular-nums">{fmt(summary.total)}</td></tr></tfoot>
            </table>
            <p className="px-4 py-2 text-[10px] text-slate-500">UDM mengikut ahli ketika keluarga dicipta. Keluarga merentas UDM dikira sekali di setiap UDM terlibat; jumlah unik tidak berganda.</p>
            <Modal show={confirming} onClose={() => setConfirming(false)} closeable={!processing} maxWidth="md" title="Pengesahan reset kiraan keluarga" animate={false}>
                <form onSubmit={submit} className="space-y-4 p-5">
                    <h4 className="text-base font-bold text-slate-900">Reset kiraan semua UDM?</h4>
                    <p className="text-sm text-slate-600">Kiraan akan bermula semula daripada kosong untuk semua UDM. Keluarga dan ahli pemilih sedia ada tidak akan dipadam. Kiraan terdahulu tidak boleh dipulihkan melalui butang ini.</p>
                    {Object.values(errors).map((error, index) => <p key={index} role="alert" className="text-xs text-rose-700">{error}</p>)}
                    <div className="flex justify-end gap-2">
                        <button type="button" disabled={processing} onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Batal</button>
                        <button type="submit" disabled={processing} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{processing ? 'Mereset...' : 'Ya, reset kiraan'}</button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
