<?php

namespace App\Console\Commands;

use App\Services\SpokasMemberImportService;
use Illuminate\Console\Command;
use JsonException;

class ImportSpokasMembers extends Command
{
    protected $signature = 'spokas:import
                            {file : Laluan ke fail JSON export SPoKAS}
                            {--replace : Kosongkan jadual sebelum import}';

    protected $description = 'Import senarai ahli SPoKAS ke jadual spokas_members';

    public function handle(SpokasMemberImportService $importer): int
    {
        $path = (string) $this->argument('file');

        if (! is_file($path) || ! is_readable($path)) {
            $this->error("Fail tidak boleh dibaca: {$path}");

            return self::FAILURE;
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            $this->error("Gagal membaca fail: {$path}");

            return self::FAILURE;
        }

        try {
            $document = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

            if (! is_array($document)) {
                throw new JsonException('Root JSON bukan objek.');
            }

            $summary = $importer->import($document, (bool) $this->option('replace'));
        } catch (JsonException|\InvalidArgumentException $exception) {
            $this->error("Import gagal: {$exception->getMessage()}");

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Import berjaya: %d rekod diterima, %d rekod ditulis, %d halaman, source %s.',
            $summary['rows_received'],
            $summary['rows_written'],
            $summary['pages'],
            $summary['source_key']
        ));

        $this->line('Status: '.collect($summary['status_counts'])
            ->map(fn (int $count, string $status): string => "{$status}={$count}")
            ->implode(', '));

        return self::SUCCESS;
    }
}
