export default function DangerButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    disabled && 'cursor-not-allowed opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
