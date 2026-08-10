import { useEffect, useRef, useState } from 'react';

const tagPattern = /^#[\p{L}\p{N}_][\p{L}\p{N}_-]*$/u;

function normalizeTag(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const tag = `#${raw.replace(/^#+/, '')}`.toLocaleLowerCase();
    return tagPattern.test(tag) ? tag : '';
}

export default function HashtagInput({ value = [], onChange, id = 'hashtags', label = 'Hashtag', disabled = false, maxTags = 20 }) {
    const inputRef = useRef(null);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const tags = Array.isArray(value) ? value : [];

    useEffect(() => {
        const query = input.trim();
        if (!query.startsWith('#') || disabled || tags.length >= maxTags) {
            setSuggestions([]);
            setLoading(false);
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`${route('pemilih.hashtags.suggestions')}?q=${encodeURIComponent(query)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });

                if (!response.ok) throw new Error('Gagal mendapatkan hashtag.');

                const payload = await response.json();
                setSuggestions(Array.isArray(payload.hashtags) ? payload.hashtags : []);
            } catch (requestError) {
                if (requestError.name !== 'AbortError') setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 120);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [disabled, input, maxTags, tags.length]);

    const addTag = (candidate) => {
        const tag = normalizeTag(candidate);
        if (!tag) {
            setError('Hashtag mesti bermula dengan # dan tidak boleh mengandungi ruang.');
            return;
        }

        if (tags.some((item) => String(item).toLocaleLowerCase() === tag)) {
            setError('Hashtag ini sudah dipilih.');
            setInput('');
            setSuggestions([]);
            return;
        }

        if (tags.length >= maxTags) return;

        onChange?.([...tags, tag]);
        setInput('');
        setSuggestions([]);
        setError('');
    };

    const removeTag = (tagToRemove) => {
        onChange?.(tags.filter((tag) => tag !== tagToRemove));
        setError('');
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addTag(input);
            return;
        }

        if (event.key === 'Backspace' && input === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const showSuggestions = loading || (input.trim().startsWith('#') && suggestions.length > 0);

    return (
        <div>
            <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
            <div
                className={`relative ${showSuggestions ? 'z-50' : ''} mt-1.5 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-200 ${disabled ? 'opacity-60' : ''}`}
            >
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[11px] font-bold text-green-700">
                        {tag}
                        <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); removeTag(tag); }}
                            disabled={disabled}
                            className="rounded-full text-green-600 hover:text-green-900 disabled:cursor-not-allowed"
                            aria-label={`Buang ${tag}`}
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={input}
                    disabled={disabled || tags.length >= maxTags}
                    onChange={(event) => { setInput(event.target.value); setError(''); }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => window.setTimeout(() => setSuggestions([]), 120)}
                    className="min-w-[9rem] flex-1 border-0 bg-transparent px-1 py-1 text-xs text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:ring-0"
                    placeholder={tags.length >= maxTags ? 'Maksimum 20 hashtag' : '#contoh'}
                    autoComplete="off"
                />
                {showSuggestions && (
                    <div className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                        {loading ? (
                            <p className="px-3 py-2 text-xs font-medium text-slate-500">Mencari hashtag...</p>
                        ) : (
                            suggestions
                                .filter((suggestion) => !tags.some((tag) => tag.toLocaleLowerCase() === suggestion.toLocaleLowerCase()))
                                .map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => addTag(suggestion)}
                                        className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700"
                                    >
                                        {suggestion}
                                    </button>
                                ))
                        )}
                    </div>
                )}
            </div>
            {error ? <p className="mt-1 text-[11px] font-semibold text-rose-500">{error}</p> : <p className="mt-1 text-[11px] text-slate-400">Tekan Enter untuk tambah hashtag.</p>}
        </div>
    );
}
