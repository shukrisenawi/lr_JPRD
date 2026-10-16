export async function exportBirthdayVoters(voters, filters, groupName = '', search = '') {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JPrD';
    const months = ['JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN', 'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER'];
    const descriptions = [
        filters.locality && `Lokaliti: ${filters.locality}`,
        groupName && `Group: ${groupName}`,
        filters.keturunan && `Keturunan: ${filters.keturunan}`,
        filters.jantina && `Jantina: ${filters.jantina}`,
        filters.umur_dari && `Umur dari: ${filters.umur_dari}`,
        filters.umur_hingga && `Umur hingga: ${filters.umur_hingga}`,
        filters.bulan_lahir && `Bulan lahir: ${filters.bulan_lahir.split(',').map(m => months[Number(m) - 1]).filter(Boolean).join(', ')}`,
        filters.tarikh_lahir && `Tarikh lahir: ${filters.tarikh_lahir}`,
        filters.cula_codes && `Kod cula: ${filters.cula_codes}`,
        filters.has_phone && 'Ada telefon',
        filters.birthday_image_status && `Gambar hari jadi: ${filters.birthday_image_status === 'uploaded' ? 'Telah dimuat naik' : 'Belum dimuat naik'}`,
        filters.hashtags?.length && `Hashtag: ${filters.hashtags.join(', ')}`,
        search && `Carian: ${search}`,
    ].filter(Boolean);
    const grouped = new Map();
    voters.forEach(voter => {
        const udm = voter.dm || 'Tanpa UDM';
        if (!grouped.has(udm)) grouped.set(udm, []);
        grouped.get(udm).push(voter);
    });
    if (!grouped.size) grouped.set(filters.udm || 'Semua UDM', []);
    for (const [udm, records] of grouped) {
        const name = `${workbook.worksheets.length + 1} ${udm}`.replace(/[\\/*?:\[\]]/g, '-').slice(0, 31);
        const sheet = workbook.addWorksheet(name, {
            views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5', margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } },
            headerFooter: { oddFooter: '&LData Pemilih&C&P / &N&R&D' },
        });
        sheet.columns = [6, 34, 48, 20, 20, 12].map(width => ({ width }));
        const title = (row, text, size, color) => {
            sheet.mergeCells(row, 1, row, 6);
            const cell = sheet.getCell(row, 1);
            cell.value = text;
            cell.font = { name: 'Calibri', size, bold: row < 3, color: { argb: color } };
            cell.alignment = { vertical: 'middle', wrapText: true };
        };
        title(1, 'DATA PEMILIH', 20, 'FF166534');
        title(2, `UDM: ${udm}`, 13, 'FF1E293B');
        title(3, descriptions.length ? `Tapisan: ${descriptions.join(' | ')}` : 'Tapisan: Tiada', 10, 'FF475569');
        title(4, `Jumlah pemilih: ${records.length}  |  Tarikh: ${new Date().toLocaleDateString('ms-MY')}`, 10, 'FF475569');
        sheet.getRow(1).height = 32;
        sheet.getRow(2).height = 24;
        sheet.getRow(3).height = Math.max(28, Math.ceil(descriptions.join(' | ').length / 125) * 15);
        sheet.getRow(4).height = 24;
        sheet.getRow(5).values = ['BIL', 'NAMA', 'ALAMAT', 'NO KP', 'TEL', 'CULA'];
        sheet.getRow(5).height = 25;
        sheet.getRow(5).eachCell(cell => {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        records.forEach((voter, index) => {
            const address = [voter.no_rumah && voter.no_rumah !== '-' && `No. ${voter.no_rumah}`, voter.address || voter.locality].filter(Boolean).join(', ');
            const row = sheet.addRow([index + 1, voter.name || '-', address || '-', String(voter.no_kp || voter.old_ic || '-'), String(voter.phone_mobile || voter.phone_home || '-'), voter.cula_code || '-']);
            row.height = Math.max(32, Math.ceil(Math.max((voter.name || '').length / 30, address.length / 44)) * 15 + 8);
            row.eachCell(cell => {
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                cell.alignment = { vertical: 'middle', wrapText: true };
                cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
                if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
            });
            [1, 4, 5, 6].forEach(col => { row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
            row.getCell(4).numFmt = '@';
            row.getCell(5).numFmt = '@';
        });
        sheet.autoFilter = 'A5:F5';
        sheet.pageSetup.printArea = `A1:F${Math.max(5, sheet.rowCount)}`;
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `DATA_PEMILIH_${(filters.udm || 'SEMUA_UDM').replace(/[^a-z0-9_-]/gi, '_')}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
