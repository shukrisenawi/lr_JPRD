const palette = {
    green: 'FF184D3C',
    ink: 'FF203B32',
    muted: 'FF63776E',
    pale: 'FFF1F6F3',
    line: 'FFDCE7E0',
    white: 'FFFFFFFF',
};

const fill = (color) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });

export async function buildCommitteeWorkbook(sections, selectedColumns = ['bil', 'nama', 'ic', 'telefon']) {
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
    const definitions = {
        bil: { label: 'Bil', width: 6, value: (_, index) => index + 1 },
        nama: { label: 'Nama', width: 44, value: (member) => String(member.voter?.name || '-') },
        ic: { label: 'No. KP', width: 20, value: (member) => String(member.voter?.no_kp || member.voter?.old_ic || '-') },
        telefon: { label: 'No. Tel', width: 18, value: (member) => String(member.voter?.phone_mobile || member.voter?.phone_home || '-') },
        jawatan: { label: 'Jawatan', width: 24, value: (member) => String(member.positionName || member.position?.name || '-') },
    };
    const columns = selectedColumns.filter((key) => definitions[key]);
    if (!columns.length) throw new Error('Pilih sekurang-kurangnya satu kolum.');
    const totalWidth = columns.reduce((sum, key) => sum + definitions[key].width, 0);
    sheet.columns = columns.map((key) => ({ width: definitions[key].width * 88 / totalWidth }));

    const mergedRow = (value, height, font, background) => {
        const row = sheet.addRow([value]);
        row.height = height;
        if (columns.length > 1) sheet.mergeCells(row.number, 1, row.number, columns.length);
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
        if (section.committeeHeading) {
            const heading = `JAWATANKUASA ${String(section.title).toUpperCase()}`;
            mergedRow(heading, Math.max(42, Math.ceil(heading.length / 34) * 29), { size: 24, bold: true, color: { argb: palette.green } });
            mergedRow('Sesi 2025/2027', 24, { size: 14, bold: true });
        } else {
            mergedRow('SENARAI AHLI JAWATANKUASA JPRD', 28, { size: 14, bold: true });
            mergedRow(title, Math.max(42, Math.ceil(title.length / 34) * 29), { size: 24, bold: true, color: { argb: palette.green } });
            mergedRow('SESI 2025/2027', 24, { size: 11, color: { argb: palette.muted } });
        }
        if (section.subtitle) mergedRow(section.subtitle, 22, { size: 10, color: { argb: palette.muted } });
        mergedRow('', 18, {});

        const header = sheet.addRow(columns.map((key) => definitions[key].label));
        header.height = 29;
        header.eachCell((cell, column) => {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: palette.white } };
            cell.fill = fill(palette.green);
            const left = ['nama', 'jawatan'].includes(columns[column - 1]);
            cell.alignment = { horizontal: left ? 'left' : 'center', vertical: 'middle', indent: left ? 1 : 0 };
        });

        section.members.forEach((member, index) => {
            const row = sheet.addRow(columns.map((key) => definitions[key].value(member, index)));
            row.height = Math.max(31, ...columns.map((key, column) => ['nama', 'jawatan'].includes(key)
                ? Math.ceil(String(definitions[key].value(member, index)).length / Math.max(1, sheet.getColumn(column + 1).width - 6)) * 15 + 12
                : 31));
            row.eachCell((cell, column) => {
                const key = columns[column - 1];
                const left = ['nama', 'jawatan'].includes(key);
                cell.font = { name: 'Calibri', size: 11, bold: key === 'nama', color: { argb: key === 'bil' ? palette.muted : palette.ink } };
                cell.fill = fill(index % 2 === 0 ? palette.white : palette.pale);
                cell.alignment = { horizontal: left ? 'left' : 'center', vertical: 'middle', wrapText: true, indent: left ? 1 : 0 };
                cell.border = { bottom: { style: 'hair', color: { argb: palette.line } } };
                if (key !== 'bil') cell.numFmt = '@';
            });
        });
        if (sectionIndex < sections.length - 1) sheet.lastRow.addPageBreak();
    });
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(columns.length).letter}${Math.max(sheet.rowCount, 1)}`;
    return workbook;
}

export async function downloadCommitteeExcel(filename, sections, selectedColumns) {
    try {
        const workbook = await buildCommitteeWorkbook(sections, selectedColumns);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace(/UDM_KETUA_/gi, '').replace(/\.xlsx?$/i, '') + '.xlsx';
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

export function allCommitteeExport(members, groups) {
    const levels = { jprd: 'JPRD', udm: 'UDM', cawangan: 'Cawangan' };
    return [...groups].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999) || a.name.localeCompare(b.name)).flatMap((group) => {
        const scopes = new Map();
        members.filter((member) => String(member.committee_group_id) === String(group.id)).forEach((member) => {
            const key = JSON.stringify([member.level, member.scope_key]);
            if (!scopes.has(key)) scopes.set(key, {
                title: group.name,
                committeeHeading: true,
                subtitle: [levels[member.level] || member.level, member.parent_scope_name, member.scope_name].filter(Boolean).join(' — '),
                members: [],
            });
            scopes.get(key).members.push(member);
        });
        if (!scopes.size) return [{ title: group.name, committeeHeading: true, members: [] }];
        return [...scopes.values()].sort((a, b) => a.subtitle.localeCompare(b.subtitle)).map((section) => ({
            ...section,
            members: [...section.members].sort((a, b) => {
                const order = (member) => group.positions?.find((position) => String(position.id) === String(member.position?.id) && position.pivot_level === member.level)?.pivot_sort_order ?? member.position?.sort_order ?? 999;
                return order(a) - order(b) || (a.voter?.name || '').localeCompare(b.voter?.name || '');
            }),
        }));
    });
}
