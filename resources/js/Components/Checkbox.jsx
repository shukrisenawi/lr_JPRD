export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={'rounded border-slate-600 bg-slate-700 text-violet-600 shadow-sm focus:ring-violet-500 focus:ring-offset-0 ' + className}
        />
    );
}
