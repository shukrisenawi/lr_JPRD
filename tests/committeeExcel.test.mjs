import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCommitteeWorkbook, groupCommitteeExport } from '../resources/js/Utils/committeeExcel.js';

const member = (groupId, name = 'NAMA UJIAN') => ({
    committee_group_id: groupId,
    voter: { name, no_kp: '001122334455', phone_mobile: '0123456789' },
});

test('exports four columns, portrait A4 and a page break before each subsequent group', () => {
    const groups = [{ id: 1, name: 'KETUA PK PENGUNDI WANITA MUDA', sort_order: 1 }, { id: 2, name: 'KUMPULAN B', sort_order: 2 }];
    const sections = groupCommitteeExport([member(2), member(1), member(1)], groups, 'JPRD');
    const xml = buildCommitteeWorkbook(sections);
    assert.equal(sections[0].members.length, 2);
    assert.match(xml, />PK PENGUNDI WANITA MUDA<\/Data>/);
    assert.doesNotMatch(xml, /KETUA|>Jawatan<|>Peringkat</);
    assert.equal((xml.match(/<Column /g) || []).length, 4);
    for (const label of ['Bil', 'Nama', 'No. KP', 'No. Tel']) assert.equal((xml.match(new RegExp(`>${label.replaceAll('.', '\\.')}<`, 'g')) || []).length, 2);
    assert.match(xml, /x:Orientation="Portrait"/);
    assert.match(xml, /<PaperSizeIndex>9<\/PaperSizeIndex>/);
    assert.match(xml, /<RowBreak><Row>5<\/Row><\/RowBreak>/);
    assert.match(xml, /ss:Type="String">001122334455/);
    assert.match(xml, /ss:Type="String">0123456789/);
    assert.equal((xml.match(/ss:Type="Number">1<\/Data>/g) || []).length, 2);
});

test('popup export escapes XML, uses old IC/home phone fallbacks and omits unnecessary breaks', () => {
    const xml = buildCommitteeWorkbook([{ title: 'KETUA A & B', members: [{ voter: { name: '<UJIAN>', old_ic: 'A001', phone_home: '041234567' } }] }]);
    assert.match(xml, />A &amp; B<\/Data>/);
    assert.match(xml, /&lt;UJIAN&gt;/);
    assert.match(xml, />A001<\/Data>/);
    assert.match(xml, />041234567<\/Data>/);
    assert.doesNotMatch(xml, /<PageBreaks/);
});

test('groups missing assignments together and calculates every break without subtitle rows', () => {
    const sections = groupCommitteeExport([member(null), member(2), member(3)], []);
    const xml = buildCommitteeWorkbook(sections);
    assert.equal(sections[0].title, 'Tanpa Kumpulan');
    assert.match(xml, /<RowBreak><Row>3<\/Row><\/RowBreak>/);
    assert.match(xml, /<RowBreak><Row>6<\/Row><\/RowBreak>/);
});
