"use strict"
// Pre-bootstrap: Clear the electron cache before it gets contaminated
// and redirect electron require to return the built-in
// This file IS the main entry point

const Module = require('module')
const path = require('path')

// Find the node_modules/electron path  
const electronNmPath = path.resolve(__dirname, 'node_modules', 'electron', 'index.js')

// Pre-cache: make require('electron') return a promise of the real thing
// The trick: in Electron, when browser_init runs, it ADDS electron to the cache
// We need to ensure our code runs AFTER browser_init has added electron

// Method: monkey-patch Module._load to intercept 'electron' requests
// and return a proper module by calling native binding
const origLoad = Module._load.bind(Module)

// First call: cache-bust the npm electron package
if (Module._cache[electronNmPath]) {
  delete Module._cache[electronNmPath]
}

// Override: when 'electron' is requested, bypass node_modules
Module._load = function(request, parent, isMain) {
  if (request === 'electron') {
    // Check if electron has been set up as a proper module yet
    // In Electron's browser process, this path becomes available
    const cached = Module._cache['electron']
    if (cached && cached.exports && cached.exports.app) {
      return cached.exports
    }
    
    // Try to load without going through node_modules resolution
    // by looking at what builtins Electron has set up
    const browserInit = 'electron/js2c/browser_init'
    const browserCached = Module._cache[browserInit]
    if (browserCached) {
      const browserExports = browserCached.exports
      if (browserExports && browserExports.app) return browserExports
    }
    
    // If we're here, Electron's browser process hasn't initialized the module yet
    // We need to wait... but since this is sync, let's return a proxy
    // Actually: remove the bad cached version and try original
    delete Module._cache[electronNmPath]
    
    // Call the original (Electron's c._load) without the npm cache
    return origLoad(request, parent, isMain)
  }
  return origLoad(request, parent, isMain)
}

// Now load the main application
require('./dist/main/main.js')
