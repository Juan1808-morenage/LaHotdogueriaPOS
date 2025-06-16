// main.js - VERSIÓN FINAL Y COMPLETA

// Módulos de Electron y Node.js
const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('node:fs'); // Importante para la captura de pantalla
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- Declaración de la variable mainWindow ---
let mainWindow; 

// --- Configuración de Logging para auto-updater ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// =========================================================================
// ====== INICIO DE LA MODIFICACIÓN: MENÚ DE VENTANA COMPLETO ======
// =========================================================================

// --- Definición de la Plantilla del Menú ---
const menuTemplate = [
    {
        label: 'Archivo',
        submenu: [
            {
                label: 'Captura de pantalla',
                accelerator: 'F2',
                click: () => {
                    if (mainWindow) {
                        mainWindow.webContents.capturePage().then(image => {
                            const desktopPath = app.getPath('desktop');
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            const filePath = path.join(desktopPath, `captura-hotdogueria-${timestamp}.png`);
                            
                            fs.writeFile(filePath, image.toPNG(), (err) => {
                                if (err) {
                                    dialog.showErrorBox('Error al guardar', `No se pudo guardar la captura de pantalla: ${err.message}`);
                                } else {
                                    dialog.showMessageBox(mainWindow, {
                                        type: 'info',
                                        title: 'Captura Guardada',
                                        message: 'La captura de pantalla se ha guardado en tu escritorio.',
                                        detail: `Ruta del archivo: ${filePath}`
                                    });
                                }
                            });
                        });
                    }
                }
            },
            { type: 'separator' },
            { label: 'Alejar', accelerator: 'F3', role: 'zoomOut' },
            { label: 'Acercar', accelerator: 'F4', role: 'zoomIn' },
            { label: 'Refrescar', accelerator: 'F5', role: 'reload' },
            { type: 'separator' },
            { role: 'quit', label: 'Salir' }
        ]
    },
    {
        label: 'Ayuda',
        submenu: [
            {
                label: 'Ver Guía de Usuario',
                accelerator: 'F1',
                click: () => {
                    if (mainWindow) {
                        mainWindow.webContents.send('show-user-guide');
                    }
                }
            },
            { type: 'separator' },
            { role: 'toggleDevTools', label: 'Herramientas de Desarrollador' }
        ]
    }
];

// --- Construcción y Aplicación del Menú ---
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

// =========================================================================
// ====== FIN DE LA MODIFICACIÓN: MENÚ DE VENTANA COMPLETO ======
// =========================================================================

// --- Función para Crear la Ventana Principal ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), 
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'resources', 'logo.ico'), // Asegúrate que esta ruta es correcta
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize(); // Maximiza la ventana al iniciar
    
    // --- Lógica de Cierre ---
    mainWindow.on('close', (e) => {
        e.preventDefault();
        mainWindow.webContents.send('log-out-before-quit');
    });
}

// --- Listener de Comunicación para el Cierre Correcto ---
ipcMain.on('logout-complete', () => {
    if (mainWindow) {
        mainWindow.destroy();
    }
    app.quit();
});

// --- Ciclo de Vida de la Aplicación ---
app.whenReady().then(() => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- Lógica de Actualizaciones Automáticas ---
autoUpdater.on('update-available', (info) => { log.info('Actualización disponible.', info); });
autoUpdater.on('update-downloaded', (info) => { 
    dialog.showMessageBox({
        type: 'info',
        title: 'Actualización Lista',
        message: 'Una nueva versión ha sido descargada. Reinicia la aplicación para aplicar los cambios.',
        buttons: ['Reiniciar ahora', 'Más tarde']
    }).then(result => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});
autoUpdater.on('error', (err) => { log.error('Error en autoUpdater:', err); });