import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({ active = false, variant = 'light', className = '', children, badge, ...props }) {
    const classes = active
        ? 'bg-green-600 text-white'
        : 'text-slate-600 hover:bg-green-100 hover:text-green-700';

    return (
        <Link
            {...props}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${classes} ${className}`}
        >
            <span className="flex-1">{children}</span>
            {badge !== undefined && badge > 0 && (
                <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    );
}
