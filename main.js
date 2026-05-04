const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let win;
let playlistFile;
let musicListFile;

// INITIALISATION VIDE POUR ÉVITER LES FANTÔMES
let currentTrackInfo = { name: "", cover: "" };

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

ipcMain.on('minimize-window', () => win.minimize());
ipcMain.on('maximize-window', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});
ipcMain.on('close-window', () => win.close());
ipcMain.on('expand-window', () => { win.setSize(1000, 700); win.center(); });
ipcMain.handle('get-window-size', () => win.getSize()[0]);

ipcMain.handle('open-files-dialog', async () => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'] }]
    });
    if (result.canceled) return [];
    return result.filePaths.map(p => ({ name: path.basename(p), path: p }));
});

ipcMain.handle('save-music-list', async (event, musicList) => { fs.writeFileSync(musicListFile, JSON.stringify(musicList)); });
ipcMain.handle('get-music-list', async () => {
    if (!fs.existsSync(musicListFile)) return [];
    return JSON.parse(fs.readFileSync(musicListFile, 'utf8'));
});

ipcMain.handle('save-playlists', async (event, data) => { fs.writeFileSync(playlistFile, JSON.stringify(data)); });
ipcMain.handle('load-playlists', async () => {
    if (!fs.existsSync(playlistFile)) return [];
    return JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
});

// SURVEILLANCE DOSSIER
const AUDIO_REGEX = /\.(mp3|flac|wav|ogg|m4a|aac)$/i;
ipcMain.handle('save-watched-folder', async (event, folderPath) => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};
    settings.watchedFolder = folderPath;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
});
ipcMain.handle('remove-watched-folder', async () => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    if (!fs.existsSync(settingsFile)) return;
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    delete settings.watchedFolder;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
    stopFolderScan();
});
ipcMain.handle('get-watched-folder', async () => {
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    if (!fs.existsSync(settingsFile)) return null;
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    return settings.watchedFolder || null;
});
ipcMain.handle('choose-music-folder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
});

let scanInterval = null;
let knownFiles = new Set();
function stopFolderScan() { if (scanInterval) { clearInterval(scanInterval); scanInterval = null; } knownFiles.clear(); }

function startFolderScan(folderPath) {
    stopFolderScan();
    const initial = fs.readdirSync(folderPath).filter(f => AUDIO_REGEX.test(f));
    knownFiles = new Set(initial);
    scanInterval = setInterval(() => {
        if (!fs.existsSync(folderPath)) return;
        const current = new Set(fs.readdirSync(folderPath).filter(f => AUDIO_REGEX.test(f)));
        for (let name of current) {
            if (!knownFiles.has(name)) win.webContents.send('new-music-detected', { name: name, path: path.join(folderPath, name) });
        }
        for (let name of knownFiles) {
            if (!current.has(name)) win.webContents.send('music-removed', { name: name });
        }
        knownFiles = current;
    }, 10000);
}

ipcMain.handle('watch-folder', async (event, folderPath) => {
    const existing = fs.readdirSync(folderPath).filter(f => AUDIO_REGEX.test(f)).map(f => ({ name: f, path: path.join(folderPath, f) }));
    startFolderScan(folderPath);
    return existing;
});
ipcMain.handle('stop-watching', async () => { stopFolderScan(); });

app.whenReady().then(() => {
    createWindow();
    globalShortcut.register('MediaPlayPause', () => { win.webContents.send('media-play-pause'); });
    globalShortcut.register('MediaNextTrack', () => { win.webContents.send('media-next'); });
    globalShortcut.register('MediaPreviousTrack', () => { win.webContents.send('media-prev'); });
});

// =============================================
// MINI-SERVEUR POUR OBS
// =============================================
try {
    const obsServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.url === '/obs') {
            const obsHtmlPath = path.join(__dirname, 'obs.html');
            fs.readFile(obsHtmlPath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end("Fichier obs.html introuvable.");
                    return;
                }
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(data);
            });
        } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(currentTrackInfo));
        }
    });

    obsServer.listen(9876, '127.0.0.1', () => {
        console.log("🌐 Serveur OBS démarré sur http://127.0.0.1:9876/obs");
    });

    ipcMain.on('update-current-track', (event, trackData) => {
        currentTrackInfo = trackData;
    });
} catch (error) {
    console.error("Erreur serveur OBS:", error);
}
