const api = window.desktopApi;
const refreshInterval = 10000;
const numberFormat = new Intl.NumberFormat('ms-MY');

const elements = {
    status: document.querySelector('#connection-status'),
    refresh: document.querySelector('#refresh-button'),
    settingsButton: document.querySelector('#settings-button'),
    emptySettingsButton: document.querySelector('#empty-settings-button'),
    settingsPanel: document.querySelector('#settings-panel'),
    settingsForm: document.querySelector('#settings-form'),
    baseUrl: document.querySelector('#base-url'),
    apiKey: document.querySelector('#api-key'),
    keyHint: document.querySelector('#key-hint'),
    settingsError: document.querySelector('#settings-error'),
    dashboard: document.querySelector('#dashboard'),
    emptyState: document.querySelector('#empty-state'),
    globalError: document.querySelector('#global-error'),
    stats: document.querySelector('#stats'),
    updatedAt: document.querySelector('#updated-at'),
    rowCount: document.querySelector('#row-count'),
    tableBody: document.querySelector('#udm-table-body'),
    tableFoot: document.querySelector('#udm-table-foot'),
};

const columns = [
    ['siap_cula', 'Siap'], ['JP', 'JP'], ['L', 'L'], ['P', 'P'], ['M', 'M'], ['C', 'C'], ['I', 'I'], ['S', 'S'],
    ['PAS', 'PAS'], ['PBBM', 'PBBM'], ['BN', 'BN'], ['PH', 'PH'], ['GTA', 'GTA'], ['PLK', 'PLK'],
    ['Atas Pagar', 'AP'], ['Tak Kenal', 'TK'], ['Mati', 'Mati'], ['CULA', 'Baki'],
];

let settings = { hasApiKey: false };
let loading = false;

function fmt(value) {
    return numberFormat.format(Number(value) || 0);
}

function fmtPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[char]));
}

function setStatus(type, text) {
    elements.status.className = `status status-${type}`;
    elements.status.textContent = text;
}

function showSettings(open = true) {
    elements.settingsPanel.classList.toggle('hidden', !open);
    if (open) elements.baseUrl.focus();
}

function showError(message, settingsError = false) {
    const target = settingsError ? elements.settingsError : elements.globalError;
    target.textContent = message;
    target.classList.remove('hidden');
}

function clearErrors() {
    elements.settingsError.classList.add('hidden');
    elements.globalError.classList.add('hidden');
}

function renderStats(summary) {
    const stats = [
        ['Jumlah Pemilih', summary.total_voters, 'Rekod aktif'],
        ['Sudah Dicula', summary.with_cula, 'Ada status culaan'],
        ['Belum Dicula', summary.belum_dicula, 'Baki tindakan'],
        ['Peratus Siap', fmtPercent(summary.coverage_percent), `${fmt(summary.total_dm)} UDM / ${fmt(summary.total_localities)} lokaliti`],
    ];

    elements.stats.innerHTML = stats.map(([label, value, detail]) => `
        <article class="stat-card">
            <div class="stat-label">${escapeHtml(label)}</div>
            <div class="stat-value">${escapeHtml(value)}</div>
            <div class="stat-detail">${escapeHtml(detail)}</div>
        </article>
    `).join('');
}

function renderTable(rows, summary) {
    elements.rowCount.textContent = `${fmt(rows.length)} UDM`;
    elements.tableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>${escapeHtml(row.name || row.code || '-')}</td>
            ${columns.map(([key]) => `<td>${fmt(row[key])}</td>`).join('')}
        </tr>
    `).join('');

    const totals = columns.reduce((result, [key]) => {
        result[key] = rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
        return result;
    }, {});

    elements.tableFoot.innerHTML = `
        <tr>
            <td>JUMLAH</td>
            ${columns.map(([key]) => `<td>${fmt(totals[key])}</td>`).join('')}
        </tr>
    `;
}

function renderReport(payload) {
    const summary = payload.summary || {};
    const rows = Array.isArray(payload.data) ? payload.data : [];
    renderStats(summary);
    renderTable(rows, summary);
    elements.updatedAt.textContent = payload.fetched_at
        ? `Kemas kini terakhir: ${new Date(payload.fetched_at).toLocaleString('ms-MY')}`
        : 'Kemas kini terakhir: -';
    elements.dashboard.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
}

async function refresh() {
    if (loading || !settings.hasApiKey) return;
    loading = true;
    clearErrors();
    setStatus('loading', 'Sedang ambil data...');

    try {
        const payload = await api.fetchReport();
        renderReport(payload);
        setStatus('online', `Online - auto ${refreshInterval / 1000}s`);
    } catch (error) {
        setStatus('error', 'Tidak dapat disambung');
        showError(error.message || 'Gagal mendapatkan data daripada sistem.');
    } finally {
        loading = false;
    }
}

async function saveSettings(event) {
    event.preventDefault();
    clearErrors();

    try {
        settings = await api.saveSettings({
            baseUrl: elements.baseUrl.value,
            apiKey: elements.apiKey.value,
        });
        elements.apiKey.value = '';
        elements.keyHint.textContent = 'API key telah disimpan secara terlindung.';
        showSettings(false);
        elements.emptyState.classList.add('hidden');
        await refresh();
    } catch (error) {
        showError(error.message || 'Tetapan tidak dapat disimpan.', true);
    }
}

async function boot() {
    try {
        settings = await api.getSettings();
        elements.baseUrl.value = settings.baseUrl || 'https://paskawasansik.com';
        elements.keyHint.textContent = settings.hasApiKey ? 'API key sedia ada akan dikekalkan jika ruang ini dibiarkan kosong.' : '';

        if (settings.hasApiKey) {
            await refresh();
        } else {
            showSettings(true);
        }
    } catch (error) {
        showError(error.message || 'Aplikasi tidak dapat dimulakan.');
    }
}

elements.refresh.addEventListener('click', refresh);
elements.settingsButton.addEventListener('click', () => showSettings(elements.settingsPanel.classList.contains('hidden')));
elements.emptySettingsButton.addEventListener('click', () => showSettings(true));
elements.settingsForm.addEventListener('submit', saveSettings);
setInterval(refresh, refreshInterval);
boot();
