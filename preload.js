// preload.js - VERSIÓN FINAL Y CORRECTA

const { contextBridge, ipcRenderer } = require('electron');

// Expone un objeto llamado "electronAPI" en la ventana global (window)
contextBridge.exposeInMainWorld('electronAPI', {
  // Función para que app.js envíe mensajes a main.js
  send: (channel, data) => {
    const validChannels = ['logout-complete'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Función para que app.js reciba mensajes de main.js
  on: (channel, func) => {
    const validChannels = ['log-out-before-quit', 'show-user-guide'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});