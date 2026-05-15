import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, variant = 'light', className = '', children, ...props }) {
    const classes = active
        ? 'border-b-2 border-green-600 bg-green-50 text-slate-800'
        : 'border-b-2 border-transparent text-slate-600 hover:bg-green-50 hover:text-green-700';

    return (
        <Link
            {...props}
            className={
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold tracking-[0.02em] transition ' +
                classes +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
