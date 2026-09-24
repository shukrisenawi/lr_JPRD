<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitteeMembership extends Model
{
    protected $fillable = [
        'committee_group_id',
        'cawangan_id',
        'pemilih_record_id',
        'committee_position_id',
        'level',
        'scope_key',
        'scope_name',
        'parent_scope_name',
        'created_by',
        'notes',
    ];

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $query->whereIn('level', $user->committeeAccessLevels());
        $scope = $user->accessScope();
        $accessLevel = $user->access_level ?? 'jprd';

        if ($scope === null) {
            return $accessLevel === 'jprd'
                ? $query
                : $query->whereRaw('1 = 0');
        }

        if (filled($scope['dm']) && filled($scope['locality'])) {
            return $query
                ->where('level', 'cawangan')
                ->where('scope_key', $scope['dm'].'|'.$scope['locality']);
        }

        if (filled($scope['cawangan_id'])) {
            return $query
                ->where('level', 'cawangan')
                ->where('cawangan_id', $scope['cawangan_id']);
        }

        if (filled($scope['dm'])) {
            $cawanganIds = Cawangan::query()
                ->where('udm', $scope['dm'])
                ->pluck('id');

            return $query->where(function (Builder $query) use ($scope, $cawanganIds) {
                $query->where(function (Builder $query) use ($scope) {
                    $query->where('level', 'udm')
                        ->where('scope_key', $scope['dm']);
                })->orWhere(function (Builder $query) use ($scope, $cawanganIds) {
                    $query->where('level', 'cawangan')
                        ->where(function (Builder $scopeQuery) use ($scope, $cawanganIds) {
                            $scopeQuery->where('parent_scope_name', $scope['dm'])
                                ->orWhereIn('cawangan_id', $cawanganIds);
                        });
                });
            });
        }

        return $query->whereRaw('1 = 0');
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemilih_record_id');
    }

    public function cawangan(): BelongsTo
    {
        return $this->belongsTo(Cawangan::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(CommitteePosition::class, 'committee_position_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
