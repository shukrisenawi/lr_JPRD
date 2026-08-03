import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultBaseUrl = 'https://paskawasansik.com';
let settings = { baseUrl: defaultBaseUrl, apiKey: '' };

function settingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function publicSettings() {
    return {
        baseUrl: settings.baseUrl,
        hasApiKey: Boolean(settings.apiKey),
    };
}

async function loadSettings() {
    try {
        const stored = JSON.parse(await fs.readFile(settingsPath(), 'utf8'));
        const apiKey = stored.apiKeyEncrypted && safeStorage.isEncryptionAvailable()
            ? safeStorage.decryptString(Buffer.from(stored.apiKeyEncrypted, 'base64'))
            : (stored.apiKey ?? '');

        const storedBaseUrl = String(stored.baseUrl || defaultBaseUrl).replace(/\/+$/, '');

        settings = {
            baseUrl: storedBaseUrl === 'http://127.0.0.1:8000' ? defaultBaseUrl : storedBaseUrl,
            apiKey: String(apiKey),
        };
    } catch {
        settings = { baseUrl: defaultBaseUrl, apiKey: '' };
    }
}

async function saveSettings(input) {
    const baseUrl = String(input?.baseUrl ?? '').trim().replace(/\/+$/, '');
    const newApiKey = String(input?.apiKey ?? '').trim();

    if (!/^https?:\/\//i.test(baseUrl) || baseUrl.length > 500) {
        throw new Error('URL sistem tidak sah. Contoh: https://paskawasansik.com');
    }

    if (newApiKey.length > 500) {
        throw new Error('API key tidak sah.');
    }

    settings.baseUrl = baseUrl;
    if (newApiKey) settings.apiKey = newApiKey;

    const stored = { baseUrl: settings.baseUrl };
    if (settings.apiKey && safeStorage.isEncryptionAvailable()) {
        stored.apiKeyEncrypted = safeStorage.encryptString(settings.apiKey).toString('base64');
    } else {
        stored.apiKey = settings.apiKey;
    }

    await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
    await fs.writeFile(settingsPath(), JSON.stringify(stored, null, 2), 'utf8');

    return publicSettings();
}

async function fetchUdmReport() {
    if (!settings.apiKey) throw new Error('API key belum ditetapkan.');

    const response = await fetch(`${settings.baseUrl}/api/reports/udm`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${settings.apiKey}`,
        },
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error(`Server memulangkan respons tidak sah (${response.status}).`);
    }

    if (!response.ok) {
        throw new Error(payload.error || `Gagal mendapatkan data (${response.status}).`);
    }

    return payload;
}

function createWindow() {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 980,
        minHeight: 650,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#f3f7f5',
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    window.once('ready-to-show', () => window.show());
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
    await loadSettings();

    ipcMain.handle('settings:get', () => publicSettings());
    ipcMain.handle('settings:save', (_event, input) => saveSettings(input));
    ipcMain.handle('report:fetch', () => fetchUdmReport());

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
