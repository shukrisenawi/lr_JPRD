<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Computed;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'email_verified_at', 'password', 'avatar', 'role_id', 'access_level', 'scope_key', 'expires_at', 'last_login_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'expires_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function sharedPrograms(): BelongsToMany
    {
        return $this->belongsToMany(Program::class, 'program_user_shares')
            ->withTimestamps();
    }

    public function isMasterAdmin(): bool
    {
        return (bool) $this->role?->is_master_admin;
    }

    public function canAccessModule(string $module): bool
    {
        return $this->role?->hasModuleAccess($module) ?? false;
    }

    public function isExpired(): bool
    {
        return $this->expires_at?->isPast() ?? false;
    }

    public function accessScope(): ?array
    {
        $level = $this->access_level ?? 'jprd';
        $key = $this->scope_key;

        if ($level === 'jprd' || blank($key)) {
            return null;
        }

        if ($level === 'udm') {
            return ['dm' => $key, 'locality' => null];
        }

        if ($level === 'cawangan') {
            $parts = explode('|', $key, 2);
            return ['dm' => $parts[0] ?? $key, 'locality' => $parts[1] ?? null];
        }

        return null;
    }

    public function applyScopeToPemilihQuery($query): void
    {
        $scope = $this->accessScope();

        if ($scope === null) {
            return;
        }

        if (filled($scope['dm'])) {
            $query->where('dm', $scope['dm']);
        }

        if (filled($scope['locality'])) {
            $query->where('locality', $scope['locality']);
        }
    }

    #[Computed]
    public function avatarUrl(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        return route('profile.avatar', [
            'user' => $this->id,
            't' => $this->updated_at?->timestamp,
        ]);
    }
}
