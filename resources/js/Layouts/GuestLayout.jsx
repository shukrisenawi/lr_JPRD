import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_35%),linear-gradient(180deg,_#ecfeff_0%,_#f8fafc_48%,_#e2e8f0_100%)] px-4 py-10">
            <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="hidden rounded-[2rem] bg-slate-900 p-10 text-white shadow-panel lg:block">
                    <Link href={route('dashboard')} className="inline-flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-200">
                            <ApplicationLogo className="h-6 w-6 fill-current" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                                LR JPRD
                            </p>
                            <h1 className="text-2xl font-bold">Panel Semakan Data Cula</h1>
                        </div>
                    </Link>

                    <div className="mt-12 space-y-4">
                        <h2 className="text-4xl font-semibold leading-tight">
                            Log masuk admin untuk semak data Google Sheet dengan lebih pantas.
                        </h2>
                        <p className="max-w-lg text-sm leading-7 text-slate-300">
                            Dashboard ini dibina untuk kerja semakan yang pantas di desktop dan telefon, lengkap dengan status baris yang sudah disalin ke Telegram.
                        </p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 px-6 py-8 shadow-panel backdrop-blur sm:px-8">
                    <div className="mb-6 flex items-center gap-3 lg:hidden">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white">
                            <ApplicationLogo className="h-6 w-6 fill-current" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-cyan-700">LR JPRD</p>
                            <h1 className="text-lg font-bold text-slate-900">Panel Semakan Data Cula</h1>
                        </div>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
