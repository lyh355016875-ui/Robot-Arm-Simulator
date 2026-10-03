const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('robotArmDesktop', Object.freeze({
  threeBase: './node_modules/three',
}));
