export function notifyTelegramPhoneChange(url) {
    const text = new URL(url, window.location.origin).searchParams.get('text') || '';
    const match = text.match(/^\/kemastel\s+(.+)$/);
    if (match) window.dispatchEvent(new CustomEvent('telegram:phone-change', { detail: { identity: match[1].trim() } }));
}

export function openTelegram(url, popup) {
    if (popup) popup.location.replace(url);
    else window.open(url, '_blank');
    notifyTelegramPhoneChange(url);
}
