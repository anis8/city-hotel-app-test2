const {app, nativeImage, BrowserWindow, ipcMain} = require('electron');
try {
    const {autoUpdater} = require("electron-updater");

    const path = require('path');
    const url = require('url');

    let pluginName;
    let mainWindow;

    switch (process.platform) {
        case 'win32':
            if (process.arch === "x32" || process.arch === "ia32") {
                pluginName = 'win/pepflashplayer-32.dll';
            } else {
                pluginName = 'win/pepflashplayer.dll';
            }
            break;
        case 'darwin':
            pluginName = 'mac/PepperFlashPlayer.plugin';
            break;
        case "linux":
            if (process.arch === "arm") {
                pluginName = 'lin/libpepflashplayer_arm.so';
            } else {
                pluginName = 'lin/libpepflashplayer_amd.so';
            }
            break;
        case "freebsd":
        case "netbsd":
        case "openbsd":
            pluginName = 'libpepflashplayer.so';
            break;
    }
    //app.commandLine.appendSwitch("disable-renderer-backgrounding");
    if (process.platform !== "darwin") {
        app.commandLine.appendSwitch('high-dpi-support', "1");
        app.commandLine.appendSwitch('force-device-scale-factor', "1");
    }
    app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname.includes(".asar") ? process.resourcesPath : __dirname, "flash/" + pluginName));
    //app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-site-isolation-trials');
    //app.commandLine.appendSwitch('no-sandbox');


    let sendWindow = (identifier, message) => {
        mainWindow.send(identifier, message);
    };
    let createWindow = async () => {

        mainWindow = new BrowserWindow({
            title: "HabboCity",
            icon: path.join(__dirname, '/icon.png'),
            webPreferences: {
                plugins: true,
                nodeIntegration: false,
                contextIsolation: false,
                webSecurity: false,
                preload: path.join(__dirname, './preload.js')
            },
            show: false,
            frame: true,
            backgroundColor: "#000",
        });

        mainWindow.maximize();
        mainWindow.show();
        mainWindow.setMenu(null);
        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        //mainWindow.webContents.openDevTools();

        await mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, `app.html`),
            protocol: 'file:',
            slashes: true
        }));

        sendWindow("version", app.getVersion());
        ipcMain.on('clearcache', async () => {
            let session = mainWindow.webContents.session;
            await session.clearCache();
            app.relaunch();
            app.exit();
        });
        ipcMain.on('fullscreen', () => {
            if (mainWindow.isFullScreen())
                mainWindow.setFullScreen(false);
            else
                mainWindow.setFullScreen(true);

        });
        ipcMain.on('zoomOut', () => {
            let factor = mainWindow.webContents.getZoomFactor();
            if (factor > 0.3) {
                mainWindow.webContents.setZoomFactor(factor - 0.01);
            }
        });
        ipcMain.on('zoomIn', () => {
            let factor = mainWindow.webContents.getZoomFactor();
            if (factor < 3) {
                mainWindow.webContents.setZoomFactor(factor + 0.01);
            }
        });

        if (process.platform === "darwin") {
            app.dock.setIcon(nativeImage.createFromPath(
                path.join(__dirname, '/icon.png')
            ));
        }

        mainWindow.webContents.on('new-window', (e, url) => {
            const splitUrl = url.replace('https://', '').split('.');
            let checkUrl = splitUrl[0];
            if (url.replace('https://', '').startsWith('www.') || url.replace('https://', '').startsWith('swf.')) checkUrl = splitUrl[1];

            if (checkUrl !== 'habbocity') {
                e.preventDefault();
                require('electron').shell.openExternal(url);
            }
        });
    };

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            ipcMain.removeAllListeners();
            app.exit(0);
            app.quit();
        }
    });
    app.on('before-quit', () => {
        mainWindow.removeAllListeners('close');
        mainWindow.close();
    });

    app.on('ready', async () => {
        await createWindow();
        await autoUpdater.checkForUpdatesAndNotify();
    });
    app.on('activate', async () => {
        if (mainWindow === null) {
            await createWindow();
        }
    });

    autoUpdater.on('checking-for-update', () => {
        sendWindow('checking-for-update', '');
    });
    autoUpdater.on('update-available', () => {
        sendWindow('update-available', '');
    });
    autoUpdater.on('update-not-available', () => {
        sendWindow('update-not-available', '');
    });
    autoUpdater.on('error', (err) => {
        sendWindow('error', 'Error: ' + err);
    });
    autoUpdater.on('download-progress', (d) => {
        sendWindow('download-progress', {
            speed: d.bytesPerSecond,
            percent: d.percent,
            transferred: d.transferred,
            total: d.total
        });
    });
    autoUpdater.on('update-downloaded', () => {
        sendWindow('update-downloaded', 'Update downloaded');
        autoUpdater.quitAndInstall();
    });


} catch (e) {
    app.exit(0);
    app.quit();
}
