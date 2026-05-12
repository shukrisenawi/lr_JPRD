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
                'rounded-lg border border-slate-600 bg-slate-700/60 px-3.5 py-2 text-sm text-white placeholder-slate-400 shadow-sm transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ' +
                className
            }
            ref={localRef}
        />
    );
});
