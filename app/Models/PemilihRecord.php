<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class PemilihRecord extends Model
{
    protected $fillable = [
        'identity_number',
        'no_rumah',
        'no_siri',
        'no_kp',
        'old_ic',
        'no_ahli',
        'avatar',
        'birthday_image',
        'name',
        'dm',
        'locality',
        'gender',
        'race',
        'date_of_birth',
        'cula_code',
        'cula_display_label',
        'address',
        'phone_home',
        'phone_mobile',
        'status',
        'source_file',
        'is_manual',
        'created_by',
        'cula_remark',
        'catatan',
        'alamat_kp',
        'alamat_kediaman',
    ];

    protected $appends = [
        'avatar_url',
        'birthday_image_url',
    ];

    protected function casts(): array
    {
        return [
            'is_manual' => 'boolean',
            'date_of_birth' => 'date',
        ];
    }

    public function avatarUrl(): ?string
    {
        if (!$this->avatar) return null;
        return route('pemilih.avatar', ['pemilihRecord' => $this->id, 't' => $this->updated_at?->timestamp]);
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatarUrl();
    }

    public function birthdayImageUrl(): ?string
    {
        if (!$this->birthday_image) {
            return null;
        }

        return route('pemilih.birthday-image', ['pemilihRecord' => $this->id, 't' => $this->updated_at?->timestamp]);
    }

    public function getBirthdayImageUrlAttribute(): ?string
    {
        return $this->birthdayImageUrl();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function committeeMemberships(): HasMany
    {
        return $this->hasMany(CommitteeMembership::class, 'pemilih_record_id');
    }

    public function culaWorkItem(): HasOne
    {
        return $this->hasOne(CulaWorkItem::class, 'pemilih_record_id');
    }

    public function kadTenMemberships(): HasMany
    {
        return $this->hasMany(KadTenMember::class, 'pemilih_record_id');
    }
}
