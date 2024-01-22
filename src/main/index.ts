import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import Configs from './utils/Configs'
import WhatsAppClient from './WhatsAppClient'

const isSingleInstance = app.requestSingleInstanceLock()

app.on('second-instance', (_, argv) => {
  const window = WhatsAppClient.getInstance().getWindow()

  if (window) {
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
  }

  let groupLinkOpenRequested = null
  if (argv.length > 1) {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].indexOf('https://chat.whatsapp.com') >= 0) {
        groupLinkOpenRequested = argv[i]
        console.info('Opening a group link: ' + groupLinkOpenRequested)
        break
      }
    }
  }
  if (groupLinkOpenRequested != null) {
    window.webContents.executeJavaScript(
      "var el = document.createElement('a');\
      el.href = \"" +
        groupLinkOpenRequested +
        "\"; \
  el.style.display = \"none\"; \
  el.rel = 'noopener noreferrer'; \
  el.id = 'newlink'; \
  document.body.appendChild(el); \
  setTimeout(function() { var el = document.getElementById('newlink'); el.click(); document.body.removeChild(el); }, 500); \
  "
    )
  }
})

if (!isSingleInstance) {
  app.quit()
}

app.userAgentFallback = Configs.getInstance().getString('userAgent')

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  WhatsAppClient.getInstance().init()

  if (Configs.getInstance().getBoolean('globalShortcut')) {
    const window = WhatsAppClient.getInstance().getWindow()
    Electron.globalShortcut.register('CmdOrCtrl + Alt + W', function () {
      if (window.isFocused()) window.hide()
      else window.show()
    })
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// unregistering the globalShorcut on quit of application
app.on('will-quit', function () {
  if (Configs.getInstance().getBoolean('globalShortcut')) {
    Electron.globalShortcut.unregisterAll()
  }
})
