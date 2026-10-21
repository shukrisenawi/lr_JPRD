const escapeXml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildCommitteeWorkbook(sections) {
    const borders = ['Bottom', 'Left', 'Right', 'Top'].map((position) => `<Border ss:Position="${position}" ss:LineStyle="Continuous" ss:Weight="1"/>`).join('');
    const styles = `<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
        <Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="20" ss:Bold="1"/></Style>
        <Style ss:ID="subtitle"><Alignment ss:Horizontal="Center"/><Font ss:Size="11" ss:Color="#475569"/></Style>
        <Style ss:ID="header"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/><Borders>${borders}</Borders></Style>
        <Style ss:ID="cell"><Borders>${borders}</Borders><NumberFormat ss:Format="@"/></Style>
        <Style ss:ID="center" ss:Parent="cell"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>`;
    let rowCount = 0;
    const breaks = [];
    const cell = (value, style = 'cell', type = 'String') => `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
    const rows = sections.map((section, index) => {
        if (index > 0) breaks.push(rowCount);
        const title = String(section.title || 'Tanpa Kumpulan').replace(/\bKETUA\b\s*/gi, '').trim();
        const subtitle = section.subtitle ? `<Row ss:Height="22"><Cell ss:MergeAcross="3" ss:StyleID="subtitle"><Data ss:Type="String">${escapeXml(section.subtitle)}</Data></Cell></Row>` : '';
        const heading = section.formalHeading
            ? `<Row ss:Height="54"><Cell ss:MergeAcross="3" ss:StyleID="title"><Data ss:Type="String">SENARAI AHLI JAWATANKUASA JPRD</Data></Cell></Row>
                <Row ss:Height="40"><Cell ss:MergeAcross="3" ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>
                <Row ss:Height="28"><Cell ss:MergeAcross="3" ss:StyleID="subtitle"><Data ss:Type="String">SESI 2025/2027</Data></Cell></Row><Row ss:Height="22"/>`
            : `<Row ss:Height="54"><Cell ss:MergeAcross="3" ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>${subtitle}`;
        rowCount += (section.formalHeading ? 5 : 2 + (section.subtitle ? 1 : 0)) + section.members.length;
        return `${heading}
            <Row ss:Height="26">${['Bil', 'Nama', 'No. KP', 'No. Tel'].map((label) => cell(label, 'header')).join('')}</Row>
            ${section.members.map((member, memberIndex) => `<Row ss:AutoFitHeight="1" ss:Height="30">${cell(memberIndex + 1, 'center', 'Number')}${cell(member.voter?.name || '-')}${cell(member.voter?.no_kp || member.voter?.old_ic || '-', 'center')}${cell(member.voter?.phone_mobile || member.voter?.phone_home || '-', 'center')}</Row>`).join('')}`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <Styles>${styles}</Styles><Worksheet ss:Name="Jawatankuasa"><Table>
        ${[32, 260, 110, 100].map((width) => `<Column ss:Width="${width}"/>`).join('')}${rows}</Table>
        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Portrait"/><PageMargins x:Bottom="0.5" x:Left="0.3" x:Right="0.3" x:Top="0.5"/></PageSetup><Print><PaperSizeIndex>9</PaperSizeIndex><Scale>100</Scale></Print></WorksheetOptions>
        ${breaks.length ? `<PageBreaks xmlns="urn:schemas-microsoft-com:office:excel"><RowBreaks>${breaks.map((row) => `<RowBreak><Row>${row}</Row></RowBreak>`).join('')}</RowBreaks></PageBreaks>` : ''}
        </Worksheet></Workbook>`;
}

export function downloadCommitteeExcel(filename, sections) {
    const blob = new Blob(['\uFEFF' + buildCommitteeWorkbook(sections)], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
        formalHeading: true,
        members: position.members,
    }));
}
