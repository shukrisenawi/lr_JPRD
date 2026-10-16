import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import TelegramPhoneModal from './Components/TelegramPhoneModal';
import { notifyTelegramPhoneChange } from './Utils/telegram';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const uppercaseInputTypes = new Set(['text', 'search', 'tel', 'url', 'email']);

function uppercaseInputValue(event) {
    const target = event.target;
    const isTextArea = target instanceof HTMLTextAreaElement;
    const isTextInput = target instanceof HTMLInputElement && uppercaseInputTypes.has(target.type);

    if ((!isTextArea && !isTextInput) || target.readOnly || target.disabled) return;

    const value = target.value;
    const uppercaseValue = value.toLocaleUpperCase();

    if (value === uppercaseValue) return;

    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;
    const valueSetter = Object.getOwnPropertyDescriptor(
        isTextArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value',
    )?.set;

    valueSetter?.call(target, uppercaseValue);

    if (selectionStart !== null && selectionEnd !== null) {
        target.setSelectionRange(
            value.slice(0, selectionStart).toLocaleUpperCase().length,
            value.slice(0, selectionEnd).toLocaleUpperCase().length,
        );
    }
}

createInertiaApp({
    title: (title) => title,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        document.addEventListener('input', uppercaseInputValue, true);
        document.addEventListener('click', (event) => {
            const anchor = event.target.closest('a[href^="tg:"]');
            if (anchor) queueMicrotask(() => {
                if (!event.defaultPrevented) notifyTelegramPhoneChange(anchor.href);
            });
        }, true);

        root.render(<><App {...props} /><TelegramPhoneModal /></>);
    },
    progress: {
        color: '#4B5563',
    },
});
