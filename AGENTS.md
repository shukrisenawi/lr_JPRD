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

## Production Asset Rules — Apply in Every Session

- `public/build` is tracked and is part of the deliverable. After frontend changes, run `npm run build`, then include the complete updated `public/build` directory (manifest, new assets, removed obsolete assets) with the intended source changes when committing. Do not commit only the JSX source and leave the tracked production build stale.
- NEVER run `git restore public/build`, `git checkout -- public/build`, or clean new build assets after a successful build/deployment merely to make Git status clean. This previously restored an old manifest and caused the live site to revert. Keep the verified build and commit it when authorized.
- SFTP `uploadOnSave` and watcher auto-upload/auto-delete MUST remain disabled. `npm run build` now checks this as well as manifest integrity. If checking local SFTP configuration, inspect only the relevant boolean properties; never print credentials. Do not stage credential-bearing configuration files.
- Deployment must include the intended backend/controller/routes changes even if already committed. The local `deploy.py` only discovers uncommitted files; a clean working tree does NOT mean the server has the latest PHP files.
- Upload all build assets before publishing `public/build/manifest.json` last. Clear Laravel route/config/view caches after updating backend routes.
- After deployment, read back the remote manifest and compare it with the local manifest. Verify the actual HTML references the new app script/CSS, the page chunk exists, and the changed interaction works in an authenticated browser when a session is available. A 200 response, successful upload message, or matching Git commit alone is insufficient.
- Do not conclude that the user has a browser-cache problem until checking the server's manifest and the script/CSS references in freshly requested HTML.
- Git push is not deployment. Only deploy with explicit user approval; keep deployed and tracked build versions consistent.
