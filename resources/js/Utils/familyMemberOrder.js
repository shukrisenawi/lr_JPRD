function icBirthDateKey(voter) {
    const currentYearShort = new Date().getFullYear() % 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const identity of [voter.no_kp, voter.old_ic]) {
        const digits = String(identity || '').replace(/\D/g, '');
        if (digits.length !== 12) continue;

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
        ) continue;

        return year * 10000 + month * 100 + day;
    }

    return null;
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
