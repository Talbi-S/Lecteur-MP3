const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let playlistFile;
let musicListFile;

// =============================================
// CRÉATION FENÊTRE
// =============================================
function createWindow() {
    playlistFile = path.join(app.getPath('userData'), 'playlists.json');
    musicListFile = path.join(app.getPath('userData'), 'musiclist.json');

    win = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 400,
        minHeight: 500,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

// =============================================
// BOUTONS FENÊTRE
// =============================================
ipcMain.on('minimize-window', () => win.minimize());
ipcMain.on('maximize-window', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});
ipcMain.on('close-window', () => win.close());

ipcMain.on('expand-window', () => {
    win.setSize(1000, 700);
    win.center();
});

ipcMain.handle('get-window-size', () => {
    return win.getSize()[0];
});

// =============================================
// DOSSIER MUSIQUE — dialogue natif
// =============================================
ipcMain.handle('open-files-dialog', async () => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'] }]
    });
    if (result.canceled) return [];
    return result.filePaths.map(p => ({
        name: path.basename(p),
        path: p
    }));
});

// =============================================
// LISTE MUSIQUES
// =============================================
ipcMain.handle('save-music-list', async (event, musicList) => {
    fs.writeFileSync(musicListFile, JSON.stringify(musicList));
});

ipcMain.handle('get-music-list', async () => {
    if (!fs.existsSync(musicListFile)) return [];
    return JSON.parse(fs.readFileSync(musicListFile, 'utf8'));
});

// =============================================
// PLAYLISTS
// =============================================
ipcMain.handle('save-playlists', async (event, data) => {
    fs.writeFileSync(playlistFile, JSON.stringify(data));
});

ipcMain.handle('load-playlists', async () => {
    if (!fs.existsSync(playlistFile)) return [];
    return JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
});

// =============================================
// DOSSIER SURVEILLÉ
// =============================================
const AUDIO_REGEX = /\.(mp3|flac|wav|ogg|m4a|aac)$/i;

// Sauvegarder le dossier choisi
ipcMain.handle('save-watched-folder', async (event, folderPath) => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    const settings = fs.existsSync(settingsFile)
        ? JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
        : {};
    settings.watchedFolder = folderPath;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
});

// Supprimer le dossier surveillé
ipcMain.handle('remove-watched-folder', async () => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    if (!fs.existsSync(settingsFile)) return;
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    delete settings.watchedFolder;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
    stopFolderScan();
});

// Charger le dossier sauvegardé
ipcMain.handle('get-watched-folder', async () => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    if (!fs.existsSync(settingsFile)) return null;
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    return settings.watchedFolder || null;
});

// Ouvrir le dialogue pour choisir le dossier
ipcMain.handle('choose-music-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

// =============================================
// SCAN PÉRIODIQUE — remplace fs.watch
// Toutes les 10 secondes on compare le dossier
// avec la liste connue et on envoie les différences
// =============================================
let scanInterval = null;
let knownFiles = new Set(); // noms des fichiers connus

function stopFolderScan() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    knownFiles.clear();
}

function startFolderScan(folderPath) {
    stopFolderScan();

    // Lire l'état initial du dossier
    const initial = fs.readdirSync(folderPath).filter(f => AUDIO_REGEX.test(f));
    knownFiles = new Set(initial);

    // Scanner toutes les 10 secondes
    scanInterval = setInterval(() => {
        if (!fs.existsSync(folderPath)) return;

        const current = new Set(
            fs.readdirSync(folderPath).filter(f => AUDIO_REGEX.test(f))
        );

        // Fichiers ajoutés
        for (let name of current) {
            if (!knownFiles.has(name)) {
                win.webContents.send('new-music-detected', {
                    name: name,
                    path: path.join(folderPath, name)
                });
            }
        }

        // Fichiers supprimés ou renommés
        for (let name of knownFiles) {
            if (!current.has(name)) {
                win.webContents.send('music-removed', { name: name });
            }
        }

        knownFiles = current;
    }, 10000); // toutes les 10 secondes
}

// Démarrer la surveillance — retourne les fichiers existants
ipcMain.handle('watch-folder', async (event, folderPath) => {
    const existing = fs.readdirSync(folderPath)
        .filter(f => AUDIO_REGEX.test(f))
        .map(f => ({ name: f, path: path.join(folderPath, f) }));

    startFolderScan(folderPath);

    return existing;
});

// Arrêter la surveillance
ipcMain.handle('stop-watching', async () => {
    stopFolderScan();
});

// =============================================
// LANCEMENT
// =============================================
app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('MediaPlayPause', () => {
        win.webContents.send('media-play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
        win.webContents.send('media-next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
        win.webContents.send('media-prev');
    });
});
