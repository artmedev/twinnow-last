const { contextBridge, ipcRenderer } = require('electron');
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  pickDir: call('pickDir'), scan: call('scan'), groups: call('groups'), groupsQuick: call('groupsQuick'), thumb: call('thumb'),
  getState: call('getState'), setUi: call('setUi'), setSettings: call('setSettings'), setFav: call('setFav'), copyFavs: call('copyFavs'),
  setRunning: call('setRunning'), doneDirs: call('doneDirs'),
  onProgress: cb => ipcRenderer.on('progress', (e, p) => cb(p)), onDirDone: cb => ipcRenderer.on('dirDone', (e, d) => cb(d)),
  onDirProgress: cb => ipcRenderer.on('dirProgress', (e, p) => cb(p)),
  onScan: cb => ipcRenderer.on('scanProgress', (e, n) => cb(n)),
});
