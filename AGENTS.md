# Repository Instructions

## Stack and Layout

- This is a Laravel 13 / PHP 8.3 application with Inertia React and Vite.
- Backend entrypoints are `routes/web.php`, `app/Http/Controllers`, `app/Models`, and `app/Services`; database changes belong in `database/migrations`.
- The frontend entrypoint is `resources/js/app.jsx`; Inertia pages are resolved from `resources/js/Pages/**/*.jsx` and assets are built from that entrypoint by `vite.config.js`.
- Most authenticated routes are protected by the `module:` middleware. When changing a module route, check the corresponding access module and feature tests.

## Commands

- First-time setup: `composer setup` (installs PHP and npm dependencies, creates/configures `.env`, migrates the database, and builds assets).
- Run the full local stack with `composer run dev`; it starts Laravel, the queue listener, Pail logs, and Vite together.
- To run only the web server, use `php artisan serve --host=127.0.0.1 --port=8000`; do not use the raw `php -S ...` command from the repository root.
- Run tests with `composer test` or `php artisan test`. Run one file with `php artisan test tests/Feature/ProgramManagementTest.php` and narrow it with Pest's `--filter` option.
- Format changed PHP with `vendor/bin/pint`; build frontend assets with `npm run build`.
- Run `npm run build` before committing and do not commit if it fails.

## Testing and Frontend Gotchas

- Feature tests use Pest, `RefreshDatabase`, and the in-memory SQLite settings declared in `phpunit.xml`; `tests/TestCase.php` disables Vite during tests.
- If tests fail during migration with `no such function: JSON_CONTAINS`, the SQLite setup is hitting MySQL-specific JSON expressions in the Culaan/Jawatankuasa migrations; use a compatible database or make the migration driver-aware before diagnosing feature failures.
- Local development should use `http://127.0.0.1:8000`. If another Laravel app is open, stop its port-8000 server and remove a stale `public/hot` file before diagnosing incorrect assets or pages.
- Vite defaults to `/build/`; set `VITE_BASE_PATH` deliberately for a subdirectory deployment such as `/sistem/public/build/`. Do not leave a different project's `public/hot` file in place when testing built assets.

## Deployment Safety

- `deploy.py` and `.vscode/sftp.json` target the live `paskawasansik.com` server. Do not run `python deploy.py` or rely on editor upload-on-save without explicit deployment approval; the script uploads changed files, replaces remote build assets, and clears server caches.
- Never expose, copy, or add the deployment credentials in `deploy.py` or related local configuration to commits, logs, or responses.
