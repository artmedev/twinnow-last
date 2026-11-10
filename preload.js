const { contextBridge, ipcRenderer } = require('electron');
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', {
  pickDir: call('pickDir'), scan: call('scan'), groups: call('groups'), thumb: call('thumb'),
  getFavs: call('getFavs'), setFav: call('setFav'),
  onScan: cb => ipcRenderer.on('scanProgress', (e, n) => cb(n)),
});
