import Modal from '@/Components/Modal';
import AnnouncementBody from '@/Components/AnnouncementBody';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AnnouncementPopup() {
    const { pendingAnnouncements: announcements = [], auth } = usePage().props;
    const { url } = usePage();
    const [closed, setClosed] = useState([]);
    const [hidden, setHidden] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const key = (item) => `${auth.user.id}:${url}:${item.id}`;
    const item = announcements.find((entry) => !closed.includes(key(entry)) && !hidden.includes(`${auth.user.id}:${entry.id}`));
    const visibleId = !auth.user.must_change_password ? item?.id : null;
    useEffect(() => {
        if (visibleId) axios.post(route('announcements.viewed', visibleId)).catch(() => {});
    }, [visibleId, auth.user.id, url]);
    const close = () => { setClosed((values) => [...values, key(item)]); setError(''); };
    const dismiss = async () => {
        setSaving(true);
        setError('');
        try {
            await axios.post(route('announcements.dismiss', item.id));
            setHidden((values) => [...values, `${auth.user.id}:${item.id}`]);
        } catch {
            setError('Pilihan tidak dapat disimpan. Sila cuba lagi.');
        } finally {
            setSaving(false);
        }
    };
    if (!item || auth.user.must_change_password) return null;

    return <Modal show title={item.title} onClose={close} animate={false}>
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Pengumuman</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h2>
            {item.poster_url && <img src={item.poster_url} alt={item.title} className="mt-4 max-h-[55vh] w-full rounded-lg object-contain" />}
            {item.body && <div className="mt-4"><AnnouncementBody item={item} /></div>}
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button type="button" disabled={saving} onClick={dismiss} className="btn-ghost">{saving ? 'Menyimpan…' : 'Tidak perlu papar lagi'}</button>
                <button type="button" onClick={close} className="btn-primary">Tutup</button>
            </div>
        </div>
    </Modal>;
}
