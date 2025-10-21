import {
    loadSettings,
    applySettings,
    saveSettings,
    initCustomSelects,
    closeAllSelects
} from './theme.js'; // Pastikan path-nya bener

document.addEventListener('DOMContentLoaded', () => {
    
    // === Elemen DOM Khusus Halaman Index ===
    const loader = document.getElementById('loader');
    const settingsPanel = document.getElementById('settings-panel');
    const openPanelBtn = document.getElementById('open-settings-panel');
    const closePanelBtn = document.getElementById('close-settings-panel');
    const settingsPanelBody = document.querySelector('.tags-panel-body');
    
    // === FUNGSI KHUSUS HALAMAN INDEX ===
    
    const hideLoader = () => {
        if (loader) loader.classList.add('hidden');
    };
    
    const openSettingsPanel = () => {
        if (settingsPanel) settingsPanel.classList.add('is-open');
    };
    
    const closeSettingsPanel = () => {
        if (settingsPanel) settingsPanel.classList.remove('is-open');
    };
    
    // === INISIALISASI HALAMAN INDEX ===
    
    const initApp = () => {
        // 1. Sembunyikan loader
        setTimeout(hideLoader, 500);
        
        // 2. Panggil fungsi init dropdown dari theme.js
        initCustomSelects();
        
        // 3. Muat & Terapkan Pengaturan (kirim 'true' karena ini Halaman Settings)
        const settings = loadSettings();
        applySettings(settings, true);
        
        // 4. Tambah Listener Panel Slide
        if (openPanelBtn) openPanelBtn.addEventListener('click', openSettingsPanel);
        if (closePanelBtn) closePanelBtn.addEventListener('click', closeSettingsPanel);
        
        // 5. Tambah Listener Global (panggil fungsi dari theme.js)
        document.addEventListener('click', closeAllSelects);
        
        // 6. Tambah Listener Pengaturan
        // Saat ada 'input' di panel, panggil saveSettings()
        if (settingsPanelBody) {
            settingsPanelBody.addEventListener('input', (e) => {
                if (e.target.id === 'font-size-slider' || e.target.closest('.custom-select')) {
                    saveSettings(); // Panggil fungsi dari theme.js
                }
            });
        }
    };
    
    // Jalankan aplikasi
    initApp();
    
});