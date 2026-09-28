import { Link } from '@inertiajs/react';

export default function NavLink({ active = false, variant = 'light', className = '', children, ...props }) {
    const classes = active
        ? 'bg-green-600 text-white shadow-sm shadow-green-600/20'
        : 'text-slate-600 hover:bg-green-100 hover:text-green-700';

    return (
        <Link
            {...props}
            className={
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition mx-[2px] ' +
                classes +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
