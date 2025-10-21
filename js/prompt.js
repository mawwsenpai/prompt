/* =======================================================
   ==   PROMPT.JS - (Pengurus Halaman prompt.html)      ==
   ==   Menggunakan gaya dari theme.css (Novel Style)   ==
   ======================================================= */

// 1. IMPOR FUNGSI GLOBAL DARI THEME.JS
// Kita butuh ini untuk memuat tema & font
import {
    loadSettings,
    applySettings,
    closeAllSelects
} from './theme.js';

// === DATA UNTUK RENDER DROPDOWN ===
// (Diambil dari HTML lama kamu, disesuaikan)
const VIDEO_STYLE_OPTIONS = [
    { value: 'Sinematik', text: 'Gaya: Sinematik' },
    { value: 'Realistis', text: 'Gaya: Realistis' },
    { value: 'Animasi Ghibli', text: 'Gaya: Animasi Ghibli' },
    { value: 'Fantasi Epik', text: 'Gaya: Fantasi Epik' },
    { value: 'Cyberpunk', text: 'Gaya: Cyberpunk' },
    { value: 'Dramatis', text: 'Gaya: Dramatis' }
];
const VIDEO_QUALITY_OPTIONS = [
    { value: 'Standar (1080p)', text: 'Kualitas: Standar (1080p)' },
    { value: 'Tinggi (4K)', text: 'Kualitas: Tinggi (4K)' },
    { value: 'Ultra (8K)', text: 'Kualitas: Ultra (8K)' },
    { value: 'Sedang (720p)', text: 'Kualitas: Sedang (720p)' }
];
const VIDEO_CAMERA_OPTIONS = [
    { value: 'Kamera Sinema (Arri Alexa)', text: 'Kamera: Sinema (Arri Alexa)' },
    { value: 'DSLR (Canon EOS 5D)', text: 'Kamera: DSLR (Canon EOS 5D)' },
    { value: 'Ponsel (iPhone 15 Pro)', text: 'Kamera: Ponsel (iPhone 15 Pro)' },
    { value: 'Drone Shot', text: 'Kamera: Drone Shot' },
    { value: 'GoPro (POV)', text: 'Kamera: GoPro (POV)' }
];
const VIDEO_FPS_OPTIONS = [
    { value: '30 FPS', text: 'FPS: 30' },
    { value: '60 FPS', text: 'FPS: 60' },
    { value: '120 FPS', text: 'FPS: 120 (Slow-mo)' }
];
const PROMPT_LANGUAGE_OPTIONS = [
    { value: 'id-ID', text: 'Bahasa: Indonesia' },
    { value: 'en-US', text: 'Bahasa: English' }
];
// === AKHIR DATA ===


// === FUNGSI DROPDOWN KUSTOM (LOKAL) ===
// Kita butuh ini di sini untuk merender dropdown YANG KOSONG
// (Fungsi ini SAMA kayak di theme.js, tapi bisa render placeholder)

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
 * Inisialisasi semua dropdown kustom di halaman.
 */
const initCustomSelects = () => {
    // 1. Render data ke div yang kosong
    renderOptions('video-style', VIDEO_STYLE_OPTIONS);
    renderOptions('video-quality', VIDEO_QUALITY_OPTIONS);
    renderOptions('video-camera', VIDEO_CAMERA_OPTIONS);
    renderOptions('video-fps', VIDEO_FPS_OPTIONS);
    renderOptions('prompt-language', PROMPT_LANGUAGE_OPTIONS);
    
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
                selected.removeAttribute('data-placeholder'); // Hapus status placeholder
                select.classList.remove('active');
                items.style.display = 'none';
                e.stopPropagation();
                select.dispatchEvent(new Event('input', { bubbles: true })); 
            });
            items.appendChild(option); 
        });

        // Set nilai placeholder (jika ada) atau nilai default (opsi pertama)
        const placeholder = select.dataset.placeholder;
        if (placeholder) {
            selected.textContent = placeholder;
            selected.dataset.placeholder = "true"; // Tandai sebagai placeholder
        } else {
            selected.textContent = items.children[0].textContent;
            selected.dataset.value = items.children[0].dataset.value;
        }
        
        select.innerHTML = ''; 
        select.appendChild(selected);
        select.appendChild(items);

        selected.addEventListener('click', e => {
            e.stopPropagation();
            closeAllSelects(select); // Panggil fungsi global dari theme.js
            const isActive = select.classList.toggle('active');
            items.style.display = isActive ? 'block' : 'none';
        });
    });
};


// === LOGIKA UTAMA HALAMAN PROMPT ===

document.addEventListener('DOMContentLoaded', () => {

    // Ambil Kunci API & Local Storage
    // Pastikan config.js sudah di-load di HTML
    const { GEMINI_API_KEY, LOCAL_STORAGE_KEY_PROMPTS } = CONFIG;
    
    let characterCount = 0; // Penghitung karakter

    // === Cache Elemen DOM ===
    const loader = document.getElementById('loader');
    const notificationBar = document.getElementById('notification-bar');
    
    // Panel Slide (Prompt Tersimpan)
    const savedPanel = document.getElementById('saved-prompts-panel');
    const openSavedPanelBtn = document.getElementById('open-saved-panel');
    const closeSavedPanelBtn = document.getElementById('close-saved-panel');
    const savedPromptsList = document.getElementById('saved-prompts-list');
    
    // Panel Pop-up (Hasil)
    const resultScreen = document.getElementById('result-screen');
    const closeResultPanelBtn = document.getElementById('close-result-panel');
    const resultText = document.getElementById('result-text');
    
    // Tombol Aksi Utama
    const generateBtn = document.getElementById('generate-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const copyPromptBtn = document.getElementById('copy-prompt-btn');
    
    // Form
    const charactersContainer = document.getElementById('characters-container');
    
    // === Fungsi Utilitas ===
    
    const showLoader = (text = "Membuat Keajaiban...") => {
        if (loader) {
            loader.querySelector('p').textContent = text;
            loader.classList.remove('hidden');
        }
    };
    
    const hideLoader = () => {
        if (loader) loader.classList.add('hidden');
    };

    const showNotification = (message, type = 'success') => {
        if (!notificationBar) return;
        // Ganti 'type' agar sesuai dengan warna tema
        const colorVar = type === 'error' ? 'var(--accent-color)' : 'var(--accent-color)'; // Contoh, bisa disesuaikan
        
        notificationBar.textContent = message;
        // Style notif-bar ada di theme.css, kita cuma ganti warnanya
        notificationBar.style.borderLeftColor = colorVar; 
        notificationBar.classList.add('show');
        setTimeout(() => notificationBar.classList.remove('show'), 3000);
    };

    const copyToClipboard = (text) => {
        if (!text) return showNotification('Tidak ada teks untuk disalin.', 'error');
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Prompt disalin ke clipboard!', 'success');
        }, () => {
            showNotification('Gagal menyalin prompt.', 'error');
        });
    };

    // === Fungsi Panel ===

    const openSavedPanel = () => {
        if (savedPanel) savedPanel.classList.add('is-open');
    };
    const closeSavedPanel = () => {
        if (savedPanel) savedPanel.classList.remove('is-open');
    };
    
    const showResultPanel = () => {
        if (resultScreen) resultScreen.classList.remove('hidden');
    };
    const hideResultPanel = () => {
        if (resultScreen) resultScreen.classList.add('hidden');
    };

    // === Fungsi Karakter ===
    
    const addCharacterField = () => {
        characterCount++;
        const block = document.createElement('div');
        block.className = 'character-block';
        
        block.innerHTML = `
            <div class="character-header">
                <label>Karakter ${characterCount}</label>
                <button class="btn-remove-char" title="Hapus Karakter">&times;</button>
            </div>
            <textarea class="form-input char-description" rows="2" placeholder="Deskripsi karakter dan aksinya..."></textarea>
        `;
        
        // Tambah listener ke tombol hapus YANG BARU DIBUAT
        block.querySelector('.btn-remove-char').addEventListener('click', (e) => {
            e.target.closest('.character-block').remove();
        });
        
        charactersContainer.appendChild(block);
    };

    // === Fungsi Local Storage (Prompt Tersimpan) ===
    
    const getSavedPrompts = () => {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PROMPTS)) || [];
        } catch {
            return [];
        }
    };

    const renderSavedPrompts = () => {
        if (!savedPromptsList) return;
        
        const prompts = getSavedPrompts();
        savedPromptsList.innerHTML = ''; // Kosongkan list
        
        if (prompts.length === 0) {
            savedPromptsList.innerHTML = `<p class="empty-list-message">Belum ada prompt yang disimpan.</p>`;
        } else {
            prompts.forEach((p, index) => {
                const item = document.createElement('div');
                item.className = 'saved-prompt-item';
                item.innerHTML = `
                    <p class="saved-prompt-text selectable">${p.text}</p>
                    <div class="saved-prompt-actions">
                        <button class="btn btn-secondary btn-small copy-saved" data-index="${index}">Salin</button>
                        <button class="btn btn-secondary btn-small delete-saved" data-index="${index}" style="color:var(--text-secondary);">Hapus</button>
                    </div>
                `;
                savedPromptsList.appendChild(item);
            });
        }
    };
    
    const showSavedPrompts = () => {
        renderSavedPrompts();
        openSavedPanel();
    };
    
    const saveCurrentPrompt = () => {
        const text = resultText.textContent.trim();
        if (!text) return showNotification('Tidak ada prompt untuk disimpan.', 'error');
        
        const prompts = getSavedPrompts();
        if (prompts.some(p => p.text === text)) {
            return showNotification('Prompt ini sudah disimpan.', 'info');
        }
        
        prompts.unshift({ text: text, date: new Date().toISOString() });
        localStorage.setItem(LOCAL_STORAGE_KEY_PROMPTS, JSON.stringify(prompts));
        showNotification('Prompt berhasil disimpan!', 'success');
    };
    
    const deleteSavedPrompt = (index) => {
        let prompts = getSavedPrompts();
        prompts.splice(index, 1);
        localStorage.setItem(LOCAL_STORAGE_KEY_PROMPTS, JSON.stringify(prompts));
        renderSavedPrompts(); // Render ulang list
        showNotification('Prompt dihapus.', 'info');
    };

    // === Fungsi Generate (INTI) ===
    
    const generatePrompt = async () => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("GANTI_DENGAN_API_KEY_KAMU")) {
            return showNotification("Harap masukkan API Key di file config.js", 'error');
        }
        
        showLoader("Sedang merakit brief...");
        
        // Helper untuk ambil nilai dropdown
        const getSelectValue = (id) => {
             const el = document.getElementById(id)?.querySelector('.select-selected');
             // Jika masih placeholder, kembalikan string kosong
             return el?.dataset.placeholder ? "" : el?.dataset.value || "";
        }
        
        // 1. Kumpulkan data
        const scene = document.getElementById('video-scene').value;
        const style = getSelectValue('video-style');
        const quality = getSelectValue('video-quality');
        const camera = getSelectValue('video-camera');
        const fps = getSelectValue('video-fps');
        const lang = getSelectValue('prompt-language');
        
        let characterDetails = Array.from(document.querySelectorAll('.character-block'))
            .map((b, i) => {
                const desc = b.querySelector('.char-description').value.trim();
                return desc ? `- Karakter ${i+1}: ${desc}` : '';
            })
            .filter(detail => detail)
            .join('\n');
            
        // 2. Buat Brief
        const directorBrief = `ANDA ADALAH ASISTEN PEMBUAT PROMPT VIDEO AI. Buat satu paragraf prompt yang kaya, deskriptif, dan sinematik berdasarkan brief sutradara berikut. Fokus pada narasi visual, atmosfer, dan detail teknis. HANYA KELUARKAN PARAGRAF PROMPT FINAL DALAM BAHASA YANG DIPILIH.

--- BRIEF SUTRADARA ---
- Bahasa Output: ${lang === 'id-ID' ? 'Bahasa Indonesia' : 'English'}
- Deskripsi Adegan: ${scene || 'Tidak ada deskripsi spesifik.'}
- Karakter & Aksi:\n${characterDetails || 'Tidak ada karakter spesifik.'}
- Gaya Visual: ${style || 'Gaya standar.'}
- Kualitas: ${quality || 'Kualitas standar.'}
- Kamera: ${camera || 'Kamera standar.'}
- FPS: ${fps || 'FPS standar.'}
--------------------`;

        showLoader("Menghubungi AI...");
        
        // 3. Panggil API
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: directorBrief }] }] })
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error?.message || "Kesalahan API.");
            
            if (data.candidates && data.candidates.length > 0) {
                resultText.textContent = data.candidates[0].content.parts[0].text.trim();
                showResultPanel();
            } else {
                throw new Error(data.promptFeedback?.blockReason || "Respon diblokir.");
            }
            
        } catch (error) {
            showNotification("Gagal menghubungi Gemini API: " + error.message, 'error');
            // Tampilkan error di panel hasil biar jelas
            resultText.textContent = `Terjadi kesalahan. Pastikan API Key Anda valid dan tidak ada batasan.\n\nError: ${error.message}`;
            showResultPanel();
        } finally {
            hideLoader();
        }
    };


    // === INISIALISASI HALAMAN ===
    
    const initPage = () => {
        // 1. Muat & Terapkan Tema (Panggil dari theme.js)
        // 'false' = ini bukan halaman settings, jadi ngga usah update UI panel settings
        const settings = loadSettings();
        applySettings(settings, false); 

        // 2. Render & Inisialisasi Dropdown Kustom
        initCustomSelects(); 

        // 3. Tambah 1 field karakter default
        addCharacterField();

        // 4. Tambah Listener Global (Panggil dari theme.js)
        document.addEventListener('click', closeAllSelects);
        
        // 5. Tambah Listener Tombol Utama
        if (openSavedPanelBtn) openSavedPanelBtn.addEventListener('click', showSavedPrompts);
        if (closeSavedPanelBtn) closeSavedPanelBtn.addEventListener('click', closeSavedPanel);
        if (closeResultPanelBtn) closeResultPanelBtn.addEventListener('click', hideResultPanel);
        
        if (generateBtn) generateBtn.addEventListener('click', generatePrompt);
        if (savePromptBtn) savePromptBtn.addEventListener('click', saveCurrentPrompt);
        if (copyPromptBtn) copyPromptBtn.addEventListener('click', () => copyToClipboard(resultText.textContent));

        // 6. Listener dinamis (untuk tombol di dalam form/panel)
        document.body.addEventListener('click', (e) => {
            const target = e.target;

            // Tombol "Tambah Karakter"
            if (target.dataset.action === 'add-character') {
                addCharacterField();
            }
            
            // Tombol "Hapus" di list prompt tersimpan
            if (target.classList.contains('delete-saved')) {
                const index = parseInt(target.dataset.index, 10);
                deleteSavedPrompt(index);
            }
            
            // Tombol "Salin" di list prompt tersimpan
            if (target.classList.contains('copy-saved')) {
                const textToCopy = target.closest('.saved-prompt-item').querySelector('.saved-prompt-text').textContent;
                copyToClipboard(textToCopy);
            }
        });
    };

    // Jalankan Halaman
    initPage();
});