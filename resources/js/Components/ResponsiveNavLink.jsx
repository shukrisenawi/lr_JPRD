import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ active = false, variant = 'light', className = '', children, ...props }) {
    const classes = active
        ? 'bg-green-50 text-green-700'
        : 'text-slate-600 hover:bg-green-50 hover:text-green-700';

    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition ${classes} ${className}`}
        >
            {children}
        </Link>
    );
}
