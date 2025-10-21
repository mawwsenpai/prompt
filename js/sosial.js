
import { 
    loadSettings, 
    applySettings, 
    initCustomSelects 
} from './theme.js';

// Mengakses CONFIG yang dimuat secara global dari config.js
const { LOCAL_STORAGE_KEY_PROFILE } = CONFIG; 

document.addEventListener('DOMContentLoaded', () => {
    let firebaseApp, auth, database, provider;
    let currentUser = null;
    
    // Elemen DOM untuk sosial.html
    const docEl = document.documentElement;
    const screens = Object.fromEntries(Array.from(document.querySelectorAll('.screen')).map(el => [el.id.replace('-screen', ''), el]));
    const containers = { 
        background: document.getElementById('background-container'), 
        chatBox: document.getElementById('chat-box')
    };
    const notificationBar = document.getElementById('notification-bar');

    // --- UTILITIES & HELPERS ---
    
    const switchScreen = (screenName) => {
        if (!screenName || !screens[screenName]) return;
        Object.values(screens).forEach(s => s && s.classList.remove('active'));
        screens[screenName].classList.add('active');
    };

    const showNotification = (message, type = 'success') => {
        if (!notificationBar) return;
        notificationBar.textContent = message;
        notificationBar.style.borderLeftColor = `var(--${type}-color, var(--info-color))`;
        notificationBar.classList.add('show');
        setTimeout(() => notificationBar.classList.remove('show'), 3000);
    };

    const getLocalProfile = (uid) => { 
        try { 
            return JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_KEY_PROFILE}_${uid}`)) || {} 
        } catch (e) { 
            return {} 
        } 
    };

    // --- FIREBASE & COMMUNITY LOGIC ---
    
    const initFirebase = () => {
        try {
            if (!firebase.apps.length) { 
                firebaseApp = firebase.initializeApp(CONFIG.firebaseConfig); 
            } else { 
                firebaseApp = firebase.app(); 
            }
            auth = firebase.auth();
            database = firebase.database();
            provider = new firebase.auth.GoogleAuthProvider();
            auth.onAuthStateChanged(user => {
                currentUser = user;
                if (user) {
                    setupPresence(user.uid);
                    listenForMessages();
                    listenForOnlineStatus();
                    // Jika login berhasil, langsung tampilkan komunitas
                    if (screens['community']) switchScreen('community');
                } else {
                    // Jika logout/belum login, tampilkan login screen
                    if (screens['login']) switchScreen('login');
                }
            });
            return true;
        } catch(e) { 
            console.error("Firebase Init Error:", e); 
            return false; 
        }
    };
    
    const setupPresence = (uid) => {
        const userStatusDatabaseRef = database.ref('/status/' + uid);
        const isOfflineForDatabase = { isOnline: false, last_changed: firebase.database.ServerValue.TIMESTAMP };
        const isOnlineForDatabase = { isOnline: true, last_changed: firebase.database.ServerValue.TIMESTAMP };
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === false) return;
            userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(() => {
                userStatusDatabaseRef.set(isOnlineForDatabase);
            });
        });
    };

    const listenForOnlineStatus = () => {
        const statusRef = database.ref('/status');
        statusRef.on('value', snap => {
            const onlineUsers = snap.val() || {};
            const onlineCount = Object.values(onlineUsers).filter(u => u.isOnline).length;
            const infoEl = document.getElementById('online-users-info');
            if (infoEl) {
                infoEl.textContent = onlineCount > 0 ? `${onlineCount} pengguna sedang online` : 'Tidak ada pengguna online';
            }
        });
    };
    
    const formatDateSeparator = (date) => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isToday = today.toDateString() === date.toDateString();
        const isYesterday = yesterday.toDateString() === date.toDateString();

        if (isToday) return 'HARI INI';
        if (isYesterday) return 'KEMARIN';
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    };


    const listenForMessages = () => {
        if(!database || !containers.chatBox) return;
        const messagesRef = database.ref('messages').limitToLast(100);
        messagesRef.on('value', snapshot => {
            containers.chatBox.innerHTML = '';
            let lastMessageDateStr = null;
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const msg = child.val();
                    const msgDate = new Date(msg.timestamp);
                    const msgDateStr = msgDate.toDateString();

                    if (msgDateStr !== lastMessageDateStr) {
                        const dateSeparator = document.createElement('div');
                        dateSeparator.className = 'date-separator';
                        dateSeparator.innerHTML = `<span>${formatDateSeparator(msgDate)}</span>`;
                        containers.chatBox.appendChild(dateSeparator);
                        lastMessageDateStr = msgDateStr;
                    }
                    appendChatMessage(msg);
                });
            }
            containers.chatBox.scrollTop = containers.chatBox.scrollHeight;
        });
    };

    const appendChatMessage = (msg) => {
        if(!containers.chatBox) return;
        const msgDate = new Date(msg.timestamp);
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `chat-message ${currentUser && msg.uid === currentUser.uid ? 'out' : 'in'}`;
        const avatar = `<img class="chat-avatar" data-action="view-profile" data-uid="${msg.uid}" src="${msg.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author || 'U')}&background=random`}" alt="Avatar"/>`;
        const content = `<div class="chat-content">
            ${currentUser && msg.uid !== currentUser.uid ? `<div class="chat-author" data-action="view-profile" data-uid="${msg.uid}">${msg.author}</div>` : ''}
            <div class="chat-bubble ${currentUser && msg.uid === currentUser.uid ? 'out' : 'in'}">${msg.text}</div>
            <div class="chat-meta">${msgDate.getHours()}:${String(msgDate.getMinutes()).padStart(2, '0')}</div>
        </div>`;
        messageWrapper.innerHTML = avatar + content;
        containers.chatBox.appendChild(messageWrapper);
    };

    const sendChatMessage = () => {
        const chatInput = document.getElementById('chat-input');
        if(!database || !chatInput) return;
        const message = chatInput.value.trim();
        if (!message || !currentUser) return;
        database.ref('messages').push({ 
            text: message, author: currentUser.displayName, uid: currentUser.uid, 
            photoURL: currentUser.photoURL, timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
        chatInput.value = '';
    };

    // --- PROFILE LOGIC ---
    
    const showProfile = async (uid = null) => {
        const isOwnProfile = !uid || (currentUser && uid === currentUser.uid);
        const targetUid = isOwnProfile ? (currentUser ? currentUser.uid : null) : uid;
        if (!targetUid) return;

        let profileData = {};
        if (isOwnProfile) {
            profileData = {
                ...getLocalProfile(targetUid),
                name: currentUser.displayName,
                email: currentUser.email,
                photo: currentUser.photoURL
            };
        } else {
            try {
                const snapshot = await database.ref('/profiles/' + targetUid).once('value');
                profileData = snapshot.val() || { name: 'Pengguna', email: '...', photo: '' };
            } catch (e) {
                console.error("Gagal mengambil profil dari Firebase:", e);
                profileData = { name: 'Pengguna', email: 'Error', photo: '' };
            }
        }
        
        document.getElementById('profile-img').src = profileData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=random`;
        document.getElementById('profile-name').textContent = profileData.name;
        document.getElementById('profile-email').textContent = profileData.email || '...';
        
        const dobEl = document.getElementById('profile-dob');
        if (profileData.dob) {
            dobEl.textContent = `Lahir: ${new Date(profileData.dob).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric'})}`;
            dobEl.style.display = 'block';
        } else { dobEl.style.display = 'none'; }

        const descEl = document.getElementById('profile-desc');
        if (profileData.desc) {
            descEl.textContent = `"${profileData.desc}"`;
            descEl.style.display = 'block';
        } else { descEl.style.display = 'none'; }
        
        renderSocialLinks(profileData.socials);
        document.querySelector("[data-action='show-edit-profile']").style.display = isOwnProfile ? 'block' : 'none';
        switchScreen('profile');
    };

    const showEditProfile = () => {
         if (!currentUser) return;
         const localProfile = getLocalProfile(currentUser.uid);
         const defaultProfile = { name: currentUser.displayName, photo: currentUser.photoURL, dob: '', desc: '', socials: {} };
         const finalProfile = {...defaultProfile, ...localProfile};

         document.getElementById('profile-edit-img').src = finalProfile.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalProfile.name)}&background=random`;
         document.getElementById('profile-edit-name').value = finalProfile.name;
         document.getElementById('profile-edit-dob').value = finalProfile.dob;
         document.getElementById('profile-edit-desc').value = finalProfile.desc;
         ['tiktok', 'youtube', 'instagram', 'facebook'].forEach(social => {
             document.getElementById(`social-${social}`).value = finalProfile.socials?.[social] || '';
         });
         switchScreen('edit-profile');
    };

    const saveProfile = () => {
        if (!currentUser) return;
        const profileData = {
            name: document.getElementById('profile-edit-name').value,
            dob: document.getElementById('profile-edit-dob').value,
            desc: document.getElementById('profile-edit-desc').value,
            photo: document.getElementById('profile-edit-img').src,
            socials: {
                tiktok: document.getElementById('social-tiktok').value,
                youtube: document.getElementById('social-youtube').value,
                instagram: document.getElementById('social-instagram').value,
                facebook: document.getElementById('social-facebook').value
            }
        };
        // Simpan ke local storage untuk akses cepat diri sendiri
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PROFILE}_${currentUser.uid}`, JSON.stringify(profileData));
        
        // Simpan ke Firebase Database agar bisa dilihat orang lain
        const publicProfileData = {
            name: profileData.name,
            desc: profileData.desc,
            photo: profileData.photo,
            socials: profileData.socials
        };
        database.ref('profiles/' + currentUser.uid).set(publicProfileData);

        showNotification("Profil berhasil disimpan!", "success");
        showProfile(currentUser.uid);
    };
    
    const renderSocialLinks = (socials) => {
        const container = document.getElementById('social-links-view');
        container.innerHTML = '';
        if (!socials) return;
        const socialSvgs = {
            tiktok: `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.83-.95-6.43-2.88-1.59-1.92-2.31-4.58-1.91-7.12.41-2.44 1.91-4.59 3.96-5.77.59-.34 1.23-.61 1.88-.82.02 3.16.02 6.33.01 9.49.01.79-.34 1.56-.94 2.06-1.43 1.18-3.53 1.02-4.52-.38-.45-.64-.67-1.47-.64-2.28.03-.78.28-1.53.63-2.2.53-1 1.6-1.52 2.7-1.5.86.01 1.72.38 2.39 1.01.69.64 1 1.54.95 2.45-.04.89-.48 1.73-1.15 2.21-.52.37-1.16.52-1.78.48-.5-.03-1-.2-1.42-.51-.36-.26-.64-.64-.81-1.05-.08-.19-.13-.39-.17-.59-.05-.24-.04-.52.03-.76.08-.3.26-.57.5-.78.63-.53 1.47-.7 2.3-.5.42.09.82.31 1.15.61.13.12.22.28.29.43.01.03.01.06.02.08.01.06.01.12.02.18.01.07.01.13.01.2 0 .04.01.08.01.12v.04c0 .03.01.06.01.09.01.06 0 .12-.01.18-.01.06-.02.12-.03.18-.01.06-.03.12-.05.18-.02.06-.04.12-.06.18-.02.06-.05.12-.08.17-.03.05-.06.1-.09.15-.06.09-.13.18-.21.26-.17.17-.37.31-.59.42-.23.11-.49.19-.75.22-.3.04-.6.03-.9-.05-.86-.23-1.51-.83-1.81-1.63-.1-1.21.4-2.52 1.35-3.29.95-.77 2.29-1.04 3.51-.81.93.17 1.83.62 2.51 1.29.68.67 1.05 1.58 1.05 2.51.01 2.08-.01 4.17-.01 6.25.01 1.08-.43 2.14-1.22 2.87-1.18 1.08-2.91 1.3-4.34.63-1.43-.67-2.41-2.07-2.66-3.66-.25-1.59.31-3.32 1.42-4.37.01-.01.01-.01.01-.02Z"/></svg>`,
            youtube: `<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
            instagram: `<svg viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.784.305-1.48.77-2.175 1.465C1.27 2.808.805 3.502.5 4.287.197 5.055 0 5.925 0 7.204.058 8.484.072 8.89.072 12s-.015 3.516-.072 4.796c-.058 1.277-.258 2.147-.558 2.912-.308.783-.77 1.48-1.465 2.175-.697.697-1.392 1.162-2.175 1.465-.765.3-1.635.5-2.913.562C8.333 23.985 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.147-.262 2.912-.562.783-.303 1.48-.768 2.175-1.465.697-.697 1.162-1.392 1.465-2.175.3-.765.5-1.635.562-2.913.06-1.28.072-1.687.072-4.796s-.015-3.516-.072-4.796c-.06-1.277-.262-2.147-.562-2.912-.303-.784-.768-1.48-1.465-2.175C21.192 1.27 20.498.805 19.713.5 18.945.197 18.075 0 16.796.058 15.516.015 15.11 0 12 0zm0 2.16c3.203 0 3.585.012 4.85.07 1.17.055 1.805.248 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.012 3.585-.07 4.85c-.055 1.17-.248 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.82.679-1.382.896-.422-.164-1.057.36-2.227.413-1.266.057-1.646.07-4.85.07s-3.585-.012-4.85-.07c-1.17-.055-1.805-.248-2.227-.413-.562-.217-.96-.477-1.382-.896-.419-.42-.679-.82-1.381-.896-.164-.422-.36-1.057-.413-2.227-.057-1.266-.07-1.646-.07-4.85s.012-3.585.07-4.85c.055-1.17.248-1.805.413-2.227.217-.562.477.96.896-1.382.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.057 1.646-.07 4.85-.07zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>`,
            facebook: `<svg viewBox="0 0 24 24"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.732 0 1.325-.593 1.325-1.325V1.325C24 .593 23.407 0 22.675 0z"/></svg>`
        };
        const socialUrls = { 
            tiktok: (u) => `https://www.tiktok.com/@${u}`, 
            youtube: (u) => `https://www.youtube.com/${u}`, 
            instagram: (u) => `https://www.instagram.com/${u}`, 
            facebook: (u) => `https://www.facebook.com/${u}` 
        };

        for (const [key, user] of Object.entries(socials)) {
            if (user && socialSvgs[key]) {
                const a = document.createElement('a');
                a.href = socialUrls[key](user.replace('@',''));
                a.target = '_blank';
                a.title = key.charAt(0).toUpperCase() + key.slice(1);
                a.innerHTML = socialSvgs[key];
                container.appendChild(a);
            }
        }
    };


    // --- INITIALIZATION & EVENT LISTENERS ---
    const initApp = () => {
        initFirebase();
        
        // Memuat dan mengaplikasikan settings (dari theme.js)
        const settings = loadSettings();
        applySettings(settings, false); // false karena bukan halaman settings
        initCustomSelects();

        // Biarkan auth.onAuthStateChanged menentukan layar awal (login atau community)
    };
    
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const actions = {
            'switch-screen': () => switchScreen(target.dataset.target),
            // Navigasi ke Home
            'go-home': () => window.location.href = 'index.html',
            
            // SOSIAL ACTIONS
            'login': () => auth && auth.signInWithPopup(provider).then(()=>switchScreen('community')),
            'send-chat': sendChatMessage,
            'show-profile': () => { if(currentUser) showProfile(currentUser.uid); else switchScreen('login'); },
            'view-profile': () => showProfile(target.dataset.uid),
            'show-edit-profile': showEditProfile,
            'save-profile': saveProfile,
        };
        if (actions[action]) actions[action]();
    });

    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

    initApp();
});