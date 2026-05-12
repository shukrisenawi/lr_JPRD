export default function SecondaryButton({ type = 'button', className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-700/50 px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-sm transition hover:border-violet-500/50 hover:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    disabled && 'cursor-not-allowed opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
