import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

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
            <header>
                <h2 className="text-[2rem] font-black tracking-tight text-slate-950">Profile Information</h2>
                <p className="mt-1 text-xl font-medium text-slate-500">Update your profile info.</p>
            </header>
            <form onSubmit={submit} className="mt-6 space-y-6">
                <div className="border-t border-slate-200 pt-6">
                    <InputLabel htmlFor="avatar" value="Avatar" />
                    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">
                        {preview ? <img src={preview} alt="" className="h-32 w-32 rounded-2xl object-cover shadow-sm" /> : <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-green-500 text-4xl font-black text-white">{user.name.charAt(0).toUpperCase()}</div>}
                        <label className="flex min-h-[8.25rem] min-w-0 flex-1 cursor-pointer items-center rounded-2xl border border-dashed border-indigo-200 bg-white px-5 py-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40">
                            <input id="avatar" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="sr-only" onChange={(e) => setData('avatar', e.target.files?.[0] ?? null)} />
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <span className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-700 to-violet-500 px-5 py-3 text-lg font-black text-white shadow-sm">Choose File</span>
                                <span className="min-w-0 truncate text-xl font-medium text-slate-500">{data.avatar?.name ?? 'No file chosen'}</span>
                            </div>
                        </label>
                    </div>
                    <p className="mt-3 text-lg font-medium text-slate-400">PNG/JPG/WEBP max 2MB</p>
                    <InputError className="mt-1.5" message={errors.avatar} />
                </div>
                <div>
                    <InputLabel htmlFor="name" value="Name" />
                    <TextInput id="name" className="input-field mt-3 py-3 text-xl" value={data.name} onChange={(e) => setData('name', e.target.value)} required isFocused autoComplete="name" />
                    <InputError className="mt-1.5" message={errors.name} />
                </div>
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput id="email" type="email" className="input-field mt-3 py-3 text-xl" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" />
                    <InputError className="mt-1.5" message={errors.email} />
                </div>
                {mustVerifyEmail && user.email_verified_at === null && (
                    <div><p className="text-xs text-slate-400">Email belum disahkan. <Link href={route('verification.send')} method="post" as="button" className="text-green-500 underline hover:text-green-400">Hantar semula.</Link></p>{status === 'verification-link-sent' && <p className="mt-1 text-xs text-green-600">Pautan baru telah dihantar.</p>}</div>
                )}
                <div className="flex items-center gap-3">
                    <PrimaryButton disabled={processing} className="gap-2 rounded-xl px-6 py-3 text-lg font-black"><Icon name="save" className="h-5 w-5" />Save</PrimaryButton>
                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-xs font-bold text-green-600">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
