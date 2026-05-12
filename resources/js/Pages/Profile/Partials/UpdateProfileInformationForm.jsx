import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function UpdateProfileInformation({ mustVerifyEmail, status, className = '' }) {
    const user = usePage().props.auth.user;
    const [preview, setPreview] = useState(user.avatar_url);
    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({ name: user.name, email: user.email, avatar: null, _method: 'patch' });

    useEffect(() => {
        if (!(data.avatar instanceof File)) { setPreview(user.avatar_url); return; }
        const u = URL.createObjectURL(data.avatar); setPreview(u); return () => URL.revokeObjectURL(u);
    }, [data.avatar, user.avatar_url]);

    const submit = (e) => { e.preventDefault(); post(route('profile.update'), { forceFormData: true }); };

    return (
        <section className={className}>
            <header><h2 className="heading-md">Profile Information</h2><p className="text-muted mt-0.5">Update your profile info.</p></header>
            <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        {preview ? <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover shadow-sm" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-bold text-white">{user.name.charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0 flex-1">
                            <InputLabel htmlFor="avatar" value="Avatar" />
                            <input id="avatar" type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="mt-1.5 block w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-violet-500"
                                onChange={(e) => setData('avatar', e.target.files?.[0] ?? null)} />
                            <p className="mt-1 text-[10px] text-slate-500">PNG/JPG/WEBP max 2MB</p>
                            <InputError className="mt-1.5" message={errors.avatar} />
                        </div>
                    </div>
                </div>
                <div><InputLabel htmlFor="name" value="Name" /><TextInput id="name" className="input-field mt-1" value={data.name} onChange={(e) => setData('name', e.target.value)} required isFocused autoComplete="name" /><InputError className="mt-1.5" message={errors.name} /></div>
                <div><InputLabel htmlFor="email" value="Email" /><TextInput id="email" type="email" className="input-field mt-1" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" /><InputError className="mt-1.5" message={errors.email} /></div>
                {mustVerifyEmail && user.email_verified_at === null && (
                    <div><p className="text-xs text-slate-400">Email belum disahkan. <Link href={route('verification.send')} method="post" as="button" className="text-violet-400 underline hover:text-violet-300">Hantar semula.</Link></p>{status === 'verification-link-sent' && <p className="mt-1 text-xs text-emerald-400">Pautan baru telah dihantar.</p>}</div>
                )}
                <div className="flex items-center gap-3">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-xs font-bold text-emerald-400">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
