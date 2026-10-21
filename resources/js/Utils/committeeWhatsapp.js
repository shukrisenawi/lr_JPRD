import { formatPhoneNumber } from './formatPhoneNumber.js';

const singleLine = (value) => String(value || '-').replace(/[\r\n]+/g, ' ').trim();

export function buildCommitteeWhatsapp(sections) {
    return sections.filter((section) => section.members.length > 0).map((section) => {
        const title = singleLine(section.title).replace(/\bKETUA\b\s*/gi, '').trim();
        return [
            `SENARAI AHLI JAWATANKUASA JPRD ${title}`,
            '',
            ...section.members.map((member, index) => {
                const name = singleLine(member.voter?.name).replace(/\*/g, '');
                const phone = formatPhoneNumber(member.voter?.phone_mobile || member.voter?.phone_home).replace(/\s+/g, '');
                const udm = singleLine(member.level === 'udm'
                    ? member.scope_name || member.voter?.dm
                    : member.parent_scope_name || member.voter?.dm);
                return `${index + 1}. *${name}* - ${phone} (${udm})`;
            }),
        ].join('\n');
    }).join('\n\n');
}
