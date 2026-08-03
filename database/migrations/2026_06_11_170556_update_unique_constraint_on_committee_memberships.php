<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        DB::statement('ALTER TABLE committee_memberships DROP INDEX committee_memberships_unique_assignment');

        DB::statement('ALTER TABLE committee_memberships ADD UNIQUE KEY committee_memberships_unique_assignment (pemilih_record_id, committee_position_id, committee_group_id, level, scope_key)');

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        DB::statement('ALTER TABLE committee_memberships DROP INDEX committee_memberships_unique_assignment');

        DB::statement('ALTER TABLE committee_memberships ADD UNIQUE KEY committee_memberships_unique_assignment (pemilih_record_id, committee_position_id, level, scope_key)');

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');
    }
};
