<?php

namespace Database\Factories;

use App\Models\Role;
use App\Support\ModuleRegistry;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    protected $model = Role::class;

    public function definition(): array
    {
        $name = fake()->unique()->jobTitle();

        return [
            'name' => $name,
            'slug' => Str::slug($name.'-'.fake()->unique()->numberBetween(1, 9999)),
            'is_master_admin' => false,
            'access_modules' => ModuleRegistry::keys(),
        ];
    }

    public function masterAdmin(): static
    {
        return $this->state(fn () => [
            'name' => 'Master Admin',
            'slug' => 'master-admin',
            'is_master_admin' => true,
            'access_modules' => ModuleRegistry::keys(),
        ]);
    }

    public function withModules(array $modules): static
    {
        return $this->state(fn () => [
            'access_modules' => array_values(array_unique($modules)),
        ]);
    }
}
