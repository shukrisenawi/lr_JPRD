import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ active = false, variant = 'dark', className = '', children, ...props }) {
    const classes = variant === 'light'
        ? (active
            ? 'bg-emerald-50 text-emerald-700'
            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700')
        : (active
            ? 'bg-violet-500/20 text-violet-300'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200');

    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${classes} ${className}`}
        >
            {children}
        </Link>
    );
}
