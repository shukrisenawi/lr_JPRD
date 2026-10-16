import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { exportBirthdayVoters } from '../resources/js/Utils/exportBirthdayVoters.js';

let blob;
URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
URL.revokeObjectURL = () => {};
globalThis.document = { createElement: () => ({ click() {} }) };
await exportBirthdayVoters([
    { dm: 'UDM A', name: 'TEST A', no_kp: '001234567890', phone_mobile: '0123456789', cula_code: '1', address: 'ALAMAT' },
    { dm: 'UDM B', name: 'TEST B', cula_code: '4' },
], { bulan_lahir: '1' });
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(await blob.arrayBuffer());
assert.equal(workbook.worksheets.length, 2);
for (const sheet of workbook.worksheets) {
    assert.equal(sheet.getCell('A1').value, 'DATA PEMILIH');
    assert.equal(sheet.pageSetup.printTitlesRow, '1:5');
    assert.equal(sheet.pageSetup.fitToWidth, 1);
    assert.equal(sheet.pageSetup.fitToHeight, 0);
    assert.deepEqual(sheet.getRow(5).values.slice(1), ['BIL', 'NAMA', 'ALAMAT', 'NO KP', 'TEL', 'CULA']);
    assert.match(sheet.getCell('A3').value, /JANUARI/);
}
assert.equal(workbook.worksheets[0].getCell('F6').value, '1');
assert.equal(workbook.worksheets[0].getCell('D6').value, '001234567890');
assert.equal(workbook.worksheets[0].getCell('E6').value, '0123456789');
console.log('Birthday export passed: separate UDM sheets, print titles, filters, columns, raw codes and leading zeros.');
