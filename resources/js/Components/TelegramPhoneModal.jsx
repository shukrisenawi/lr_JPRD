import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

export default function TelegramPhoneModal() {
    const dialog = useRef(null);
    const [identity, setIdentity] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const open = (event) => {
            setIdentity(event.detail.identity);
            setPhone('');
            setError('');
            if (!dialog.current.open) dialog.current.showModal();
        };
        window.addEventListener('telegram:phone-change', open);
        return () => window.removeEventListener('telegram:phone-change', open);
    }, []);

    useEffect(() => {
        if (!identity) return;
        const controller = new AbortController();
        setName('');
        setLoading(true);
        fetch(route('pemilih.phone.show', { identity }), {
            headers: { Accept: 'application/json' }, signal: controller.signal,
        }).then(async (response) => {
            if (!response.ok) throw new Error('Maklumat pemilih tidak dapat dimuatkan. Sila cuba semula.');
            const data = await response.json();
            if (!controller.signal.aborted) setName(data.name);
        }).catch((error) => {
            if (!controller.signal.aborted) setError(error.message);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [identity]);

    async function submit(event) {
        event.preventDefault();
        if (saving || loading || !name) return;
        setSaving(true);
        setError('');
        try {
            const response = await fetch(route('pemilih.phone.update'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ identity, phone }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.errors?.phone?.[0] || data.message || 'Nombor telefon gagal disimpan. Sila cuba lagi.');
            }
            const data = await response.json();
            window.dispatchEvent(new CustomEvent('pemilih:phone-updated', { detail: data }));
            dialog.current.close();
            router.reload({ preserveScroll: true });
        } catch (error) {
            setError(error.message || 'Nombor telefon gagal disimpan. Sila cuba lagi.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <dialog ref={dialog} aria-labelledby="telegram-phone-title" onCancel={(event) => { if (saving) event.preventDefault(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/50">
            <form onSubmit={submit}>
                <h2 id="telegram-phone-title" className="text-lg font-bold">Tukar nombor telefon</h2>
                <p className="mt-2 text-sm text-slate-600">Selepas membuka Telegram, masukkan nombor telefon baharu untuk disimpan dalam sistem.</p>
                <p className="mt-3 text-sm font-semibold text-slate-800">{loading ? 'Memuatkan nama pemilih…' : name || 'Nama pemilih tidak tersedia'}</p>
                <label htmlFor="telegram-new-phone" className="mt-4 block text-sm font-semibold">Nombor telefon baharu</label>
                <input id="telegram-new-phone" type="tel" autoComplete="tel" autoFocus required maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} disabled={saving} aria-describedby={error ? 'telegram-phone-error' : undefined} aria-invalid={!!error} className="mt-2 w-full rounded-md border-slate-300 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Contoh: 0123456789" />
                {error && <p id="telegram-phone-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" disabled={saving} onClick={() => dialog.current.close()} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Batal</button>
                    <button type="submit" disabled={saving || loading || !name} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button>
                </div>
            </form>
        </dialog>
    );
}
