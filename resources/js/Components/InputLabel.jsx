export default function InputLabel({ value, className = '', children, ...props }) {
    return (
        <label {...props} className={`block text-xs font-bold uppercase tracking-[0.08em] text-slate-300 ` + className}>
            {value ? value : children}
        </label>
    );
}
