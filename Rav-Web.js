const audio = new Audio();

// =============================================
// ÉLÉMENTS HTML
// =============================================
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
const parametreView = document.getElementById("parametreView");

const addPlayListBtn = document.getElementById("addPlayListBtn");
const playlistListElement = document.getElementById("playlistList");
const playlistDetailView = document.getElementById("playlistDetailView");
const playlistSongBody = document.getElementById("playlistSongBody");
const currentPlaylistTitle = document.getElementById("currentPlaylistTitle");
const btnBackToPlaylists = document.getElementById("btnBackToPlaylists");

const modalOverlay = document.getElementById("modalOverlay");
const modalMusicName = document.getElementById("modalMusicName");
const modalSelect = document.getElementById("modalSelect");
const modalCancel = document.getElementById("modalCancel");
const modalCreatePlaylist = document.getElementById("modalCreatePlaylist");
const newPlayListNameInput = document.getElementById("newPlayListName");

const btnLoadWebMusic = document.getElementById("btnLoadWebMusic");
const webMusicInput = document.getElementById("webMusicInput");

// Variables globales
let playlist = []; // Musiques chargées en mémoire RAM (temporaire)
let allPlaylists = []; // Playlists (sauvegardées dans le navigateur)
let currentIndex = 0;

// =============================================
// SAUVEGARDE WEB (LOCALSTORAGE)
// =============================================
function savePlaylistsToWeb() {
    localStorage.setItem('ravenPlaylists', JSON.stringify(allPlaylists));
}

function loadPlaylistsFromWeb() {
    const saved = localStorage.getItem('ravenPlaylists');
    if (saved) {
        allPlaylists = JSON.parse(saved);
        displayPlaylist();
    }
}
loadPlaylistsFromWeb(); // Chargement au lancement

// =============================================
// FONCTIONS MODALES PERSONNALISÉES
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
    });
}

// =============================================
// NAVIGATION SIDEBAR
// =============================================
menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
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
// CHARGEMENT DES MUSIQUES WEB
// =============================================
btnLoadWebMusic.addEventListener("click", () => {
    webMusicInput.click();
});

webMusicInput.addEventListener("change", (event) => {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const objectUrl = URL.createObjectURL(file); 
        
        if (!playlist.find(m => m.name === file.name)) {
            playlist.push({
                name: file.name,
                url: objectUrl,
                fileObj: file 
            });
        }
    }
    playlist.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    displayStoredFiles();
});

function displayStoredFiles() {
    playlistElement.innerHTML = "";

    playlist.forEach((music, i) => {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        titleCell.textContent = music.name.replace(/\.[^/.]+$/, "");
        titleCell.style.cursor = "pointer";
        titleCell.onclick = () => playMusic(i);

        const durationCell = document.createElement("td");
        durationCell.textContent = "--:--";

        const actionCell = document.createElement("td");
        
        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.classList.add("action-btn", "add-btn");
        addBtn.onclick = () => addMusicToPlayList(music);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "X";
        deleteBtn.classList.add("action-btn", "delete-btn");
        deleteBtn.onclick = async () => {
            const ok = await showConfirm("Retirer cette musique de la session web ?", "Supprimer");
            if (!ok) return;
            playlist.splice(i, 1);
            displayStoredFiles();
        };

        actionCell.appendChild(addBtn);
        actionCell.appendChild(deleteBtn);
        row.appendChild(titleCell);
        row.appendChild(durationCell);
        row.appendChild(actionCell);
        playlistElement.appendChild(row);
    });
}

// =============================================
// GESTION DES PLAYLISTS
// =============================================
addPlayListBtn.addEventListener("click", () => { modalCreatePlaylist.style.display = "flex"; });

document.getElementById("modalCreateConfirm").addEventListener("click", () => {
    const name = newPlayListNameInput.value.trim();
    if (name === "") { showInfo("Donne un nom à ta playlist !", "Attention"); return; }
    allPlaylists.push({ title: name, songs: [] });
    newPlayListNameInput.value = "";
    modalCreatePlaylist.style.display = "none";
    savePlaylistsToWeb(); 
    displayPlaylist();
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
}

function openPlaylist(index) {
    currentPlaylistTitle.textContent = allPlaylists[index].title;
    playListView.style.display = "none";
    playlistDetailView.style.display = "block";

    const menuBtn = document.getElementById("playlistOptionsBtn");
    menuBtn.onclick = (e) => { openPlaylistMenu(e, index); };
    
    renderPlaylistSongs(index);
}

let activeMenu = null;
function openPlaylistMenu(e, index) {
    if (activeMenu) { activeMenu.remove(); activeMenu = null; return; }

    const menu = document.createElement("div");
    menu.classList.add("playlist-context-menu");

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "Renommer";
    renameBtn.onclick = () => { menu.remove(); activeMenu = null; renamePlaylist(index); };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Supprimer";
    deleteBtn.onclick = () => { menu.remove(); activeMenu = null; deletePlaylist(index); };

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
    const newName = await showPrompt("Nouveau nom de la playlist :", allPlaylists[index].title, "Renommer");
    if (!newName) return;
    allPlaylists[index].title = newName;
    savePlaylistsToWeb(); 
    displayPlaylist();
    currentPlaylistTitle.textContent = newName;
}

async function deletePlaylist(index) {
    const ok = await showConfirm("Supprimer cette Playlist ?", "Supprimer");
    if (!ok) return;
    allPlaylists.splice(index, 1);
    savePlaylistsToWeb(); 
    displayPlaylist();
    playlistDetailView.style.display = "none";
    playListView.style.display = "block";
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
                playMusic(globalIndex);
            } else {
                showInfo("Veuillez d'abord charger cette musique dans la Bibliothèque Web !", "Musique non chargée");
            }
        };

        const actionCell = document.createElement("td");
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Retirer";
        removeBtn.classList.add("action-btn", "delete-btn");
        removeBtn.onclick = () => {
            allPlaylists[playlistIndex].songs.splice(songIndex, 1);
            savePlaylistsToWeb(); 
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
    
    document.getElementById("modalConfirm").onclick = async () => {
        const indexChoisi = parseInt(modalSelect.value);
        allPlaylists[indexChoisi].songs.push({ name: music.name });
        savePlaylistsToWeb(); 
        modalOverlay.style.display = "none";
        await showInfo(`Ajouté dans "${allPlaylists[indexChoisi].title}" !`, "Ajouté");
    };
    
    modalCancel.onclick = () => { modalOverlay.style.display = "none"; };
}

// =============================================
// LECTURE & CONTRÔLES AUDIO
// =============================================
function playMusic(index) {
    currentIndex = index;
    const music = playlist[index];
    audio.src = music.url;
    audio.play();
    icon.src = "Icons/Pause - Yellow.svg";
    document.getElementById("musicTitle").textContent = music.name.replace(/\.[^/.]+$/, "");
    if(music.fileObj) loadCoverFromWebFile(music.fileObj);
}

function loadCoverFromWebFile(file) {
    if (typeof jsmediatags !== "undefined") {
        jsmediatags.read(file, {
            onSuccess: function(tag) {
                const picture = tag.tags.picture;
                if (picture) {
                    let base64 = "";
                    for (let i = 0; i < picture.data.length; i++) {
                        base64 += String.fromCharCode(picture.data[i]);
                    }
                    cover.src = `data:${picture.format};base64,${btoa(base64)}`;
                    cover.style.opacity = 1;
                } else { cover.src = ""; cover.style.opacity = 0; }
            },
            onError: function() { cover.src = ""; cover.style.opacity = 0; }
        });
    }
}

// L'événement qui te renvoie à l'accueil automatiquement !
audio.addEventListener("play", () => {
    homeView.style.display = "block";
    fileView.style.display = "none";
    playListView.style.display = "none";
    playlistDetailView.style.display = "none";
    parametreView.style.display = "none";
    sidebar.classList.remove("active");
});

btn.onclick = () => {
    if (audio.src) {
        if (audio.paused) { audio.play(); icon.src = "Icons/Pause - Yellow.svg"; } 
        else { audio.pause(); icon.src = "Icons/Play - Yellow.svg"; }
    }
};

nextBtn.onclick = () => {
    if (playlist.length > 0) {
        currentIndex = (currentIndex + 1) % playlist.length;
        playMusic(currentIndex);
    }
};

prevBtn.onclick = () => {
    if (playlist.length > 0) {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playMusic(currentIndex);
    }
};

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

volumeControl.addEventListener("input", () => { audio.volume = parseFloat(volumeControl.value); });