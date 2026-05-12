import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ active = false, className = '', children, ...props }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                active
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${className}`}
        >
            {children}
        </Link>
    );
}
