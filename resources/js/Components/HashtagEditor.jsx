import { useEffect, useState } from 'react';
import HashtagInput from '@/Components/HashtagInput';
import Swal from 'sweetalert2';

export default function HashtagEditor({ voterId, value = [], onSaved, label = 'Hashtag Pemilih' }) {
    const [hashtags, setHashtags] = useState(Array.isArray(value) ? value : []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setHashtags(Array.isArray(value) ? value : []);
        setError('');
    }, [value]);

    const save = async () => {
        setSaving(true);
        setError('');

        try {
            const response = await fetch(route('pemilih.hashtags.update', voterId), {
                method: 'PUT',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.appConfig?.csrfToken ?? document.querySelector('meta[name=csrf-token]')?.content ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ hashtags }),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.errors?.hashtags?.[0] || payload.message || 'Hashtag tidak berjaya disimpan.');
            }

            const next = Array.isArray(payload.hashtags) ? payload.hashtags : hashtags;
            setHashtags(next);
            onSaved?.(next);
            Swal.fire({
                icon: 'success',
                title: 'Berjaya',
                text: 'Hashtag berjaya disimpan.',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (saveError) {
            setError(saveError.message || 'Hashtag tidak berjaya disimpan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="col-span-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2">
            <HashtagInput id={`hashtags-${voterId}`} value={hashtags} onChange={setHashtags} label={label} disabled={saving} />
            <div className="mt-2 flex items-center justify-end gap-2">
                {error && <p className="mr-auto text-[11px] font-semibold text-rose-500">{error}</p>}
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? 'Menyimpan...' : 'Simpan Hashtag'}
                </button>
            </div>
        </div>
    );
}
