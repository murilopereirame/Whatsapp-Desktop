import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'
import { Menu as AppMenu } from './utils/Menu'
import { unlinkSync } from 'fs'
import Configs from './utils/Configs'
import {
  getAppIcon,
  injectedJS,
  MessageBadge,
  svgToPng,
  WarningBadge,
  WhatsAppIcon
} from './utils/Resources'

export enum BadgeStatus {
  NORMAL,
  WITH_MESSAGES,
  WARNING
}

class WhatsAppClient {
  private static instance: WhatsAppClient
  private tray: Tray | undefined = undefined
  private menu: Electron.Menu | null = null
  private trayContextMenu: Electron.Menu | null = null
  private badgeIcon: BadgeStatus = BadgeStatus.NORMAL
  private window: Electron.BrowserWindow
  private groupLinkOpenRequested: string | null = null
  private config = Configs.getInstance()
  private messageCount = 0

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

  setWarningTray(): void {
    this.badgeIcon = BadgeStatus.WARNING
    this.updateTrayBadge()
  }

  setNewMessageIcon(): void {
    this.badgeIcon = BadgeStatus.WITH_MESSAGES
    this.updateTrayBadge()
    this.updateTrayIcon()
  }

  setNormalTray(): void {
    this.badgeIcon = BadgeStatus.NORMAL
    this.updateTrayBadge()
    this.updateTrayIcon()
  }

  updateTrayBadge = (): void => {
    let icon = null
    let message = ''
    if (this.badgeIcon === BadgeStatus.WARNING) {
      icon = nativeImage.createFromBuffer(svgToPng(WarningBadge))
      message = 'Connection issues'
    } else if (this.badgeIcon === BadgeStatus.WITH_MESSAGES) {
      icon = nativeImage.createFromBuffer(svgToPng(MessageBadge))
      message = `${this.messageCount} new messages`
    }

    this.window.setOverlayIcon(icon, message)
  }

  updateTrayIcon = (): void => {
    const icon = nativeImage.createFromBuffer(svgToPng(getAppIcon(this.badgeIcon)))
    this.tray.setImage(icon)
  }

  createTray(): void {
    console.debug('Creating tray icon')

    // Darwin requires black/white/transparent icon, other platforms does not
    this.tray = new Tray(nativeImage.createFromBuffer(svgToPng(getAppIcon())))

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
      icon: nativeImage.createFromBuffer(svgToPng(WhatsAppIcon)),
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
      const count = parseInt(title.match(/\((\d+)\)/)?.at(1) ?? '0')

      if (count > 0) {
        if (process.platform === 'darwin') return app.dock.setBadge(count.toString())

        if (!this.window.isFocused() && !this.config.getBoolean('quietMode')) {
          this.window.flashFrame(true)
        }

        this.messageCount = count
        this.setNewMessageIcon()
      } else {
        this.setNormalTray()
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
