import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.1),_transparent_50%)] px-4 py-10">
            <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="card hidden flex-col justify-between bg-gradient-to-br from-slate-800 to-slate-900 p-8 lg:flex">
                    <div>
                        <Link href={route('dashboard')} className="inline-flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-500 text-white shadow-sm shadow-green-600/20">
                                <ApplicationLogo className="h-5 w-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-400">PAS</p>
                                <h1 className="text-base font-extrabold text-white">Panel Semakan Data Cula</h1>
                            </div>
                        </Link>

                        <div className="mt-10 space-y-4">
                            <h2 className="text-2xl font-bold leading-tight text-white">
                                Log masuk admin untuk semak data Google Sheet dengan lebih pantas.
                            </h2>
                            <p className="max-w-md text-sm leading-7 text-slate-400">
                                Dashboard ini dibina untuk kerja semakan yang pantas di desktop dan telefon, lengkap dengan status baris yang sudah disalin ke Telegram.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
                        <p className="text-xs text-slate-500">Sistem Pengurusan Data Cula — v2.0</p>
                    </div>
                </div>

                <div className="card overflow-hidden px-5 py-6 sm:px-6">
                    <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-500 text-white">
                            <ApplicationLogo className="h-4 w-4 fill-current" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">PAS</p>
                            <h1 className="text-sm font-extrabold text-white">Panel Semakan Data Cula</h1>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
