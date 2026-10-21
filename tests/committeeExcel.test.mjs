import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { buildCommitteeWorkbook, downloadCommitteeExcel, groupCommitteeExport, udmPositionExport } from '../resources/js/Utils/committeeExcel.js';

const member = (groupId, name = 'NAMA UJIAN') => ({
    committee_group_id: groupId,
    voter: { name, no_kp: '001122334455', phone_mobile: '0123456789' },
});

test('UDM position groups sharing a parent remain separate with formal headings and manual page breaks', async () => {
    const sections = udmPositionExport([
        { name: 'KETUA BIG DATA', members: [member(1, 'AHLI BIG DATA')] },
        { name: 'KETUA DATA APP', members: [member(1, 'AHLI DATA APP'), member(1, 'AHLI DATA APP KEDUA')] },
        { name: 'KOSONG', members: [] },
    ]);
    assert.equal(sections.length, 2);
    const workbook = await buildCommitteeWorkbook(sections);
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getCell('A3').value, 'SENARAI AHLI JAWATANKUASA JPRD');
    assert.equal(sheet.getCell('A4').value, 'BIG DATA');
    assert.equal(sheet.getCell('A5').value, 'SESI 2025/2027');
    assert.equal(sheet.getRow(6).getCell(1).value, '');
    assert.deepEqual(sheet.getRow(7).values.slice(1), ['Bil', 'Nama', 'No. KP', 'No. Tel']);
    assert.equal(sheet.getCell('B8').value, 'AHLI BIG DATA');
    assert.equal(sheet.getCell('A12').value, 'DATA APP');
    assert.equal(sheet.getCell('B16').value, 'AHLI DATA APP');
    assert.equal(sheet.getCell('A16').value, 1);
    assert.deepEqual(sheet.rowBreaks.map((item) => item.id), [8]);
    assert.equal(sheet.lastRow.getCell(2).value, 'AHLI DATA APP KEDUA');
    assert.equal(sheet.pageSetup.orientation, 'portrait');
    assert.equal(sheet.pageSetup.paperSize, 9);
    assert.equal(sheet.pageSetup.fitToPage, false);
});

test('writes a genuine XLSX ZIP and reads it back with exact text, leading zeros and styles intact', async () => {
    const workbook = await buildCommitteeWorkbook([{ title: 'KETUA A & B', members: [member(1, '<UJIAN> & NAMA'), member(1, 'NAMA KEDUA')] }]);
    const buffer = await workbook.xlsx.writeBuffer();
    assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), 'PK');
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);
    const sheet = loaded.worksheets[0];
    assert.equal(sheet.getCell('A4').value, 'A & B');
    assert.equal(sheet.getCell('B8').value, '<UJIAN> & NAMA');
    assert.equal(sheet.getCell('C8').value, '001122334455');
    assert.equal(sheet.getCell('D8').value, '0123456789');
    assert.equal(sheet.getCell('C8').numFmt, '@');
    assert.equal(sheet.getCell('A7').fill.fgColor.argb, 'FF184D3C');
    assert.equal(sheet.getCell('A9').fill.fgColor.argb, 'FFF1F6F3');
    assert.equal(sheet.getCell('B8').font.bold, true);
    assert.equal(sheet.views[0].showGridLines, false);
    assert.equal(sheet.columns.length, 4);
});

test('popup exports fall back to old IC and home phone without a redundant page break', async () => {
    const workbook = await buildCommitteeWorkbook([{ title: 'KETUA CONTOH', subtitle: 'UDM — KAMPUNG BIGIA', members: [{ voter: { old_ic: 'A001', phone_home: '041234567' } }] }]);
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getCell('A6').value, 'UDM — KAMPUNG BIGIA');
    assert.equal(sheet.getCell('B9').value, '-');
    assert.equal(sheet.getCell('C9').value, 'A001');
    assert.equal(sheet.getCell('D9').value, '041234567');
    assert.equal(sheet.rowBreaks.length, 0);
});

test('groups missing assignments and orders committees and positions', () => {
    const sections = groupCommitteeExport([member(null), { ...member(2), position: { sort_order: 2 } }, { ...member(2), position: { sort_order: 1 } }], [{ id: 2, name: 'CONTOH', sort_order: 1 }]);
    assert.equal(sections[0].title, 'CONTOH');
    assert.equal(sections[0].members[0].position.sort_order, 1);
    assert.equal(sections[1].title, 'Tanpa Kumpulan');
});

test('management exports preserve selected columns, position names and portrait print width', async () => {
    const workbook = await buildCommitteeWorkbook([{ title: 'CONTOH', members: [{ ...member(1), positionName: 'SETIAUSAHA' }] }], ['bil', 'jawatan', 'nama', 'ic', 'telefon']);
    const sheet = workbook.worksheets[0];
    assert.deepEqual(sheet.getRow(7).values.slice(1), ['Bil', 'Jawatan', 'Nama', 'No. KP', 'No. Tel']);
    assert.equal(sheet.getCell('B8').value, 'SETIAUSAHA');
    assert.equal(sheet.getCell('D8').value, '001122334455');
    assert.equal(sheet.pageSetup.printArea, 'A1:E8');
    assert.ok(sheet.columns.reduce((sum, column) => sum + column.width, 0) <= 88.01);
    const buffer = await workbook.xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);
    assert.equal(loaded.worksheets[0].getCell('D8').numFmt, '@');
});

test('single selected column exports a valid workbook without invalid merges', async () => {
    const workbook = await buildCommitteeWorkbook([{ title: 'CONTOH', members: [member(1)] }], ['bil']);
    assert.equal(workbook.worksheets[0].getColumn(1).width, 88);
    assert.equal(workbook.worksheets[0].getCell('A8').value, 1);
    await workbook.xlsx.writeBuffer();
});

test('download uses an XLSX extension and MIME type even with a legacy XLS filename', async () => {
    let downloaded;
    let blob;
    const original = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    globalThis.document = {
        createElement: () => ({ click() { downloaded = this.download; }, remove() {} }),
        body: { appendChild() {} },
    };
    URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    try {
        await downloadCommitteeExcel('AJK_UDM_KETUA_DATA_APPS.xls', [{ title: 'TEST', members: [member(1)] }]);
        assert.equal(downloaded, 'AJK_DATA_APPS.xlsx');
        assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        assert.equal(Buffer.from(await blob.arrayBuffer()).subarray(0, 2).toString(), 'PK');
    } finally {
        globalThis.document = original.document;
        URL.createObjectURL = original.create;
        // Leave the pending URL cleanup harmless after the test restores browser globals.
        setTimeout(() => { URL.revokeObjectURL = original.revoke; }, 1100);
    }
});
