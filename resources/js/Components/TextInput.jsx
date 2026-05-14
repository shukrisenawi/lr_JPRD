import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput({ type = 'text', className = '', isFocused = false, ...props }, ref) {
    const localRef = useRef(null);
    useImperativeHandle(ref, () => ({ focus: () => localRef.current?.focus() }));
    useEffect(() => { if (isFocused) localRef.current?.focus(); }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-950 placeholder-slate-400 shadow-sm transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 ' +
                className
            }
            ref={localRef}
        />
    );
});
