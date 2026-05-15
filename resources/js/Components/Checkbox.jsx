export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={'rounded border-slate-300 bg-white text-green-600 shadow-sm focus:ring-green-500 focus:ring-offset-0 ' + className}
        />
    );
}
