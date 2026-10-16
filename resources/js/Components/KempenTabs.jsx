import { Link } from '@inertiajs/react';

export default function KempenTabs({ active }) {
    return (
        <nav aria-label="Tab Kempen" className="flex gap-2 border-b border-slate-200 pb-3">
            {[
                ['sasaran', 'Pemilih Sasaran', 'keluarga-disemak.index'],
                ['hari-jadi', 'Hari Jadi', 'kempen.hari-jadi.index'],
            ].map(([key, label, destination]) => (
                <Link key={key} href={route(destination)} aria-current={active === key ? 'page' : undefined}
                    className={`rounded-lg px-4 py-2 text-sm font-bold ${active === key ? 'bg-green-600 text-white' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-700'}`}>
                    {label}
                </Link>
            ))}
        </nav>
    );
}
