// DÉTECTION : Web ou Electron ?
const isWeb = typeof require === 'undefined';
let ipcRenderer = null;

if (!isWeb) {
    ipcRenderer = require('electron').ipcRenderer;
}

const audio = new Audio();

// Elements HTML
const playlistElement = document.getElementById("fileListBody");
const btn = document.getElementById("playPauseBtn");
const icon = document.getElementById("icon");
const nextBtn = document.querySelector("#next");
const prevBtn = document.querySelector("#prev");
const shuffleBtn = document.querySelector("#shuffle");
const btnHome = document.getElementById("btnHome");
const btnFichier = document.getElementById("btnFichier");
const btnPlaylist = document.getElementById("btnPlaylist");
const homeView = document.getElementById("homeView");
const playListView = document.getElementById("playListView");
const fileView = document.getElementById("fileView");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("mainSidebar");
const volumeControl = document.querySelector("#volume");
const volumeIcon = document.getElementById("volumeIcon");
const currentTimeEl = document.querySelector("#currentTime");
const durationEl = document.querySelector("#duration");
const progressConainerDiv = document.getElementById("progressBarContainer");
const progressDiv = document.getElementById("progress");
const cover = document.querySelector("#cover");
const newPlayListNameInput = document.getElementById("newPlayListName");
const addPlayListBtn = document.getElementById("addPlayListBtn");
const playlistListElement = document.getElementById("playlistList");
const playlistDetailView = document.getElementById("playlistDetailView");
const playlistSongBody = document.getElementById("playlistSongBody");
const currentPlaylistTitle = document.getElementById("currentPlaylistTitle");
const btnBackToPlaylists = document.getElementById("btnBackToPlaylists");
const modalOverlay = document.getElementById("modalOverlay");
const modalMusicName = document.getElementById("modalMusicName");
const modalSelect = document.getElementById("modalSelect");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");
const modalCreatePlaylist = document.getElementById("modalCreatePlaylist");
const defaultVolumeSlider = document.getElementById("defaultVolume");
const defaultVolumeValue = document.getElementById("defaultVolumeValue");
const parametreView = document.getElementById("parametreView");

// Variables globales
let allPlaylists = [];
let currentPlaylistSongs = [];
let isPlaylistMode = false;
let playlist = [];
let currentIndex = 0;
let lastVolume = 1;

// =============================================
// ADAPTATION POUR LA VERSION WEB
// =============================================
if (isWeb) {
    document.getElementById('windowControls').style.display = 'none';
    document.getElementById('sectionObs').style.display = 'none';
    document.getElementById('dossierControls').innerHTML = '<span style="color: #cc0000; font-size: 13px;">Fonction exclusive à l\'application PC</span>';
    
    const addFilesWebBtn = document.getElementById('addFilesWebBtn');
    const webFileInput = document.getElementById('webFileInput');
    addFilesWebBtn.style.display = 'block';

    addFilesWebBtn.addEventListener('click', () => webFileInput.click());

    webFileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            if (!playlist.find(m => m.name === file.name)) {
                playlist.push({ name: file.name, url: url, path: file.name, fileObj: file });
            }
        });
        playlist.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        displayStoredFiles();
        
        if(playlistElement) {
            playlistElement.innerHTML = "";
            playlist.forEach((music, index) => addToPlaylist(music.name, index));
        }
    });
}

// =============================================
// MODALES CUSTOM
// =============================================
function showConfirm(message, title = "Confirmation") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("modalConfirmOverlay");
        document.getElementById("modalConfirmTitle").textContent = title;
        document.getElementById("modalConfirmMessage").textContent = message;
        overlay.style.display = "flex";

        const okBtn = document.getElementById("modalConfirmOk");
        const cancelBtn = document.getElementById("modalConfirmCancel");

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.addEventListener("click", () => { overlay.style.display = "none"; resolve(true); });
        newCancel.addEventListener("click", () => { overlay.style.display = "none"; resolve(false); });
    });
}

function showInfo(message, title = "Information") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("modalInfoOverlay");
        document.getElementById("modalInfoTitle").textContent = title;
        document.getElementById("modalInfoMessage").textContent = message;
        overlay.style.display = "flex";

        const okBtn = document.getElementById("modalInfoOk");
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);

        newOk.addEventListener("click", () => { overlay.style.display = "none"; resolve(); });
    });
}

function showPrompt(message, defaultValue = "", title = "Saisie") {
    return new Promise((resolve) => {
        const overlay = document.getElementById("modalRenamePlaylist");
        document.getElementById("modalRenameTitle").textContent = title;
        const input = document.getElementById("renamePlaylistInput");
        input.value = defaultValue;
        overlay.style.display = "flex";

        setTimeout(() => input.focus(), 100);

        const confirmBtn = document.getElementById("modalRenameConfirm");
        const cancelBtn = document.getElementById("modalRenameCancel");

        const newConfirm = confirmBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        const submit = () => {
            const val = input.value.trim();
            overlay.style.display = "none";
            resolve(val || null);
        };

        newConfirm.addEventListener("click", submit);
        newCancel.addEventListener("click", () => { overlay.style.display = "none"; resolve(null); });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { overlay.style.display = "none"; resolve(null); }
        });
    });
}

// =============================================
// DÉMARRAGE
// =============================================
async function init() {
    await loadFilesFromLocal();
    await loadPlaylistsFromLocal();

    const savedDefaultVolume = localStorage.getItem("defaultVolume");
    if (savedDefaultVolume !== null) {
        audio.volume = parseFloat(savedDefaultVolume);
        volumeControl.value = savedDefaultVolume;
        defaultVolumeSlider.value = savedDefaultVolume;
        defaultVolumeValue.textContent = Math.round(savedDefaultVolume * 100) + "%";
    }
}
init();

// =============================================
// CHARGEMENT / SAUVEGARDE
// =============================================
async function loadFilesFromLocal() {
    if (isWeb) return; 
    
    const saved = await ipcRenderer.invoke('get-music-list');
    for (let music of saved) {
        if (!music.path) continue;
        playlist.push({ name: music.name, url: `file:///${music.path.replace(/\\/g, '/')}`, path: music.path });
    }

    playlist.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    playlist.forEach((music, index) => addToPlaylist(music.name, index));
    displayStoredFiles();

    const watchedFolder = await ipcRenderer.invoke('get-watched-folder');
    if (watchedFolder) {
        document.getElementById('watchedFolderPath').textContent = watchedFolder;
        await startWatchingFolder(watchedFolder);
    }
}

async function loadPlaylistsFromLocal() {
    if (isWeb) {
        const savedPl = localStorage.getItem("webPlaylists");
        if (savedPl) allPlaylists = JSON.parse(savedPl);
    } else {
        allPlaylists = await ipcRenderer.invoke('load-playlists');
    }
    displayPlaylist();
}

async function saveMusicList() {
    if (isWeb) return;
    await ipcRenderer.invoke('save-music-list', playlist.map(m => ({ name: m.name, path: m.path })));
}

async function savePlaylistsToLocal() {
    if (isWeb) {
        localStorage.setItem("webPlaylists", JSON.stringify(allPlaylists));
        return;
    }
    const toSave = allPlaylists.map(pl => ({
        title: pl.title,
        songs: pl.songs.map(s => ({ name: s.name, path: s.path || "" }))
    }));
    await ipcRenderer.invoke('save-playlists', toSave);
}

// =============================================
// SURVEILLANCE DU DOSSIER PRINCIPAL
// =============================================
const removeMusicFolderBtn = document.getElementById('removeMusicFolderBtn');
if (removeMusicFolderBtn && !isWeb) {
    removeMusicFolderBtn.addEventListener('click', async () => {
        const ok = await showConfirm("Supprimer le dossier surveillé ? Les musiques resteront dans la bibliothèque.", "Supprimer le dossier");
        if (!ok) return;

        await ipcRenderer.invoke('remove-watched-folder');
        await ipcRenderer.invoke('stop-watching');

        playlist = [];
        await saveMusicList();
        currentPage = 0;
        displayStoredFiles();
        if (playlistElement) playlistElement.innerHTML = "";

        document.getElementById('watchedFolderPath').textContent = "Aucun dossier";
        await showInfo("Bibliothèque réinitialisée avec succès.", "Nettoyage");
    });
}

async function startWatchingFolder(folderPath) {
    if (isWeb) return;
    const files = await ipcRenderer.invoke('watch-folder', folderPath);
    const newFiles = files.filter(f => !playlist.find(m => m.name === f.name));
    if (newFiles.length > 0) await addFilesToPlaylist(newFiles);
}

async function addFilesToPlaylist(files) {
    const newFiles = files.filter(f => !playlist.find(m => m.name === f.name));
    if (newFiles.length === 0) return;

    for (let file of newFiles) {
        const url = `file:///${file.path.replace(/\\/g, '/')}`;
        playlist.push({ name: file.name, url: url, path: file.path });
    }

    playlist.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    playlistElement.innerHTML = "";
    playlist.forEach((music, index) => addToPlaylist(music.name, index));

    await saveMusicList();
    displayStoredFiles();
}

function addToPlaylist(name, index) {
    const li = document.createElement("li");
    li.textContent = name;
    li.setAttribute("data-index", index);
    li.addEventListener("click", () => { playMusic(index); });
    playlistElement.appendChild(li);
}

// =============================================
// LECTURE MUSIQUE
// =============================================
function playMusic(index) {
    currentIndex = index;
    const music = playlist[index];
    audio.src = music.url;
    audio.play();
    icon.src = "Icons/Pause - Yellow.svg";
    loadCover(music);
    document.getElementById("musicTitle").textContent = music.name.replace(/\.[^/.]+$/, "");
    document.querySelectorAll("[data-index]").forEach(li => { li.style.background = ""; });
    const active = document.querySelector(`[data-index="${index}"]`);
    if (active) active.style.background = "#555";
    updateActivePlaylistSquare();
}

function loadCover(music) {
    if (!music) { 
        cover.src = ""; 
        if(!isWeb) notifyOBS(); 
        return; 
    }

    const processTags = (blob) => {
        jsmediatags.read(blob, {
            onSuccess: function(tag) {
                const picture = tag.tags.picture;
                if (picture) {
                    let base64 = "";
                    for (let i = 0; i < picture.data.length; i++) {
                        base64 += String.fromCharCode(picture.data[i]);
                    }
                    cover.src = `data:${picture.format};base64,${btoa(base64)}`;
                } else {
                    cover.src = "";
                }
                if(!isWeb) notifyOBS(); 
            },
            onError: function() { 
                cover.src = ""; 
                if(!isWeb) notifyOBS(); 
            }
        });
    };

    if (isWeb && music.fileObj) {
        processTags(music.fileObj);
    } else if (!isWeb && music.path) {
        try {
            const fs = require('fs');
            const fd = fs.openSync(music.path, 'r');
            const buf = Buffer.alloc(512 * 1024);
            fs.readSync(fd, buf, 0, buf.length, 0);
            fs.closeSync(fd);
            const blob = new Blob([buf]);
            processTags(blob);
        } catch(e) { 
            cover.src = ""; 
            notifyOBS(); 
        }
    } else {
        cover.src = "";
        if(!isWeb) notifyOBS();
    }
}

// =============================================
// BOUTONS LECTEUR
// =============================================
btn.onclick = () => {
    if (audio.src) {
        if (audio.paused) {
            audio.play();
            icon.src = "Icons/Pause - Yellow.svg";
        } else {
            audio.pause();
            icon.src = "Icons/Play - Yellow.svg";
        }
    }
    updateActivePlaylistSquare();
};

nextBtn.onclick = () => {
    if (playlist.length === 0) return;
    if (shuffleMode) {
        if (isPlaylistMode && currentPlaylistSongs.length > 0) {
            playMusic(currentPlaylistSongs[Math.floor(Math.random() * currentPlaylistSongs.length)]);
        } else {
            playMusic(Math.floor(Math.random() * playlist.length));
        }
    } else if (isPlaylistMode && currentPlaylistSongs.length > 0) {
        const pos = currentPlaylistSongs.indexOf(currentIndex);
        playMusic(currentPlaylistSongs[(pos + 1) % currentPlaylistSongs.length]);
    } else {
        currentIndex = (currentIndex + 1) % playlist.length;
        playMusic(currentIndex);
    }
};

prevBtn.onclick = () => {
    if (playlist.length === 0) return;
    if (shuffleMode) {
        if (isPlaylistMode && currentPlaylistSongs.length > 0) {
            playMusic(currentPlaylistSongs[Math.floor(Math.random() * currentPlaylistSongs.length)]);
        } else {
            playMusic(Math.floor(Math.random() * playlist.length));
        }
    } else if (isPlaylistMode && currentPlaylistSongs.length > 0) {
        const pos = currentPlaylistSongs.indexOf(currentIndex);
        playMusic(currentPlaylistSongs[(pos - 1 + currentPlaylistSongs.length) % currentPlaylistSongs.length]);
    } else {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playMusic(currentIndex);
    }
};

let shuffleMode = false;
shuffleBtn.onclick = () => {
    shuffleMode = !shuffleMode;
    if (shuffleMode) {
        shuffleBtn.querySelector('img').classList.add("active-control");
        if(playlist.length > 0) {
            if (isPlaylistMode && currentPlaylistSongs.length > 0) {
                playMusic(currentPlaylistSongs[Math.floor(Math.random() * currentPlaylistSongs.length)]);
            } else {
                playMusic(Math.floor(Math.random() * playlist.length));
            }
        }
    } else {
        shuffleBtn.querySelector('img').classList.remove("active-control");
    }
};

let repeatMode = 0;
const repeatBtn = document.getElementById("repeat");
const repeatImg = document.getElementById("repeatIcon");
const repeatIcons = ["Icons/fleches-repetition.svg", "Icons/fleches-repetition.svg", "Icons/fleches-repeter-1.svg"];

repeatBtn.addEventListener("click", () => {
    repeatMode = (repeatMode + 1) % 3;
    repeatImg.src = repeatIcons[repeatMode];
    repeatMode > 0 ? repeatBtn.classList.add("active-control") : repeatBtn.classList.remove("active-control");
});

audio.addEventListener("ended", () => {
    if (repeatMode === 2) {
        audio.currentTime = 0;
        audio.play();
        icon.src = "Icons/Pause - Yellow.svg";
    } else if (shuffleMode) {
        if (isPlaylistMode && currentPlaylistSongs.length > 0) {
            playMusic(currentPlaylistSongs[Math.floor(Math.random() * currentPlaylistSongs.length)]);
        } else {
            playMusic(Math.floor(Math.random() * playlist.length));
        }
    } else if (isPlaylistMode || repeatMode === 1) {
        nextBtn.click();
    } else {
        audio.currentTime = 0;
        icon.src = "Icons/Play - Yellow.svg";
    }
});

audio.addEventListener("play", () => {
    if (parametreView.style.display === "block") return;
    homeView.style.display = "block";
    fileView.style.display = "none";
    playListView.style.display = "none";
    sidebar.classList.remove("active");
});

// =============================================
// NAVIGATION SIDEBAR
// =============================================
menuToggle.addEventListener("click", async () => {
    if (!isWeb) {
        const width = await ipcRenderer.invoke('get-window-size');
        if (width < 800) {
            ipcRenderer.send('expand-window');
            setTimeout(() => { sidebar.classList.add("active"); }, 150);
        } else {
            sidebar.classList.toggle("active");
        }
    } else {
        sidebar.classList.toggle("active");
    }
});

document.querySelectorAll(".sidebar p").forEach(link => {
    link.addEventListener("click", () => { sidebar.classList.remove("active"); });
});

btnHome.addEventListener("click", () => {
    homeView.style.display = "block";
    playListView.style.display = "none";
    fileView.style.display = "none";
    playlistDetailView.style.display = "none";
    parametreView.style.display = "none";
});

btnFichier.addEventListener("click", () => {
    homeView.style.display = "none";
    playListView.style.display = "none";
    fileView.style.display = "block";
    playlistDetailView.style.display = "none";
    parametreView.style.display = "none";
    isPlaylistMode = false;
    displayStoredFiles();
});

btnPlaylist.addEventListener("click", () => {
    homeView.style.display = "none";
    playListView.style.display = "block";
    fileView.style.display = "none";
    playlistDetailView.style.display = "none";
    parametreView.style.display = "none";
});

document.getElementById("btnParametre").addEventListener("click", () => {
    homeView.style.display = "none";
    playListView.style.display = "none";
    fileView.style.display = "none";
    playlistDetailView.style.display = "none";
    parametreView.style.display = "block";
    sidebar.classList.remove("active");
});

// =============================================
// CONTRÔLES FENÊTRE ELECTRON
// =============================================
if (!isWeb) {
    document.getElementById('minimizeBtn').addEventListener('click', () => { ipcRenderer.send('minimize-window'); });
    document.getElementById('maximizeBtn').addEventListener('click', () => { ipcRenderer.send('maximize-window'); });
    document.getElementById('closeBtn').addEventListener('click', () => { ipcRenderer.send('close-window'); });
}

// =============================================
// PROGRESSION & VOLUME
// =============================================
audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressDiv.style.width = percent + "%";
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
});

progressConainerDiv.addEventListener("click", (e) => {
    if (audio.duration) {
        audio.currentTime = (e.offsetX / progressConainerDiv.clientWidth) * audio.duration;
    }
});

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
}

volumeControl.addEventListener("input", () => {
    audio.volume = parseFloat(volumeControl.value);
    if (audio.volume == 0) volumeIcon.src = "Icons/Volume x.svg";
    else if (audio.volume < 0.7) volumeIcon.src = "Icons/Volume 1.svg";
    else volumeIcon.src = "Icons/Volume 2.svg";
});

volumeIcon.addEventListener("click", () => {
    if (audio.volume > 0) {
        lastVolume = audio.volume;
        audio.volume = 0;
        volumeControl.value = 0;
        volumeIcon.src = "Icons/Volume x.svg";
    } else {
        audio.volume = lastVolume;
        volumeControl.value = lastVolume;
        volumeIcon.src = audio.volume < 0.7 ? "Icons/Volume 1.svg" : "Icons/Volume 2.svg";
    }
});

defaultVolumeSlider.addEventListener("input", () => {
    const val = defaultVolumeSlider.value;
    defaultVolumeValue.textContent = Math.round(val * 100) + "%";
    audio.volume = parseFloat(val);
    volumeControl.value = val;
    localStorage.setItem("defaultVolume", val);
});

// =============================================
// TABLEAU FICHIERS
// =============================================
const durationCache = {};
const ROWS_PER_PAGE = 50;
let currentPage = 0;

function displayStoredFiles() {
    const fileListBody = document.getElementById("fileListBody");
    if (!fileListBody) return;
    fileListBody.innerHTML = "";

    const start = currentPage * ROWS_PER_PAGE;
    const end = Math.min(start + ROWS_PER_PAGE, playlist.length);
    const visible = playlist.slice(start, end);

    visible.forEach((music, i) => {
        const index = start + i;
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        titleCell.textContent = music.name.replace(/\.[^/.]+$/, "");
        titleCell.style.cursor = "pointer";
        titleCell.onclick = () => playMusic(index);

        const durationCell = document.createElement("td");
        if (durationCache[music.path]) {
            durationCell.textContent = durationCache[music.path];
        } else {
            durationCell.textContent = "...";
            const tempAudio = new Audio(music.url);
            tempAudio.onloadedmetadata = () => {
                const formatted = formatTime(tempAudio.duration);
                durationCache[music.path] = formatted;
                durationCell.textContent = formatted;
                tempAudio.src = '';
            };
        }

        const actionCell = document.createElement("td");
        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.classList.add("action-btn", "add-btn");
        addBtn.onclick = () => addMusicToPlayList(music);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "X";
        deleteBtn.classList.add("action-btn", "delete-btn");
        deleteBtn.onclick = () => deleteMusicFromFileList(index);

        actionCell.appendChild(addBtn);
        actionCell.appendChild(deleteBtn);
        row.appendChild(titleCell);
        row.appendChild(durationCell);
        row.appendChild(actionCell);
        fileListBody.appendChild(row);
    });

    updatePagination();
}

function updatePagination() {
    const old = document.getElementById("pagination");
    if (old) old.remove();
    if (playlist.length <= ROWS_PER_PAGE) return;

    const totalPages = Math.ceil(playlist.length / ROWS_PER_PAGE);
    const nav = document.createElement("div");
    nav.id = "pagination";
    nav.style.cssText = "display:flex; justify-content:center; gap:10px; padding:15px 0; color:#FCA311;";

    const prevBtnPag = document.createElement("button");
    prevBtnPag.textContent = "← Préc";
    prevBtnPag.classList.add("action-btn");
    prevBtnPag.disabled = currentPage === 0;
    prevBtnPag.onclick = () => { currentPage--; displayStoredFiles(); };

    const info = document.createElement("span");
    info.textContent = `Page ${currentPage + 1} / ${totalPages}  (${playlist.length} musiques)`;
    info.style.cssText = "display:flex; align-items:center; font-size:13px;";

    const nextBtnPag = document.createElement("button");
    nextBtnPag.textContent = "Suiv →";
    nextBtnPag.classList.add("action-btn");
    nextBtnPag.disabled = currentPage >= totalPages - 1;
    nextBtnPag.onclick = () => { currentPage++; displayStoredFiles(); };

    nav.appendChild(prevBtnPag);
    nav.appendChild(info);
    nav.appendChild(nextBtnPag);
    document.getElementById("fileView").appendChild(nav);
}

async function deleteMusicFromFileList(index) {
    const ok = await showConfirm("Supprimer cette musique de la liste ?", "Supprimer");
    if (!ok) return;
    playlist.splice(index, 1);
    saveMusicList();
    displayStoredFiles();
}

// =============================================
// PLAYLISTS
// =============================================
addPlayListBtn.addEventListener("click", () => { modalCreatePlaylist.style.display = "flex"; });

document.getElementById("modalCreateConfirm").addEventListener("click", () => {
    const name = newPlayListNameInput.value.trim();
    if (name === "") { showInfo("Donne un nom à ta playlist !", "Attention"); return; }
    allPlaylists.push({ title: name, songs: [] });
    newPlayListNameInput.value = "";
    modalCreatePlaylist.style.display = "none";
    displayPlaylist();
    savePlaylistsToLocal();
});

document.getElementById("modalCreateCancel").addEventListener("click", () => {
    newPlayListNameInput.value = "";
    modalCreatePlaylist.style.display = "none";
});

function displayPlaylist() {
    playlistListElement.innerHTML = "";
    allPlaylists.forEach((pl, index) => {
        const li = document.createElement("li");
        li.classList.add("playlist-item");
        li.onclick = () => openPlaylist(index);

        const titleSpan = document.createElement("span");
        titleSpan.textContent = pl.title;
        titleSpan.style.width = "100%";

        li.appendChild(titleSpan);
        playlistListElement.appendChild(li);
    });
    updateActivePlaylistSquare();
}

let activeMenu = null;

function openPlaylistMenu(e, index) {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
        return;
    }

    const menu = document.createElement("div");
    menu.classList.add("playlist-context-menu");

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Renommer";
    renameBtn.onclick = () => {
        menu.remove();
        activeMenu = null;
        renamePlaylist(index);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Supprimer";
    deleteBtn.onclick = () => {
        menu.remove();
        activeMenu = null;
        deletePlaylist(index);
    };

    menu.appendChild(renameBtn);
    menu.appendChild(deleteBtn);

    const rect = e.target.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY) + "px";
    menu.style.left = (rect.left + window.scrollX - 80) + "px";

    document.body.appendChild(menu);
    activeMenu = menu;

    setTimeout(() => {
        document.addEventListener("click", () => {
            if (activeMenu) { activeMenu.remove(); activeMenu = null; }
        }, { once: true });
    }, 0);
}

async function renamePlaylist(index) {
    const newName = await showPrompt(
        "Nouveau nom de la playlist :",
        allPlaylists[index].title,
        "Renommer la Playlist"
    );
    if (!newName) return;
    allPlaylists[index].title = newName;
    savePlaylistsToLocal();
    displayPlaylist();
    currentPlaylistTitle.textContent = newName;
}

async function deletePlaylist(index) {
    const ok = await showConfirm("Supprimer cette Playlist ?", "Supprimer");
    if (!ok) return;
    allPlaylists.splice(index, 1);
    savePlaylistsToLocal();
    displayPlaylist();
    if (playlistDetailView.style.display === "block") {
        playlistDetailView.style.display = "none";
        playListView.style.display = "block";
    }
}

function openPlaylist(index) {
    currentPlaylistTitle.textContent = allPlaylists[index].title;
    playListView.style.display = "none";
    playlistDetailView.style.display = "block";

    const menuBtn = document.getElementById("playlistOptionsBtn");
    menuBtn.onclick = (e) => { openPlaylistMenu(e, index); };

    renderPlaylistSongs(index);
}

function renderPlaylistSongs(playlistIndex) {
    playlistSongBody.innerHTML = "";
    const songs = allPlaylists[playlistIndex].songs;
    songs.forEach((song, songIndex) => {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        titleCell.textContent = song.name.replace(/\.[^/.]+$/, "");
        titleCell.style.cursor = "pointer";
        titleCell.onclick = () => {
            const globalIndex = playlist.findIndex(m => m.name === song.name);
            if (globalIndex !== -1) {
                isPlaylistMode = true;
                currentPlaylistSongs = allPlaylists[playlistIndex].songs
                    .map(s => playlist.findIndex(m => m.name === s.name))
                    .filter(i => i !== -1);
                playMusic(globalIndex);
                homeView.style.display = "block";
                playListView.style.display = "none";
                fileView.style.display = "none";
                playlistDetailView.style.display = "none";
                sidebar.classList.remove("active");
            }
        };

        const actionCell = document.createElement("td");
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Retirer";
        removeBtn.classList.add("action-btn", "delete-btn");
        removeBtn.style.width = "auto";
        removeBtn.onclick = () => {
            allPlaylists[playlistIndex].songs.splice(songIndex, 1);
            savePlaylistsToLocal();
            renderPlaylistSongs(playlistIndex);
        };

        actionCell.appendChild(removeBtn);
        row.appendChild(titleCell);
        row.appendChild(actionCell);
        playlistSongBody.appendChild(row);
    });
}

btnBackToPlaylists.onclick = () => {
    playlistDetailView.style.display = "none";
    playListView.style.display = "block";
};

async function addMusicToPlayList(music) {
    if (allPlaylists.length === 0) {
        await showInfo("Crée d'abord une playlist dans l'onglet Playlist !", "Attention");
        return;
    }
    modalMusicName.textContent = "Music : " + music.name.replace(/\.[^/.]+$/, "");
    modalSelect.innerHTML = "";
    allPlaylists.forEach((pl, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = pl.title;
        modalSelect.appendChild(option);
    });
    modalOverlay.style.display = "flex";
    modalConfirm.onclick = async () => {
        const indexChoisi = parseInt(modalSelect.value);
        allPlaylists[indexChoisi].songs.push({ name: music.name, path: music.path || "" });
        savePlaylistsToLocal();
        modalOverlay.style.display = "none";
        await showInfo(`Ajouté dans "${allPlaylists[indexChoisi].title}" !`, "Ajouté");
    };
    modalCancel.onclick = () => { modalOverlay.style.display = "none"; };
}

// =============================================
// PLAYLIST ACTIVE (brillance)
// =============================================
function updateActivePlaylistSquare() {
    if (playlist.length === 0 || currentIndex === -1) return;
    
    const currentMusicName = playlist[currentIndex].name.trim();
    
    // On prévient OBS que la musique a changé
    if(!isWeb) notifyOBS();

    const squares = document.querySelectorAll(".playlist-item");
    allPlaylists.forEach((pl, index) => {
        const isMusicInThisPlaylist = pl.songs.some(s => s.name.trim() === currentMusicName);
        if (squares[index]) {
            isMusicInThisPlaylist && !audio.paused
                ? squares[index].classList.add("playing")
                : squares[index].classList.remove("playing");
        }
    });
}

audio.addEventListener("play", updateActivePlaylistSquare);
audio.addEventListener("pause", updateActivePlaylistSquare);
audio.addEventListener("ended", updateActivePlaylistSquare);

if (!isWeb) {
    ipcRenderer.on('media-play-pause', () => { btn.click(); });
    ipcRenderer.on('media-next', () => { nextBtn.click(); });
    ipcRenderer.on('media-prev', () => { prevBtn.click(); });
}

// =============================================
// SYNCHRONISATION EN TEMPS RÉEL DU DOSSIER
// =============================================
const chooseMusicFolderBtn = document.getElementById('chooseMusicFolderBtn');
if (chooseMusicFolderBtn && !isWeb) {
    chooseMusicFolderBtn.addEventListener('click', async () => {
        const folderPath = await ipcRenderer.invoke('choose-music-folder');
        if (folderPath) {
            await ipcRenderer.invoke('save-watched-folder', folderPath);
            document.getElementById('watchedFolderPath').textContent = folderPath;
            await startWatchingFolder(folderPath);
            showInfo("Dossier synchronisé avec succès !", "Succès");
        }
    });
}

if (!isWeb) {
    ipcRenderer.on('new-music-detected', async (event, file) => {
        if (!playlist.find(m => m.name === file.name)) {
            const url = `file:///${file.path.replace(/\\/g, '/')}`;
            playlist.push({ name: file.name, url: url, path: file.path });
            playlist.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
            await saveMusicList();
            displayStoredFiles(); 
        }
    });

    ipcRenderer.on('music-removed', async (event, file) => {
        const index = playlist.findIndex(m => m.name === file.name);
        if (index !== -1) {
            playlist.splice(index, 1);
            await saveMusicList();
            displayStoredFiles(); 
        }
    });
}

// =============================================
// FONCTION D'ENVOI DES DONNÉES VERS OBS
// =============================================
function notifyOBS() {
    if (isWeb || playlist.length === 0 || currentIndex === -1) return;

    const rawName = playlist[currentIndex].name.trim();
    const cleanName = rawName.replace(/\.[^/.]+$/, "");

    const coverImg = document.getElementById("cover");
    let coverData = "";
    
    if (coverImg.src && coverImg.src.startsWith("data:image")) {
        coverData = coverImg.src;
    }

    ipcRenderer.send('update-current-track', { 
        name: cleanName, 
        cover: coverData 
    });
}

// =============================================
// GESTION DES OPTIONS OBS (BOUTON ET COPIE)
// =============================================
const toggleObsBtn = document.getElementById('toggleObsBtn');
const obsOptions = document.getElementById('obsOptions');

if (toggleObsBtn && obsOptions && !isWeb) {
    toggleObsBtn.addEventListener('click', () => {
        if (obsOptions.style.display === 'none') {
            obsOptions.style.display = 'block';
            toggleObsBtn.innerText = 'Cacher les options OBS';
        } else {
            obsOptions.style.display = 'none';
            toggleObsBtn.innerText = 'Afficher les options OBS';
        }
    });
}

const copyObsBtn = document.getElementById('copyObsBtn');
const obsLink = document.getElementById('obsLink');
const copyBtnText = document.getElementById('copyBtnText');

if (copyObsBtn && obsLink && !isWeb) {
    copyObsBtn.addEventListener('click', () => {
        const textToCopy = obsLink.innerText.trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyObsBtn.classList.add('copied');
            copyBtnText.textContent = '✅ Copié !';
            setTimeout(() => {
                copyObsBtn.classList.remove('copied');
                copyBtnText.textContent = '📋 Copier';
            }, 2500);
        }).catch(err => {
            console.error('Erreur copie :', err);
        });
    });
}
