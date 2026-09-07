export function formatPhoneNumber(phone) {
    const value = String(phone ?? '').trim();
    if (!value) return '-';

    const digits = value.replace(/\D/g, '');
    const normalized = digits.startsWith('60') ? `0${digits.slice(2)}` : digits;

    if (normalized.length === 10) {
        return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)} ${normalized.slice(6)}`;
    }

    if (normalized.length === 11) {
        return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)} ${normalized.slice(7)}`;
    }

    return value;
}
