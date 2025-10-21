/* =======================================================
   ==   THEME.JS - (MANAJER TAMPILAN GLOBAL)            ==
   ==   File ini di-import oleh index.js & prompt.js    ==
   ======================================================= */

// Kunci Local Storage (Bisa ganti di config.js jika perlu)
const LOCAL_STORAGE_KEY_SETTINGS = 'myAppThemeSettings_v2';

// === DATA PENGATURAN (Sesuai CSS Baru) ===
const THEME_OPTIONS = [
    { value: 'dark', text: 'Tema: Dark (Default)' },
    { value: 'light', text: 'Tema: Light' },
    { value: 'reading', text: 'Tema: Reading (Sepia)' }
];
const FONT_OPTIONS = [
    { value: 'font-default-ui', text: 'Font: Poppins (UI)' },
    { value: 'font-default-read', text: 'Font: Lora (Reading)' },
    { value: 'font-roboto', text: 'Font: Roboto' },
    { value: 'font-inter', text: 'Font: Inter' },
    { value: 'font-merriweather', text: 'Font: Merriweather' },
    { value: 'font-alegreya', text: 'Font: Alegreya' },
    { value: 'font-cormorant', text: 'Font: Cormorant' },
    { value: 'font-fira-sans', text: 'Font: Fira Sans' },
    { value: 'font-crimson-text', text: 'Font: Crimson Text' },
    { value: 'font-pt-serif', text: 'Font: PT Serif' }
];
const ALL_FONT_CLASSES = FONT_OPTIONS.map(f => f.value);
const ANIMATION_OPTIONS = [
    { value: 'none', text: 'Animasi: Tidak Ada' },
    { value: 'bubbles', text: 'Animasi: Gelembung' },
    { value: 'shooting-stars', text: 'Animasi: Bintang Jatuh' }
];

// === Variabel Global ===
const docEl = document.documentElement;
const docBody = document.body;

// === Helper Internal (Tidak di-export) ===

/**
 * Merender opsi (Themes, Fonts, dll) ke dalam div .custom-select
 */
const renderOptions = (containerId, options) => {
    const selectContainer = document.getElementById(containerId);
    if (selectContainer && selectContainer.children.length === 0) {
        options.forEach(item => {
            const optionDiv = document.createElement('div');
            optionDiv.dataset.value = item.value;
            optionDiv.textContent = item.text;
            selectContainer.appendChild(optionDiv);
        });
    }
};

/**
 * Mengubah animasi latar belakang
 */
const changeBackgroundAnimation = (animationType) => {
    let animContainer = document.getElementById('animated-bg-container');
    if (!animContainer) {
        // Jika tidak ada container (misal di halaman lain), buat baru
        animContainer = document.createElement('div');
        animContainer.id = 'animated-bg-container';
        docBody.insertBefore(animContainer, docBody.firstChild);
    }
    
    animContainer.innerHTML = ''; // Kosongkan
    if (animationType === 'none') return;
    
    const layer = document.createElement('div');
    layer.className = 'animation-layer';
    
    if (animationType === 'bubbles') {
        layer.id = 'bubbles';
        for (let i = 0; i < 25; i++) {
            const bubble = document.createElement('span');
            const size = Math.random() * 40 + 10;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.animationDelay = `${Math.random() * 15}s`;
            bubble.style.animationDuration = `${Math.random() * 10 + 10}s`;
            layer.appendChild(bubble);
        }
    } else if (animationType === 'shooting-stars') {
        layer.id = 'shooting-stars';
        for (let i = 0; i < 7; i++) {
            const star = document.createElement('span');
            star.style.top = `${Math.random() * 80 - 20}vh`;
            star.style.left = `${Math.random() * 100}vw`;
            star.style.animationDelay = `${Math.random() * 8}s`;
            star.style.animationDuration = `${Math.random() * 3 + 5}s`;
            layer.appendChild(star);
        }
    }
    animContainer.appendChild(layer);
};

/**
 * Mengupdate tampilan dropdown agar sesuai dengan data yang tersimpan
 */
const updateSelectUI = (selectId, valueToFind) => {
    const select = document.getElementById(selectId);
    if (select && select.querySelector('.select-selected')) {
        const selectedDisplay = select.querySelector('.select-selected');
        const targetOption = Array.from(select.querySelectorAll('.select-items div'))
            .find(opt => opt.dataset.value === valueToFind);
        if (targetOption) {
            selectedDisplay.textContent = targetOption.textContent;
            selectedDisplay.dataset.value = targetOption.dataset.value;
        }
    }
};


// === FUNGSI YANG DI-EXPORT ===
// (Bisa dipakai oleh index.js, prompt.js, dll)

/**
 * Menutup semua dropdown kustom, kecuali yang sedang diklik.
 * WAJIB di-export agar bisa dipanggil oleh event listener global.
 */
export const closeAllSelects = (elmnt) => {
    document.querySelectorAll('.custom-select').forEach(select => {
        if (select !== elmnt) {
            select.classList.remove('active');
            const items = select.querySelector('.select-items');
            if (items) items.style.display = 'none';
        }
    });
};

/**
 * Inisialisasi semua dropdown kustom di halaman.
 * Dipanggil oleh SETIAP halaman (index.js, prompt.js)
 */
export const initCustomSelects = () => {
    // 1. Render data ke div yang kosong
    // (Aman dipanggil berkali-kali, dia cek dulu)
    renderOptions('theme-select', THEME_OPTIONS);
    renderOptions('font-select', FONT_OPTIONS);
    renderOptions('animation-select', ANIMATION_OPTIONS);
    
    // 2. Ubah div .custom-select menjadi dropdown interaktif
    document.querySelectorAll('.custom-select').forEach(select => {
        if (select.querySelector('.select-selected')) return; // Udah di-init
        if (select.children.length === 0) return; // Nggak ada data
        
        const selected = document.createElement('div');
        selected.className = 'select-selected';
        const items = document.createElement('div');
        items.className = 'select-items';
        
        Array.from(select.children).forEach(option => {
            option.addEventListener('click', e => {
                selected.textContent = option.textContent;
                selected.dataset.value = option.dataset.value;
                select.classList.remove('active');
                items.style.display = 'none';
                e.stopPropagation();
                // Kirim event 'input' agar bisa ditangkap saveSettings()
                select.dispatchEvent(new Event('input', { bubbles: true }));
            });
            items.appendChild(option);
        });
        
        // Set nilai default (opsi pertama)
        selected.textContent = items.children[0].textContent;
        selected.dataset.value = items.children[0].dataset.value;
        
        select.innerHTML = '';
        select.appendChild(selected);
        select.appendChild(items);
        
        selected.addEventListener('click', e => {
            e.stopPropagation();
            closeAllSelects(select); // Tutup yang lain
            const isActive = select.classList.toggle('active');
            items.style.display = isActive ? 'block' : 'none';
        });
    });
};

/**
 * Menerapkan pengaturan (settings) ke dokumen.
 * Dipanggil oleh SETIAP halaman (index.js, prompt.js) saat loading.
 */
export const applySettings = (settings, isSettingsPage = false) => {
    if (!settings) return;
    
    // 1. Terapkan Tema (dark, light, reading)
    if (settings.theme === 'dark') {
        docEl.removeAttribute('data-theme');
    } else {
        docEl.setAttribute('data-theme', settings.theme);
    }
    
    // 2. Terapkan Font (pakai class di body)
    docBody.classList.remove(...ALL_FONT_CLASSES);
    docBody.classList.add(settings.font);
    
    // 3. Terapkan Skala Font (pakai --system-font-scale)
    docEl.style.setProperty('--system-font-scale', settings.fontSize);
    
    // 4. Terapkan Animasi Latar
    changeBackgroundAnimation(settings.animation);
    
    // 5. Update UI di Panel Pengaturan (HANYA jika ini halaman settings)
    if (isSettingsPage) {
        updateSelectUI('theme-select', settings.theme);
        updateSelectUI('font-select', settings.font);
        updateSelectUI('animation-select', settings.animation);
        
        const fontSizeSlider = document.getElementById('font-size-slider');
        if (fontSizeSlider) {
            fontSizeSlider.value = settings.fontSize;
        }
    }
};

/**
 * Menyimpan pengaturan saat ini dari UI ke Local Storage.
 * Dipanggil HANYA oleh index.js (atau halaman yg ada panel settings).
 */
export const saveSettings = () => {
    const settings = {
        theme: document.getElementById('theme-select')?.querySelector('.select-selected')?.dataset.value || 'dark',
        font: document.getElementById('font-select')?.querySelector('.select-selected')?.dataset.value || 'font-default-ui',
        animation: document.getElementById('animation-select')?.querySelector('.select-selected')?.dataset.value || 'bubbles',
        fontSize: document.getElementById('font-size-slider')?.value || '1.0'
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    
    // Terapkan langsung biar responsif
    applySettings(settings, true);
};

/**
 * Memuat pengaturan tema dari Local Storage atau mengembalikan default.
 * Dipanggil oleh SETIAP halaman (index.js, prompt.js).
 */
export const loadSettings = () => {
    const defaultSettings = {
        theme: 'dark',
        animation: 'bubbles',
        font: 'font-default-ui',
        fontSize: '1.0'
    };
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        if (saved) {
            // Gabungkan default dengan yg disimpan, jaga2 ada setting baru
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
        return defaultSettings;
    } catch {
        return defaultSettings;
    }
};