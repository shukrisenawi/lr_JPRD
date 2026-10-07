function noKpBirthDate(noKp) {
    const currentYearShort = new Date().getFullYear() % 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const digits = String(noKp || '').replace(/\D/g, '');
    if (digits.length !== 12) return null;

    const yearShort = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const day = Number(digits.slice(4, 6));
    const year = yearShort > currentYearShort ? 1900 + yearShort : 2000 + yearShort;
    const birthDate = new Date(year, month - 1, day);

    if (
        birthDate.getFullYear() !== year
        || birthDate.getMonth() !== month - 1
        || birthDate.getDate() !== day
        || birthDate > today
    ) return null;

    return birthDate;
}

export function calculateAgeFromNoKp(noKp) {
    const birthDate = noKpBirthDate(noKp);
    if (!birthDate) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
        today.getMonth() < birthDate.getMonth()
        || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) age -= 1;

    return age;
}

export function familyMemberTone(voter) {
    const culaCode = String(voter.cula_code || '').trim().toUpperCase();
    if (culaCode !== '2' && !culaCode.startsWith('3')) return 'neutral';

    const gender = String(voter.gender || '').trim().toUpperCase();
    if (['P', 'PEREMPUAN', 'FEMALE'].includes(gender)) return 'pink';
    if (['L', 'LELAKI', 'MALE'].includes(gender)) return 'green';

    return 'neutral';
}

function icBirthDateKey(voter) {
    const birthDate = noKpBirthDate(voter.no_kp);
    if (!birthDate) return null;

    return birthDate.getFullYear() * 10000 + (birthDate.getMonth() + 1) * 100 + birthDate.getDate();
}

export function sortFamilyMembers(members = [], fatherId = null) {
    const hasFather = fatherId !== null && fatherId !== undefined && fatherId !== '';

    return [...members].sort((left, right) => {
        const leftIsFather = hasFather && Number(left.id) === Number(fatherId);
        const rightIsFather = hasFather && Number(right.id) === Number(fatherId);
        if (leftIsFather !== rightIsFather) return leftIsFather ? -1 : 1;

        const leftBirthDate = icBirthDateKey(left);
        const rightBirthDate = icBirthDateKey(right);
        if (leftBirthDate === null && rightBirthDate !== null) return 1;
        if (rightBirthDate === null && leftBirthDate !== null) return -1;
        if (leftBirthDate !== rightBirthDate) return leftBirthDate - rightBirthDate;

        return String(left.name || '').localeCompare(String(right.name || ''), 'ms');
    });
}
