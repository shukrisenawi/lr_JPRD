import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-900 px-4 py-10">
            <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="card hidden flex-col justify-between bg-gradient-to-br from-green-800 to-emerald-900 p-8 lg:flex">
                    <div>
                        <Link href={route('dashboard')} className="inline-flex items-center gap-2.5">
                            <ApplicationLogo className="h-12 w-12 object-contain" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-300">PAS SIK</p>
                                <h1 className="text-base font-extrabold text-white">Panel Semakan Data Cula</h1>
                            </div>
                        </Link>

                        <div className="mt-10 space-y-4">
                            <h2 className="text-2xl font-bold leading-tight text-white">
                                Log masuk admin untuk semak data Google Sheet dengan lebih pantas.
                            </h2>
                            <p className="max-w-md text-sm leading-7 text-green-200/70">
                                Dashboard ini dibina untuk kerja semakan yang pantas di desktop dan telefon, lengkap dengan status baris yang sudah disalin ke Telegram.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 rounded-xl border border-green-700/50 bg-green-800/50 px-4 py-3">
                        <p className="text-xs text-green-300/60">Sistem Pengurusan Data Cula — v2.0</p>
                    </div>
                </div>

                <div className="card overflow-hidden border-green-200 bg-white px-5 py-6 sm:px-6">
                    <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                        <ApplicationLogo className="h-10 w-10 object-contain" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-300">PAS SIK</p>
                            <h1 className="text-sm font-extrabold text-white">Panel Semakan Data Cula</h1>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
