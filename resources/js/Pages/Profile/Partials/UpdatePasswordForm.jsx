import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function UpdatePasswordForm({ className = '' }) {
    const pw = useRef(); const cpw = useRef();
    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({ current_password: '', password: '', password_confirmation: '' });
    const updatePassword = (e) => {
        e.preventDefault();
        put(route('password.update'), { preserveScroll: true, onSuccess: () => reset(), onError: (e) => { if (e.password) { reset('password', 'password_confirmation'); pw.current.focus(); } if (e.current_password) { reset('current_password'); cpw.current.focus(); } } });
    };

    return (
        <section className={className}>
            <header><h2 className="heading-md">Update Password</h2><p className="text-muted mt-0.5">Ensure your account is secure.</p></header>
            <form onSubmit={updatePassword} className="mt-4 space-y-4">
                <div><InputLabel htmlFor="cp" value="Current Password" /><TextInput id="cp" ref={cpw} value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} type="password" className="input-field mt-1" autoComplete="current-password" /><InputError message={errors.current_password} className="mt-1.5" /></div>
                <div><InputLabel htmlFor="np" value="New Password" /><TextInput id="np" ref={pw} value={data.password} onChange={(e) => setData('password', e.target.value)} type="password" className="input-field mt-1" autoComplete="new-password" /><InputError message={errors.password} className="mt-1.5" /></div>
                <div><InputLabel htmlFor="npc" value="Confirm Password" /><TextInput id="npc" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} type="password" className="input-field mt-1" autoComplete="new-password" /><InputError message={errors.password_confirmation} className="mt-1.5" /></div>
                <div className="flex items-center gap-3">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-xs font-bold text-green-600">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
