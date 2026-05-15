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
        <section className={`space-y-3 ${className}`}>
            <header><h2 className="text-sm font-bold text-rose-600">Delete Account</h2><p className="mt-0.5 text-xs text-slate-500">Once deleted, all data will be permanently removed.</p></header>
            <DangerButton onClick={() => setConfirming(true)} className="gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold shadow-sm shadow-rose-500/20">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                Delete Account
            </DangerButton>
            <Modal show={confirming} onClose={close}>
                <form onSubmit={del} className="p-3">
                    <h2 className="text-sm font-bold text-rose-600">Are you sure?</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Enter your password to confirm deletion.</p>
                    <div className="mt-3"><InputLabel htmlFor="dp" value="Password" className="sr-only" /><TextInput id="dp" type="password" ref={pw} value={data.password} onChange={(e) => setData('password', e.target.value)} className="input-field mt-1 block w-full text-sm sm:w-3/4" isFocused placeholder="Password" /><InputError message={errors.password} className="mt-1" /></div>
                    <div className="mt-3 flex justify-end gap-2"><SecondaryButton onClick={close} className="text-xs">Cancel</SecondaryButton><DangerButton disabled={processing} className="text-xs">Delete</DangerButton></div>
                </form>
            </Modal>
        </section>
    );
}
