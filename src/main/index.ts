import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import Settings from './utils/Settings'
import WhatsAppClient from './WhatsAppClient'

const isSingleInstance = app.requestSingleInstanceLock()

app.setName('Whatstron')
app.setAppUserModelId('dev.murilopereira.whatstron')

app.on('second-instance', (_, argv) => {
  const window = WhatsAppClient.getInstance().getWindow()

  if (window) {
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
  }

  let groupLinkOpenRequested: string | null = null
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

app.userAgentFallback = Settings.getInstance().getString('userAgent')

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.murilopereira.whatstron')

  WhatsAppClient.getInstance().init()

  if (Settings.getInstance().getBoolean('globalShortcut')) {
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
  if (Settings.getInstance().getBoolean('globalShortcut')) {
    Electron.globalShortcut.unregisterAll()
  }
})
