import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useForm, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Swal from 'sweetalert2';

function PasswordField({ id, label, value, onChange, inputRef, autoComplete, error }) {
    const [visible, setVisible] = useState(false);
    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                </span>
                <TextInput id={id} ref={inputRef} value={value} onChange={onChange} type={visible ? 'text' : 'password'} className="input-field pl-10 pr-10 text-sm" autoComplete={autoComplete} />
                <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /><path d="m4 4 16 16" /></svg>
                </button>
            </div>
            <InputError message={error} className="mt-1" />
        </div>
    );
}

export default function UpdatePasswordForm({ className = '' }) {
    const pw = useRef(); const cpw = useRef();
    const { data, setData, errors, put, reset, processing } = useForm({ current_password: '', password: '', password_confirmation: '' });
    const updatePassword = (e) => {
        e.preventDefault();
        put(route('password.update'), { preserveScroll: true, onSuccess: () => { reset(); Swal.fire({ icon: 'success', title: 'Berjaya', text: 'Kata laluan berjaya ditukar.', timer: 2000, showConfirmButton: false }).then(() => router.visit(route('carian-pemilih.index'))); }, onError: (e) => { if (e.password) { reset('password', 'password_confirmation'); pw.current.focus(); } if (e.current_password) { reset('current_password'); cpw.current.focus(); } } });
    };

    return (
        <section className={className}>
            <header><h2 className="text-sm font-bold text-slate-950">Update Password</h2><p className="mt-0.5 text-xs text-slate-500">Ensure your account is secure.</p></header>
            <form onSubmit={updatePassword} className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <PasswordField id="cp" label="Current Password" value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} inputRef={cpw} autoComplete="current-password" error={errors.current_password} />
                <PasswordField id="np" label="New Password" value={data.password} onChange={(e) => setData('password', e.target.value)} inputRef={pw} autoComplete="new-password" error={errors.password} />
                <PasswordField id="npc" label="Confirm Password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} autoComplete="new-password" error={errors.password_confirmation} />
                <div className="flex items-center gap-3">
                    <PrimaryButton disabled={processing} className="gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>Save</PrimaryButton>
                </div>
            </form>
        </section>
    );
}
