export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p
            {...props}
            className={'text-xs text-rose-400 ' + className}
        >
            {message}
        </p>
    ) : null;
}
