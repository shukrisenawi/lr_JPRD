import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirming, setConfirming] = useState(false);
    const pw = useRef();
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });
    const del = (e) => { e.preventDefault(); destroy(route('profile.destroy'), { preserveScroll: true, onSuccess: () => close(), onError: () => pw.current.focus(), onFinish: () => reset() }); };
    const close = () => { setConfirming(false); clearErrors(); reset(); };

    return (
        <section className={`space-y-4 ${className}`}>
            <header><h2 className="heading-md text-rose-400">Delete Account</h2><p className="text-muted mt-0.5">Once deleted, all data will be permanently removed.</p></header>
            <DangerButton onClick={() => setConfirming(true)}>Delete Account</DangerButton>
            <Modal show={confirming} onClose={close}>
                <form onSubmit={del} className="p-5">
                    <h2 className="heading-md text-rose-400">Are you sure?</h2>
                    <p className="mt-1 text-xs text-slate-400">Enter your password to confirm deletion.</p>
                    <div className="mt-4"><InputLabel htmlFor="dp" value="Password" className="sr-only" /><TextInput id="dp" type="password" ref={pw} value={data.password} onChange={(e) => setData('password', e.target.value)} className="input-field mt-1 block w-3/4" isFocused placeholder="Password" /><InputError message={errors.password} className="mt-1.5" /></div>
                    <div className="mt-4 flex justify-end gap-2"><SecondaryButton onClick={close}>Cancel</SecondaryButton><DangerButton disabled={processing}>Delete</DangerButton></div>
                </form>
            </Modal>
        </section>
    );
}
