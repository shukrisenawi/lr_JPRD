<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApiKeyAuthenticator;
use App\Services\PemilihReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function udm(Request $request, ApiKeyAuthenticator $apiKeyAuthenticator, PemilihReportService $reportService): JsonResponse
    {
        if ($error = $apiKeyAuthenticator->validate($request)) {
            return $error;
        }

        $report = $reportService->buildFromDatabase();
        $completedByDm = $report['completed_by_dm'] ?? [];
        $completedCulaByDm = $report['completed_cula_by_dm'] ?? [];
        $culaByDm = [];
        $dmDetails = [];

        foreach ($report['cula_by_dm'] ?? [] as $row) {
            $culaByDm[$row['key']] = $row['cula_breakdown'] ?? [];
        }

        foreach ($report['dm_details'] ?? [] as $row) {
            $dmDetails[$row['key']] = $row['race_breakdown'] ?? [];
        }

        $getCulaSum = static function (array $breakdown, array $codes): int {
            $byCode = [];
            foreach ($breakdown as $item) {
                $byCode[$item['code']] = (int) $item['total'];
            }

            $total = 0;
            foreach ($codes as $code) {
                $total += $byCode[$code] ?? 0;
            }

            return $total;
        };

        $getRaceCount = static function (array $breakdown, array $names, string $metric = 'total'): int {
            foreach ($breakdown as $item) {
                if (in_array(strtoupper((string) ($item['code'] ?? '')), $names, true)) {
                    return (int) ($item[$metric] ?? $item['total'] ?? 0);
                }
            }

            return 0;
        };

        $completedSum = static function (array $completed, array $codes): int {
            $total = 0;
            foreach ($codes as $code) {
                $total += (int) ($completed[$code] ?? 0);
            }

            return $total;
        };

        $rows = array_map(function (array $row) use ($culaByDm, $dmDetails, $completedByDm, $completedCulaByDm, $getCulaSum, $getRaceCount, $completedSum): array {
            $culaBreakdown = $culaByDm[$row['key']] ?? [];
            $raceBreakdown = $dmDetails[$row['key']] ?? [];
            $completed = $completedCulaByDm[$row['code']] ?? [];

            return [
                'key' => $row['key'],
                'code' => $row['code'],
                'name' => $row['name'],
                'total' => (int) $row['total'],
                'siap_cula' => (int) ($completedByDm[$row['code']] ?? 0),
                'active_total' => (int) ($row['active_total'] ?? max(0, $row['total'] - $getCulaSum($culaBreakdown, ['8']))),
                'JP' => (int) ($row['active_total'] ?? max(0, $row['total'] - $getCulaSum($culaBreakdown, ['8']))),
                'L' => (int) ($row['active_male'] ?? $row['male']),
                'P' => (int) ($row['active_female'] ?? $row['female']),
                'M' => $getRaceCount($raceBreakdown, ['MELAYU', 'M'], 'active_total'),
                'C' => $getRaceCount($raceBreakdown, ['CINA', 'C'], 'active_total'),
                'I' => $getRaceCount($raceBreakdown, ['INDIA', 'I'], 'active_total'),
                'S' => $getRaceCount($raceBreakdown, ['SIAM', 'S'], 'active_total'),
                'PAS' => $getCulaSum($culaBreakdown, ['2']),
                '1A' => $getCulaSum($culaBreakdown, ['1A']),
                '1B' => $getCulaSum($culaBreakdown, ['1B']),
                '1P' => $getCulaSum($culaBreakdown, ['1P']),
                'PAS_TOTAL' => $getCulaSum($culaBreakdown, ['2', '3B', '3D', '3K', '3M', '3P', '3U']),
                'PBBM' => $getCulaSum($culaBreakdown, ['10']),
                'BN' => $getCulaSum($culaBreakdown, ['1']),
                'BN_TOTAL' => $getCulaSum($culaBreakdown, ['1', '1A', '1B', '1P']),
                'PH' => $getCulaSum($culaBreakdown, ['5']),
                'GTA' => 0,
                'PLK' => $getCulaSum($culaBreakdown, ['3B', '3D', '3K', '3M', '3P', '3U']),
                'Atas Pagar' => $getCulaSum($culaBreakdown, ['4']),
                'Tak Kenal' => $getCulaSum($culaBreakdown, ['7']),
                'Mati' => $getCulaSum($culaBreakdown, ['8']),
                'CULA' => (int) $row['belum_dicula'],
                'completed_PAS' => $completedSum($completed, ['2']),
                'completed_PBBM' => $completedSum($completed, ['10']),
                'completed_BN' => $completedSum($completed, ['1']),
                'completed_PH' => $completedSum($completed, ['5']),
                'completed_GTA' => 0,
                'completed_PLK' => $completedSum($completed, ['3B', '3D', '3K', '3M', '3P', '3U']),
                'completed_AP' => $completedSum($completed, ['4']),
                'completed_TK' => $completedSum($completed, ['7']),
                'completed_Mati' => $completedSum($completed, ['8']),
            ];
        }, $report['by_dm'] ?? []);

        return response()->json([
            'data' => $rows,
            'summary' => $report['summary'],
            'source' => $report['source'],
            'fetched_at' => now('Asia/Kuala_Lumpur')->toIso8601String(),
        ]);
    }
}
