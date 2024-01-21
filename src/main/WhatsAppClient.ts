import { app, BrowserWindow, Menu, Tray } from 'electron'
import { Menu as AppMenu } from './utils/Menu'
import { unlinkSync } from 'fs'
import Configs from './Configs'

// @ts-ignore Webstorm doesn't recognize asset
import injectedJS from './js/injected.js?asset'

enum IconStatus {
  NORMAL,
  WITH_MESSAGES,
  WARNING
}

class WhatsAppClient {
  private static instance: WhatsAppClient
  private tray: Tray | undefined = undefined
  private menu: Electron.Menu | null = null
  private trayContextMenu: Electron.Menu | null = null
  private iconStatus: IconStatus = IconStatus.NORMAL
  private window: Electron.BrowserWindow
  private groupLinkOpenRequested: string | null = null
  private config = Configs.getInstance()

  public static getInstance = (): WhatsAppClient => {
    if (!WhatsAppClient.instance) this.instance = new WhatsAppClient()

    return this.instance
  }

  init = (): void => {
    console.debug('Initialize WhatsApp Client')
    this.createMenu()
    this.clearCache()
    this.createWindow()
    this.config.applyConfiguration()
  }

  getWindow = (): Electron.BrowserWindow => this.window

  createMenu = (): void => {
    console.debug('Creating menu')
    this.menu = Menu.buildFromTemplate(AppMenu.getMenuTemplate())
    Menu.setApplicationMenu(this.menu)
  }

  setNormalTray = (): void => {
    this.iconStatus = IconStatus.NORMAL
    this.updateTrayIcon()
  }

  setWarningTray(): void {
    this.iconStatus = IconStatus.WARNING
    this.updateTrayIcon()
  }

  setNewMessageIcon(): void {
    this.iconStatus = IconStatus.WITH_MESSAGES
    this.updateTrayIcon()
  }

  clearNewMessageIcon(): void {
    this.iconStatus = IconStatus.NORMAL
    this.updateTrayIcon()
  }

  updateTrayIcon(): void {
    if (this.tray != undefined && process.platform != 'darwin') {
      if (this.iconStatus === IconStatus.WARNING) {
        console.debug('Setting tray icon to warning')
        this.tray.setImage(__dirname + '/assets/icon/iconWarning.png')
      } else if (this.iconStatus === IconStatus.WITH_MESSAGES) {
        console.debug('Setting tray icon to normal with messages')
        this.tray.setImage(__dirname + '/assets/icon/iconWithMsg.png')
      } else {
        console.debug('Setting tray icon to normal')
        this.tray.setImage(__dirname + '/assets/icon/icon.png')
      }
    }
  }

  createTray(): void {
    console.debug('Creating tray icon')
    let trayImg = __dirname + '/assets/img/trayTemplate.png'

    // Darwin requires black/white/transparent icon, other platforms does not
    if (process.platform != 'darwin') {
      trayImg = __dirname + '/assets/icon/icon.png'
    }

    this.tray = new Tray(trayImg)

    // Setting up a trayicon context menu
    this.trayContextMenu = Menu.buildFromTemplate(AppMenu.getTrayMenu())
    this.tray.setContextMenu(this.trayContextMenu)

    // Normal this will show the main window, but electron under Linux
    // dosent work with the clicked event so we are using the above
    // contextmenu insted - Rightclick the trayicon and pick Show
    // WhatsApp
    // More info:
    // https://github.com/electron/electron/blob/master/docs/api/tray.md
    // See the Platform limitations section.

    this.tray.on('click', () => {
      this.showWindow()
    })

    this.tray.setToolTip('Whatstron')
  }

  hasTray = (): boolean => this.tray !== undefined

  destroyTray = (): void => {
    this.tray?.destroy()
    this.tray = undefined
  }

  clearCache(): void {
    console.debug('Clearing cache')
    try {
      unlinkSync(app.getPath('userData') + '/Application Cache/Index')
    } catch (e) {
      console.warn('Error clearing cache: ' + e)
    }
  }

  createWindow = (): Electron.BrowserWindow => {
    console.debug('Open main window')
    this.window = new BrowserWindow({
      y: this.config.getNumber('posY'),
      x: this.config.getNumber('posX'),
      width: this.config.getNumber('width'),
      height: this.config.getNumber('height'),
      minWidth: 600,
      minHeight: 600,
      title: 'WhatsApp',
      show: false,
      autoHideMenuBar: this.config.getBoolean('autoHideMenuBar'),
      icon: __dirname + '/assets/icon/icon.png',
      webPreferences: {
        nodeIntegration: false,
        preload: injectedJS
      }
    })

    this.window.loadURL('https://web.whatsapp.com', {
      userAgent: this.config.getString('userAgent')
    })

    this.window.webContents.on('did-finish-load', () => {
      if (this.groupLinkOpenRequested != null) {
        this.window.webContents.executeJavaScript(
          "var el = document.createElement('a');\
          el.href = \"" +
            this.groupLinkOpenRequested +
            "\"; \
el.style.display = \"none\"; \
el.rel = 'noopener noreferrer'; \
el.id = 'newlink'; \
document.body.appendChild(el); \
setTimeout(function() { var el = document.getElementById('newlink'); el.click(); document.body.removeChild(el); }, 500); \
"
        )
      }

      //fixme check for updates
    })

    if (this.config.getString('useProxy')) {
      const session = this.window.webContents.session
      const httpProxy = this.config.getString('httpProxy')
      const httpsProxy = this.config.getString('httpsProxy') || httpProxy
      if (httpProxy) {
        session.setProxy({ proxyRules: `http=${httpProxy};https=${httpsProxy}` })
      }
    }

    if (!this.config.getBoolean('startMinimized')) {
      this.window.show()
    }

    this.window.on('move', () => {
      this.updatePosition()
    })

    this.window.on('resize', () => {
      this.updatePosition()
    })

    this.window.on('page-title-updated', (event, title) => {
      const count = title.match(/\((\d+)\)/)?.at(1) ?? '0'

      if (parseInt(count) > 0) {
        if (process.platform === 'darwin') return app.dock.setBadge(count)

        if (!this.window.isFocused() && !this.config.getBoolean('quietMode')) {
          this.window.flashFrame(true)
        }
        const badge = Electron.nativeImage.createFromPath(
          app.getAppPath() + '/assets/badges/badge-0.png'
        )
        this.window.setOverlayIcon(badge, 'new messages')
        this.setNewMessageIcon()
      } else {
        this.window.setOverlayIcon(null, 'no new messages')
        this.clearNewMessageIcon()
      }
      console.debug('Badge updated: ' + count)
    })

    this.window.on('close', (e) => {
      if (this.tray == undefined && process.platform !== 'darwin') {
        app.quit()
      } else {
        e.preventDefault()
        this.window.hide()
      }
    })

    // Toggle contextmenu content when window is shown
    this.window.on('show', () => {
      if (this.tray != undefined) {
        this.trayContextMenu.items[0].visible = false
        this.trayContextMenu.items[1].visible = true

        if (process.platform === 'linux') this.tray.setContextMenu(this.trayContextMenu)
      }
    })

    // Toggle contextmenu content when window is hidden
    this.window.on('hide', () => {
      if (this.tray != undefined) {
        this.trayContextMenu.items[1].visible = false
        this.trayContextMenu.items[0].visible = true

        if (process.platform === 'linux') this.tray.setContextMenu(this.trayContextMenu)
      }
    })

    return this.window
  }

  public showWindow = (): void => {
    this.window.show()
    this.window.setAlwaysOnTop(true)
    this.window.focus()
    this.window.setAlwaysOnTop(false)
  }

  private updatePosition = (): void => {
    this.config.set('posX', this.window.getBounds().x)
    this.config.set('posY', this.window.getBounds().y)
    this.config.set('width', this.window.getBounds().width)
    this.config.set('height', this.window.getBounds().height)
    this.config.storeSettings()
  }
}

export default WhatsAppClient
