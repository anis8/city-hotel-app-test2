const {ipcRenderer} = require('electron');
const {machineIdSync} = require('node-machine-id');

process.once('loaded', () => {
    window.ipcRenderer = ipcRenderer;
    window.uniqueId = machineIdSync();
});