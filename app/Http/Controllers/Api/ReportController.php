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

        $completedSum = static function (array $completed, array $codes): int {
            $total = 0;
            foreach ($codes as $code) {
                $total += (int) ($completed[$code] ?? 0);
            }

            return $total;
        };

        $rows = array_map(function (array $row) use ($culaByDm, $dmDetails, $completedByDm, $completedCulaByDm, $getCulaSum, $completedSum): array {
            $culaBreakdown = $culaByDm[$row['key']] ?? [];
            $raceBreakdown = $dmDetails[$row['key']] ?? [];
            $completed = $completedCulaByDm[$row['code']] ?? [];

            return [
                'key' => $row['key'],
                'code' => $row['code'],
                'name' => $row['name'],
                'total' => (int) $row['total'],
                'siap_cula' => (int) ($completedByDm[$row['code']] ?? 0),
                'JP' => (int) $row['total'] - $getCulaSum($culaBreakdown, ['8']),
                'L' => (int) $row['male'],
                'P' => (int) $row['female'],
                'M' => $getCulaSum($raceBreakdown, ['MELAYU', 'M']),
                'C' => $getCulaSum($raceBreakdown, ['CINA', 'C']),
                'I' => $getCulaSum($raceBreakdown, ['INDIA', 'I']),
                'S' => $getCulaSum($raceBreakdown, ['SIAM', 'S']),
                'PAS' => $getCulaSum($culaBreakdown, ['2']),
                'PBBM' => $getCulaSum($culaBreakdown, ['10']),
                'BN' => $getCulaSum($culaBreakdown, ['1', '1A', '1B', '1P']),
                'PH' => $getCulaSum($culaBreakdown, ['5']),
                'GTA' => 0,
                'PLK' => $getCulaSum($culaBreakdown, ['3B', '3D', '3K', '3M', '3P', '3U']),
                'Atas Pagar' => $getCulaSum($culaBreakdown, ['4']),
                'Tak Kenal' => $getCulaSum($culaBreakdown, ['7']),
                'Mati' => $getCulaSum($culaBreakdown, ['8']),
                'CULA' => (int) $row['belum_dicula'],
                'completed_PAS' => $completedSum($completed, ['2']),
                'completed_PBBM' => $completedSum($completed, ['10']),
                'completed_BN' => $completedSum($completed, ['1', '1A', '1B', '1P']),
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
