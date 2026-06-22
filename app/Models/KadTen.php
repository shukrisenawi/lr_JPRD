<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KadTen extends Model
{
    protected $fillable = [
        'name',
        'pemimpin_id',
        'level',
        'scope_key',
        'scope_name',
        'parent_scope_name',
        'created_by',
        'notes',
    ];

    public function pemimpin(): BelongsTo
    {
        return $this->belongsTo(PemilihRecord::class, 'pemimpin_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(KadTenMember::class, 'kad_ten_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeKadTenForUser($query, User $user)
    {
        $scope = $user->accessScope();

        if ($scope === null) {
            return $query;
        }

        if (filled($scope['dm']) && filled($scope['locality'])) {
            $query->where(function ($q) use ($scope) {
                $q->where('level', 'jprd')
                  ->orWhere(function ($sq) use ($scope) {
                      $sq->where('level', 'cawangan')
                         ->where('scope_key', $scope['dm'].'|'.$scope['locality']);
                  });
            });
        } elseif (filled($scope['dm'])) {
            $query->where(function ($q) use ($scope) {
                $q->where('level', 'jprd')
                  ->orWhere(function ($sq) use ($scope) {
                      $sq->where('level', 'udm')
                         ->where('scope_key', $scope['dm']);
                  })
                  ->orWhere(function ($sq) use ($scope) {
                      $sq->where('level', 'cawangan')
                         ->where('parent_scope_name', $scope['dm']);
                  });
            });
        }

        return $query;
    }
}
