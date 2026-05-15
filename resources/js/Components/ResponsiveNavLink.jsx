import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ active = false, variant = 'light', className = '', children, ...props }) {
    const classes = active
        ? 'bg-green-600 text-white'
        : 'text-slate-600 hover:bg-green-100 hover:text-green-700';

    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${classes} ${className}`}
        >
            {children}
        </Link>
    );
}
