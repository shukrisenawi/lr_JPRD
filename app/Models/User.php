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

#[Fillable(['name', 'email', 'email_verified_at', 'password', 'avatar', 'role_id'])]
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
            'password' => 'hashed',
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

    #[Computed]
    public function avatarUrl(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        return route('profile.avatar', [
            't' => $this->updated_at?->timestamp,
        ]);
    }
}
