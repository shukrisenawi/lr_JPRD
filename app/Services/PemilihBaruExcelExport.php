<?php

namespace App\Services;

use Illuminate\Support\Collection;
use RuntimeException;
use ZipArchive;

class PemilihBaruExcelExport
{
    public function create(Collection $records): string
    {
        $row = 0;
        $rows = [];
        $merges = [];
        $breaks = [];
        $addRow = function (array $values, int $style = 0, int $height = 32) use (&$row, &$rows): void {
            $row++;
            $cells = '';
            foreach ($values as $column => $value) {
                $reference = chr(65 + $column).$row;
                $cells .= '<c r="'.$reference.'" s="'.$style.'" t="inlineStr"><is><t xml:space="preserve">'.$this->escape((string) $value).'</t></is></c>';
            }
            $rows[] = '<row r="'.$row.'" ht="'.$height.'" customHeight="1">'.$cells.'</row>';
        };

        foreach ($records->groupBy(fn ($record) => $record->dm ?: 'TANPA UDM') as $udm => $udmRecords) {
            if ($row > 0) {
                $breaks[] = '<brk id="'.$row.'" min="0" max="16383" man="1"/>';
            }
            $addRow(['DPT UDM '.$udm], 1, 36);
            $merges[] = '<mergeCell ref="A'.$row.':F'.$row.'"/>';
            $bil = 0;
            foreach ($udmRecords->groupBy(fn ($record) => $record->locality ?: 'TANPA LOKALITI') as $locality => $localityRecords) {
                $addRow(['LOKALITI: '.$locality], 2, 24);
                $merges[] = '<mergeCell ref="A'.$row.':F'.$row.'"/>';
                $addRow(['Bil', 'Nama', 'Transaksi', 'No KP', 'Umur', 'No Rumah'], 3, 24);
                foreach ($localityRecords as $record) {
                    $addRow([++$bil, $record->name, $record->transaction, $record->no_kp, $record->umur, $record->no_rumah], 4);
                }
            }
        }
        if ($row === 0) {
            $addRow(['Tiada rekod mengikut tapisan semasa.'], 1);
            $merges[] = '<mergeCell ref="A1:F1"/>';
        }

        $sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
            .'<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>'
            .'<cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="2" width="32" customWidth="1"/>'
            .'<col min="3" max="3" width="24" customWidth="1"/><col min="4" max="4" width="19" customWidth="1"/>'
            .'<col min="5" max="5" width="7" customWidth="1"/><col min="6" max="6" width="13" customWidth="1"/></cols>'
            .'<sheetData>'.implode('', $rows).'</sheetData>'
            .'<mergeCells count="'.count($merges).'">'.implode('', $merges).'</mergeCells>'
            .'<printOptions horizontalCentered="1"/>'
            .'<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'
            .'<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>'
            .'<headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter>'
            .($breaks ? '<rowBreaks count="'.count($breaks).'" manualBreakCount="'.count($breaks).'">'.implode('', $breaks).'</rowBreaks>' : '')
            .'</worksheet>';

        $path = tempnam(sys_get_temp_dir(), 'dpt-udm-');
        if ($path === false) {
            throw new RuntimeException('Fail sementara eksport tidak dapat dicipta.');
        }
        $zip = new ZipArchive;
        try {
            if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Fail Excel tidak dapat dicipta.');
            }
            $files = [
                '[Content_Types].xml' => '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
                '_rels/.rels' => '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
                'xl/workbook.xml' => '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DPT UDM" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">\'DPT UDM\'!$A$1:$F$'.$row.'</definedName></definedNames></workbook>',
                'xl/_rels/workbook.xml.rels' => '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
                'xl/styles.xml' => $this->styles(),
                'xl/worksheets/sheet1.xml' => $sheet,
            ];
            foreach ($files as $name => $contents) {
                if (! $zip->addFromString($name, $contents)) {
                    throw new RuntimeException('Kandungan Excel tidak dapat ditulis.');
                }
            }
            if (! $zip->close()) {
                throw new RuntimeException('Fail Excel tidak dapat disimpan.');
            }
        } catch (\Throwable $exception) {
            @unlink($path);
            throw $exception;
        }

        return $path;
    }

    private function escape(string $value): string
    {
        $value = preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $value) ?? '';

        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function styles(): string
    {
        return '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="20"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            .'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills>'
            .'<borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="5"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
            .'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
            .'<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>'
            .'<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
            .'<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>'
            .'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    }
}
