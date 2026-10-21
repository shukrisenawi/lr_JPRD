const palette = {
    green: 'FF184D3C',
    ink: 'FF203B32',
    muted: 'FF63776E',
    pale: 'FFF1F6F3',
    line: 'FFDCE7E0',
    white: 'FFFFFFFF',
};

const fill = (color) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });

export async function buildCommitteeWorkbook(sections) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JPRD Jeneri';
    const sheet = workbook.addWorksheet('Jawatankuasa', {
        views: [{ showGridLines: false }],
        pageSetup: {
            paperSize: 9,
            orientation: 'portrait',
            fitToPage: false,
            scale: 100,
            horizontalCentered: true,
            margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.5, header: 0.15, footer: 0.2 },
        },
        headerFooter: { oddFooter: '&L&"Calibri"&9&K63776EJPRD JENERI&R&9&K63776EMuka surat &P / &N' },
    });
    sheet.columns = [{ width: 6 }, { width: 44 }, { width: 20 }, { width: 18 }];

    const mergedRow = (value, height, font, background) => {
        const row = sheet.addRow([value]);
        row.height = height;
        sheet.mergeCells(row.number, 1, row.number, 4);
        const cell = row.getCell(1);
        cell.font = { name: 'Calibri', color: { argb: palette.ink }, ...font };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        if (background) cell.fill = fill(background);
        return row;
    };

    sections.forEach((section, sectionIndex) => {
        const title = String(section.title || 'Tanpa Kumpulan').replace(/\bKETUA\b\s*/gi, '').trim();
        mergedRow('', 5, {}, palette.green);
        mergedRow('', 12, {});
        mergedRow('SENARAI AHLI JAWATANKUASA JPRD', 28, { size: 14, bold: true });
        mergedRow(title, Math.max(42, Math.ceil(title.length / 34) * 29), { size: 24, bold: true, color: { argb: palette.green } });
        mergedRow('SESI 2025/2027', 24, { size: 11, color: { argb: palette.muted } });
        if (section.subtitle) mergedRow(section.subtitle, 22, { size: 10, color: { argb: palette.muted } });
        mergedRow('', 18, {});

        const header = sheet.addRow(['Bil', 'Nama', 'No. KP', 'No. Tel']);
        header.height = 29;
        header.eachCell((cell, column) => {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: palette.white } };
            cell.fill = fill(palette.green);
            cell.alignment = { horizontal: column === 2 ? 'left' : 'center', vertical: 'middle', indent: column === 2 ? 1 : 0 };
        });

        section.members.forEach((member, index) => {
            const name = String(member.voter?.name || '-');
            const row = sheet.addRow([
                index + 1,
                name,
                String(member.voter?.no_kp || member.voter?.old_ic || '-'),
                String(member.voter?.phone_mobile || member.voter?.phone_home || '-'),
            ]);
            row.height = Math.max(31, Math.ceil(name.length / 38) * 15 + 12);
            row.eachCell((cell, column) => {
                cell.font = { name: 'Calibri', size: 11, bold: column === 2, color: { argb: column === 1 ? palette.muted : palette.ink } };
                cell.fill = fill(index % 2 === 0 ? palette.white : palette.pale);
                cell.alignment = { horizontal: column === 2 ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: column === 2 ? 1 : 0 };
                cell.border = { bottom: { style: 'hair', color: { argb: palette.line } } };
                if (column >= 3) cell.numFmt = '@';
            });
        });
        if (sectionIndex < sections.length - 1) sheet.lastRow.addPageBreak();
    });
    sheet.pageSetup.printArea = `A1:D${Math.max(sheet.rowCount, 1)}`;
    return workbook;
}

export async function downloadCommitteeExcel(filename, sections) {
    try {
        const workbook = await buildCommitteeWorkbook(sections);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace(/\.xlsx?$/i, '') + '.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error('Eksport Excel jawatankuasa gagal.', error);
        window.alert('Eksport Excel gagal. Sila cuba sekali lagi.');
    }
}

export function groupCommitteeExport(members, groups, subtitle) {
    const sections = new Map();
    members.forEach((member) => {
        const key = member.committee_group_id ?? 'ungrouped';
        const group = groups.find((item) => String(item.id) === String(key));
        if (!sections.has(key)) sections.set(key, { title: group?.name || 'Tanpa Kumpulan', subtitle, sortOrder: group?.sort_order ?? 999, members: [] });
        sections.get(key).members.push(member);
    });
    return [...sections.values()].sort((a, b) => a.sortOrder - b.sortOrder).map((section) => ({
        ...section,
        members: [...section.members].sort((a, b) => (a.position?.sort_order ?? 999) - (b.position?.sort_order ?? 999)),
    }));
}

export function udmPositionExport(positions) {
    return positions.filter((position) => position.members.length > 0).map((position) => ({
        title: position.name,
        members: position.members,
    }));
}
