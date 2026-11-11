<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['title', 'body', 'body_format', 'poster_path', 'audience', 'is_active', 'starts_at', 'expires_at'])]
class Announcement extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'starts_at' => 'date', 'expires_at' => 'date'];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function dismissals(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_dismissals');
    }

    public function viewers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_views')->withPivot('viewed_at')->orderByPivot('viewed_at', 'desc');
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhereDate('starts_at', '<=', today()->toDateString()))
            ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhereDate('expires_at', '>=', today()->toDateString()));
    }

    public function scopeForRecipient(Builder $query, User $user): void
    {
        $query->active()->where(function (Builder $query) use ($user) {
            $query->where('audience', 'all')
                ->orWhere(fn (Builder $q) => $q->where('audience', 'roles')->whereHas('roles', fn (Builder $r) => $r->whereKey($user->role_id)))
                ->orWhere(fn (Builder $q) => $q->where('audience', 'users')->whereHas('users', fn (Builder $u) => $u->whereKey($user->id)));
        });
    }

    public function popupData(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => $this->body,
            'body_format' => $this->body_format ?? 'text',
            'poster_url' => $this->poster_path ? route('announcements.poster', $this) : null,
        ];
    }
}
