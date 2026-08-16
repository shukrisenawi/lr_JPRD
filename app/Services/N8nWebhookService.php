<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class N8nWebhookService
{
    public const DEFAULT_TEST_URL = 'https://n8n-mt8umikivytz.n8x.biz.id/webhook-test/d925780e-5011-44ee-ae45-ae10aabbbc0f';

    public const DEFAULT_PRODUCTION_URL = 'https://n8n-mt8umikivytz.n8x.biz.id/webhook/d925780e-5011-44ee-ae45-ae10aabbbc0f';

    public function settings(): array
    {
        $environment = Setting::valueOf('n8n_webhook_environment', 'production');

        return [
            'test_url' => Setting::valueOf('n8n_webhook_test_url', self::DEFAULT_TEST_URL),
            'production_url' => Setting::valueOf('n8n_webhook_production_url', self::DEFAULT_PRODUCTION_URL),
            'environment' => in_array($environment, ['test', 'production'], true) ? $environment : 'production',
        ];
    }

    public function activeUrl(): string
    {
        $settings = $this->settings();

        return $settings[$settings['environment'].'_url'];
    }

    public function updateSettings(array $values): void
    {
        foreach ([
            'n8n_webhook_test_url',
            'n8n_webhook_production_url',
            'n8n_webhook_environment',
        ] as $key) {
            if (array_key_exists($key, $values)) {
                Setting::setValue($key, $values[$key]);
            }
        }
    }

    public function send(string $message): Response
    {
        return Http::asJson()
            ->acceptJson()
            ->timeout(20)
            ->post($this->activeUrl(), [
                'message' => $message,
            ]);
    }
}
