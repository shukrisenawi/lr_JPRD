import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, variant = 'dark', className = '', children, ...props }) {
    const classes = variant === 'light'
        ? (active
            ? 'border-b-2 border-emerald-700 bg-emerald-50/60 text-slate-950'
            : 'border-b-2 border-transparent text-slate-950 hover:bg-emerald-50/70 hover:text-emerald-700')
        : (active
            ? 'bg-violet-500/20 text-violet-300 shadow-sm'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200');

    return (
        <Link
            {...props}
            className={
                'inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold tracking-[0.02em] transition ' +
                classes +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
