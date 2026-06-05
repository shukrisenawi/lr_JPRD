import { useEffect } from 'react';

export default function AvatarLightbox({ src, alt, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!src) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div className="relative max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-slate-100"
                >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                </button>
                <img
                    src={src}
                    alt={alt || ''}
                    className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
                />
            </div>
        </div>
    );
}
