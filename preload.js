const { contextBridge, ipcRenderer } = require('electron');
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  pickDir: call('pickDir'), scan: call('scan'), groups: call('groups'), thumb: call('thumb'),
  getState: call('getState'), setUi: call('setUi'), setFav: call('setFav'), copyFavs: call('copyFavs'),
  onScan: cb => ipcRenderer.on('scanProgress', (e, n) => cb(n)),
});
