import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-950">
            {/* Subtle Islamic geometric pattern */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="islamic-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                            <path d="M40 0 L80 40 L40 80 L0 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                            <path d="M40 10 L70 40 L40 70 L10 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            <circle cx="40" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            <path d="M0 0 L80 80 M80 0 L0 80" stroke="currentColor" strokeWidth="0.3" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#islamic-pattern)" className="text-white" />
                </svg>
            </div>

            {/* Subtle glows */}
            <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-green-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full max-w-md">
                    {/* Logo + brand */}
                    <Link
                        href={route('dashboard')}
                        className="mb-6 flex flex-col items-center gap-3"
                    >
                        <ApplicationLogo className="h-[150px] w-[150px] object-contain drop-shadow-xl" />
                        <div className="flex flex-col items-center text-center leading-tight">
                            <span className="text-base font-bold tracking-wide text-white">JPRD JENERI</span>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-200/80">
                                Sistem Pengurusan Pemilih
                            </span>
                        </div>
                    </Link>

                    {/* Card */}
                    <div className="rounded-2xl border border-white/15 bg-white/95 p-6 text-center shadow-2xl shadow-green-950/40 backdrop-blur-sm sm:p-8">
                        <div className="text-center">
                            {children}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-center text-[11px] text-green-200/60">
                        &copy; {new Date().getFullYear()} JPRD Jeneri &middot; Semua hak cipta terpelihara
                    </p>
                </div>
            </div>
        </div>
    );
}