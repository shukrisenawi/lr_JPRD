import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, className = '', children, ...props }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-bold tracking-[0.02em] transition ' +
                (active
                    ? 'bg-violet-500/20 text-violet-300 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
