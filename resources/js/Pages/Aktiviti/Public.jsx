import AktivitiCard from '@/Components/AktivitiCard';
import ApplicationLogo from '@/Components/ApplicationLogo';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { Head, useForm } from '@inertiajs/react';

function LockIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

function CalendarIcon({ className = 'h-5 w-5' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

export default function Public({ token, hasAccess, passwordConfigured, activities = [] }) {
    const form = useForm({ password: '' });

    const submit = (event) => {
        event.preventDefault();
        form.post(route('aktiviti.public.access', token), { onFinish: () => form.reset('password') });
    };

    return (
        <div className="min-h-screen bg-[#eff8f2] text-slate-800">
            <Head title="Aktiviti Akan Datang">
                <meta name="description" content="Jadual aktiviti akan datang JPRD Jeneri untuk rujukan ahli luar." />
            </Head>

            <header className="border-b border-green-100 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <ApplicationLogo className="h-10 w-10 shrink-0 object-contain" alt="Logo JPRD Jeneri" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black tracking-wide text-green-900">JPRD JENERI</p>
                            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-green-700">Jadual aktiviti</p>
                        </div>
                    </div>
                    <span className="hidden rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-green-700 sm:inline-flex">Akses ahli luar</span>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
                {!hasAccess ? (
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-green-700 shadow-sm"><CalendarIcon className="h-3.5 w-3.5" /> JPRD Jeneri</div>
                            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-green-950 sm:text-5xl">Aktiviti akan datang, dalam satu jadual.</h1>
                            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600">Masukkan password yang diberikan oleh urus setia untuk melihat mesyuarat, taklimat, dan aktiviti JPRD yang akan datang.</p>
                            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-slate-500"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 text-white"><LockIcon className="h-4 w-4" /></span><span>Akses ini hanya memaparkan aktiviti yang belum berlangsung.</span></div>
                        </div>

                        <section className="rounded-2xl border border-green-100 bg-white p-5 shadow-xl shadow-green-900/5 sm:p-6">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700"><LockIcon className="h-5 w-5" /></div>
                            <h2 className="mt-4 text-xl font-black text-slate-900">Masukkan password</h2>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">Password yang sama digunakan oleh semua ahli luar.</p>

                            {passwordConfigured ? (
                                <form onSubmit={submit} className="mt-5 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="aktiviti-public-password" value="Password pautan" />
                                        <input id="aktiviti-public-password" type="password" autoComplete="current-password" className="input-field mt-1.5 py-2.5 text-sm" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} placeholder="Masukkan password" />
                                        <InputError message={form.errors.password} className="mt-1.5" />
                                    </div>
                                    <button type="submit" disabled={form.processing} className="btn-primary-lg w-full">{form.processing ? 'Menyemak...' : 'Lihat aktiviti'}</button>
                                </form>
                            ) : (
                                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-relaxed text-amber-800">Pautan ini belum diaktifkan oleh urus setia.</div>
                            )}
                        </section>
                    </div>
                ) : (
                    <>
                        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-700 p-5 text-white shadow-lg shadow-green-900/10 sm:p-8">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-100">Jadual semasa</p>
                                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Aktiviti akan datang</h1>
                                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-50">Maklumat tarikh, masa, dan tempat untuk aktiviti JPRD yang seterusnya.</p>
                                </div>
                                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-100">Jumlah aktiviti</p><p className="mt-0.5 text-2xl font-black">{activities.length}</p></div>
                            </div>
                        </section>

                        <section className="mt-6">
                            {activities.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-green-200 bg-white px-5 py-12 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600"><CalendarIcon className="h-6 w-6" /></div><h2 className="mt-3 text-base font-black text-slate-900">Tiada aktiviti dijadualkan</h2><p className="mt-1 text-xs text-slate-500">Sila semak semula kemudian untuk jadual baharu.</p></div>
                            ) : (
                                <div className="space-y-3">{activities.map((activity) => <AktivitiCard key={activity.id} activity={activity} headingLevel="h2" />)}</div>
                            )}
                        </section>
                    </>
                )}
            </main>

            <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-[11px] font-medium text-slate-600 sm:px-6">JPRD Jeneri | Jadual aktiviti untuk rujukan ahli luar</footer>
        </div>
    );
}
