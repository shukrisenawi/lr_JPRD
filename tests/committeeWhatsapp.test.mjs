import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCommitteeWhatsapp } from '../resources/js/Utils/committeeWhatsapp.js';

test('formats names, phone numbers and UDM exactly for WhatsApp', () => {
    assert.equal(buildCommitteeWhatsapp([{ title: 'KETUA BIG DATA', members: [
        { level: 'udm', scope_name: 'HUJUNG BANDAR', voter: { name: 'ABU BIN ALI', phone_mobile: '0195168839' } },
        { level: 'udm', scope_name: 'KAMPUNG BIGIA', voter: { name: 'NAMA KEDUA', phone_home: '041234567' } },
    ] }]), 'SENARAI AHLI JAWATANKUASA JPRD BIG DATA\n\n1. *ABU BIN ALI* - 019-5168839 (HUJUNG BANDAR)\n2. *NAMA KEDUA* - 041234567 (KAMPUNG BIGIA)');
});

test('separates groups, restarts numbering and skips empty groups', () => {
    const text = buildCommitteeWhatsapp([
        { title: 'BIG DATA', members: [{}] },
        { title: 'KOSONG', members: [] },
        { title: 'DATA APP', members: [{ level: 'cawangan', parent_scope_name: 'UDM INDUK', scope_name: 'CAWANGAN', voter: { name: 'NAMA', phone_mobile: '+60195168839' } }] },
    ]);
    assert.match(text, /1\. \*-\* - - \(-\)\n\nSENARAI AHLI JAWATANKUASA JPRD DATA APP\n\n1\. \*NAMA\* - 019-5168839 \(UDM INDUK\)$/);
    assert.doesNotMatch(text, /KOSONG/);
});

test('uses voter UDM rather than JPRD scope for JPRD members', () => {
    const text = buildCommitteeWhatsapp([{ title: 'BIG DATA', members: [{ level: 'jprd', scope_name: 'JPRD', voter: { name: 'ABU', dm: 'HUJUNG BANDAR' } }] }]);
    assert.match(text, /\(HUJUNG BANDAR\)$/);
});
