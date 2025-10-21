import {
    loadSettings,
    applySettings,
    closeAllSelects
} from './theme.js';

const VIDEO_STYLE_OPTIONS = [
    { value: '', text: 'Gaya: (Default AI)' },
    { value: 'Sinematik', text: 'Gaya: Sinematik (Film)' },
    { value: 'Realistis', text: 'Gaya: Realistis (Foto-nyata)' },
    { value: 'Animasi Ghibli', text: 'Gaya: Animasi (Gaya Ghibli)' },
    { value: 'Fantasi Epik', text: 'Gaya: Fantasi (Visual Epik)' },
    { value: 'Cyberpunk', text: 'Gaya: Cyberpunk (Neon)' },
    { value: 'Dramatis', text: 'Gaya: Dramatis (Kontras tinggi)' }
];

const VIDEO_QUALITY_OPTIONS = [
    { value: '', text: 'Kualitas: (Default AI)' },
    { value: '720p', text: 'Kualitas: Standar (720p)' },
    { value: '1080p', text: 'Kualitas: HD (1080p)' },
    { value: '4K', text: 'Kualitas: Ultra HD (4K)' },
    { value: '8K', text: 'Kualitas: Sinematik (8K)' }
];

const VIDEO_CAMERA_OPTIONS = [
    { value: '', text: 'Kamera: (Default AI)' },
    { value: 'Lensa Sinematik (Arri Alexa)', text: 'Kamera: Sinematik (Lensa 35mm)' },
    { value: 'DSLR (Canon EOS 5D)', text: 'Kamera: DSLR (Lensa 50mm)' },
    { value: 'Ponsel (iPhone 15 Pro)', text: 'Kamera: Ponsel (Gaya Rekaman)' },
    { value: 'GoPro (POV)', text: 'Kamera: Aksi (GoPro POV)' },
    { value: 'Drone shot', text: 'Tampilan: Drone (Aerial Shot)' },
    { value: 'Close-up shot', text: 'Tampilan: Close-up (Wajah/Detail)' },
    { value: 'Medium shot', text: 'Tampilan: Medium (Setengah Badan)' },
    { value: 'Wide shot', text: 'Tampilan: Wide (Lingkungan)' },
    { value: 'Tracking shot', text: 'Tampilan: Tracking (Mengikuti Objek)' }
];

const VIDEO_FPS_OPTIONS = [
    { value: '', text: 'FPS: (Default AI)' },
    { value: '30 FPS', text: 'FPS: 30 (Standar)' },
    { value: '60 FPS', text: 'FPS: 60 (Mulus)' },
    { value: '120 FPS', text: 'FPS: 120 (Slow-mo)' }
];

const PROMPT_LANGUAGE_OPTIONS = [
    { value: 'id-ID', text: 'Bahasa: Indonesia' },
    { value: 'en-US', text: 'Bahasa: English' }
];

const DIALOGUE_LANGUAGE_OPTIONS = [
    { value: '', text: 'Dialog: (Default/Otomatis)' },
    { value: 'Tanpa Dialog', text: 'Dialog: Tanpa Dialog (Sunyi)' },
    { value: 'Bahasa Indonesia', text: 'Dialog: Bahasa Indonesia' },
    { value: 'English', text: 'Dialog: English' },
    { value: 'Japanese', text: 'Dialog: Japanese' },
    { value: 'Korean', text: 'Dialog: Korean' }
];


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


const initCustomSelects = () => {
    renderOptions('video-style', VIDEO_STYLE_OPTIONS);
    renderOptions('video-quality', VIDEO_QUALITY_OPTIONS);
    renderOptions('video-camera', VIDEO_CAMERA_OPTIONS);
    renderOptions('video-fps', VIDEO_FPS_OPTIONS);
    renderOptions('prompt-language', PROMPT_LANGUAGE_OPTIONS);
    
    renderOptions('dialogue-language', DIALOGUE_LANGUAGE_OPTIONS);
    document.querySelectorAll('.custom-select').forEach(select => {
        if (select.querySelector('.select-selected')) return; 
        if (select.children.length === 0) return; 

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

        const placeholder = select.dataset.placeholder;
        if (placeholder) {
            selected.textContent = placeholder;
            selected.dataset.placeholder = "true"; 
        } else {

            selected.textContent = items.children[0].textContent;
            selected.dataset.value = items.children[0].dataset.value;
        }
        
        select.innerHTML = ''; 
        select.appendChild(selected);
        select.appendChild(items);

        selected.addEventListener('click', e => {
            e.stopPropagation();
            closeAllSelects(select);
            const isActive = select.classList.toggle('active');
            items.style.display = isActive ? 'block' : 'none';
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const { GEMINI_API_KEY, LOCAL_STORAGE_KEY_PROMPTS } = CONFIG;
    
    let characterCount = 0; 

    const loader = document.getElementById('loader');
    const notificationBar = document.getElementById('notification-bar');
    const savedPanel = document.getElementById('saved-prompts-panel');
    const openSavedPanelBtn = document.getElementById('open-saved-panel');
    const closeSavedPanelBtn = document.getElementById('close-saved-panel');
    const savedPromptsList = document.getElementById('saved-prompts-list');
    const resultScreen = document.getElementById('result-screen');
    const closeResultPanelBtn = document.getElementById('close-result-panel');
    const resultText = document.getElementById('result-text');

    const generateBtn = document.getElementById('generate-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const copyPromptBtn = document.getElementById('copy-prompt-btn');
    
    const charactersContainer = document.getElementById('characters-container');
    
    const showLoader = (text = "Membuat...") => {
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
        const colorVar = type === 'error' ? 'var(--accent-color)' : 'var(--accent-color)'; 
        
        notificationBar.textContent = message;
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
        block.querySelector('.btn-remove-char').addEventListener('click', (e) => {
            e.target.closest('.character-block').remove();
        });
        
        charactersContainer.appendChild(block);
    };

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

// PERBAIKAN DI SINI: GANTI FUNGSI INI SECARA KESELURUHAN
const generatePrompt = async () => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("GANTI_DENGAN_API_KEY_KAMU")) {
        return showNotification("Harap masukkan API Key di file config.js", 'error');
    }
    
    showLoader("Sedang memperbaiki...");
    
    // Helper untuk ambil nilai dropdown
    const getSelectValue = (id) => {
        const el = document.getElementById(id)?.querySelector('.select-selected');
        // Jika masih placeholder ATAU valuenya string kosong (''), kembalikan string kosong
        return (el?.dataset.placeholder || el?.dataset.value === "") ? "" : el?.dataset.value || "";
    }
    
    // 1. Kumpulkan data
    const scene = document.getElementById('video-scene').value;
    const style = getSelectValue('video-style');
    const quality = getSelectValue('video-quality');
    const camera = getSelectValue('video-camera');
    const fps = getSelectValue('video-fps');
    const lang = getSelectValue('prompt-language');
    const dialogueLang = getSelectValue('dialogue-language');
    
    let characterDetails = Array.from(document.querySelectorAll('.character-block'))
        .map((b, i) => {
            const desc = b.querySelector('.char-description').value.trim();
            return desc ? `- Karakter ${i+1}: ${desc}` : '';
        })
        .filter(detail => detail)
        .join('\n');
    
    // 2. Buat Brief (PERBAIKAN: Instruksi dialog lebih jelas)
    
    // --- INI LOGIKA BARU UNTUK 'MEMAKSA' DIALOG ---
    let dialogueInstruction = "Tidak ada dialog spesifik. AI bebas menentukan.";
    
    if (dialogueLang === 'Tanpa Dialog') {
        dialogueInstruction = "Pastikan prompt video TIDAK mengandung dialog atau ucapan sama sekali. Fokus hanya pada visual dan suara alam/musik.";
    } else if (dialogueLang) {
        // Jika bahasa dipilih (misal 'Bahasa Indonesia' atau 'English')
        dialogueInstruction = `PENTING: Anda HARUS menyertakan dialog atau ucapan singkat dalam ${dialogueLang} yang diucapkan oleh karakter, sesuai dengan aksi dan adegan mereka. Contoh: "Pergi dari sini!" atau "Lihat, itu dia." Masukkan dialog ini ke dalam prompt secara alami.`;
    }
    // --- AKHIR LOGIKA BARU ---
    
    const directorBrief = `ANDA ADALAH ASISTEN PEMBUAT PROMPT VIDEO AI. Tugas Anda adalah membuat satu paragraf prompt video yang sinematik.
    
PERATURAN PENTING:
1.  HANYA KELUARKAN PARAGRAF PROMPT FINAL dalam bahasa yang diminta.
2.  Prompt harus fokus pada visual, atmosfer, dan detail teknis.
3.  **PERHATIKAN INSTRUKSI DIALOG INI:** ${dialogueInstruction}

--- BRIEF SUTRADARA ---
- Bahasa Output: ${lang === 'id-ID' ? 'Bahasa Indonesia' : 'English'}
- Instruksi Dialog: ${dialogueInstruction}
- Deskripsi Adegan: ${scene || 'Tidak ada deskripsi spesifik.'}
- Karakter & Aksi:\n${characterDetails || 'Tidak ada karakter spesifik.'}
- Gaya Visual: ${style || 'Default AI.'}
- Kualitas: ${quality || 'Default AI.'}
- Kamera/Tampilan: ${camera || 'Default AI.'}
- FPS: ${fps || 'Default AI.'}
--------------------`;
    
    showLoader("Sedang membuat prompt...");
    
    // 3. Panggil API
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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


    const initPage = () => {
        const settings = loadSettings();
        applySettings(settings, false); 
        initCustomSelects(); 
        addCharacterField();
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

    initPage();
});