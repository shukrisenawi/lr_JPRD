import ApplicationLogo from '@/Components/ApplicationLogo';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="PAS" />
            <div className="flex min-h-screen items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.15),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.1),_transparent_50%)] px-4">
                <div className="w-full max-w-3xl rounded-lg border border-slate-700/60 bg-slate-800/80 px-6 py-10 shadow-sm shadow-black/20 sm:px-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-500 text-white shadow-sm">
                            <ApplicationLogo className="h-7 w-7 fill-current" />
                        </div>
                        <h1 className="mt-4 text-2xl font-extrabold text-white">PAS</h1>
                        <p className="mt-1 text-sm font-bold text-violet-400">Panel Semakan Data Cula</p>
                        <p className="mt-3 max-w-lg text-xs leading-6 text-slate-400">
                            Dashboard untuk semakan data Google Sheet, carian pemilih, analitik laporan, dan pengurusan program.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            {auth.user ? (
                                <Link href={route('dashboard')} className="btn-primary-lg">Dashboard</Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className="btn-primary-lg">Log Masuk</Link>
                                    <Link href={route('register')} className="btn-ghost">Daftar</Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-2 border-t border-slate-700/60 pt-6 sm:grid-cols-3">
                        {[
                            { label: 'Dashboard', desc: 'Urus page data Google Sheet dan salin rekod ke Telegram.' },
                            { label: 'Laporan', desc: 'Analitik pemilih mengikut UDM, lokaliti dan status culaan.' },
                            { label: 'Program', desc: 'Pengurusan program dan kehadiran pemilih.' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-3 text-left">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-400">{item.label}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
