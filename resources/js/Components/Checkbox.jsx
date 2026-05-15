export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={'rounded border-green-600 bg-green-800/50 text-green-500 shadow-sm focus:ring-green-500 focus:ring-offset-0 ' + className}
        />
    );
}
