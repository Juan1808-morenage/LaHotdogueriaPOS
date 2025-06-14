// main.js - VERSIÓN FINAL Y ORDENADA

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- Declaración de la variable mainWindow ---
let mainWindow; 

// --- Configuración de Logging ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// --- Definición del Menú (Esto está bien como está) ---
const menuTemplate = [
    {
        label: 'Archivo',
        submenu: [{ role: 'quit', label: 'Salir' }]
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
            { role: 'toggleDevTools' }
        ]
    }
];
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

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
        icon: path.join(__dirname, 'resources', 'logo.ico'),
    });

    mainWindow.loadFile('index.html');
    
    // --- Lógica de Cierre ---
    // El listener del evento 'close' se queda aquí, dentro de la función createWindow.
    mainWindow.on('close', (e) => {
        // Prevenir el cierre y enviar la señal es la única responsabilidad aquí.
        e.preventDefault();
        mainWindow.webContents.send('log-out-before-quit');
    });
}

// =========================================================================
// ====== INICIO DE LA CORRECCIÓN CLAVE ======
// =========================================================================
// ---> Mueve el listener de IPC aquí, para que se registre una sola vez <--
// Este es el lugar correcto, fuera de createWindow y antes de app.whenReady
ipcMain.on('logout-complete', () => {
    // Si la ventana principal todavía existe, destrúyela para forzar el cierre.
    if (mainWindow) {
        mainWindow.destroy();
    }
    // Finalmente, sal de la aplicación.
    app.quit();
});
// =========================================================================
// ====== FIN DE LA CORRECCIÓN CLAVE ======
// =========================================================================


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
// (Esta parte se queda igual)
autoUpdater.on('update-available', (info) => { log.info('Actualización disponible.', info); });
autoUpdater.on('update-downloaded', (info) => { 
    // ... tu código para el diálogo de actualización ...
});
autoUpdater.on('error', (err) => { log.error('Error en autoUpdater:', err); });