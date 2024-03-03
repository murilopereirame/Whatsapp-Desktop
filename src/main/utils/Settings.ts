import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import WhatsAppClient from '../WhatsAppClient'
import { SettingsProperties, SettingsValue } from '../../common'
import * as path from 'path'
import { svgToPng, WhatsAppIcon } from './Resources'

export const openSettings = (): void => {
  const settingsWindow = new BrowserWindow({
    parent: WhatsAppClient.getInstance().getWindow(),
    modal: true,
    maxWidth: 400,
    width: 400,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    title: 'Settings',
    icon: nativeImage.createFromBuffer(svgToPng(WhatsAppIcon))
  })

  settingsWindow.setMenuBarVisibility(false)

  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/path=settings`)
  } else {
    settingsWindow.loadURL(`file://${path.join(__dirname, '../renderer/index.html')}?path=settings`)
  }

  ipcMain.on('settings:update', (_, settings: SettingsProperties) => {
    const settingsInstance = Settings.getInstance()

    Object.entries(settings).map((setting: [string, SettingsValue]) =>
      settingsInstance.set(setting[0], setting[1])
    )

    settingsInstance.storeSettings()
    settingsInstance.applyConfiguration()
  })

  ipcMain.handle('settings:get', (): SettingsProperties => {
    return Settings.getInstance().getAll()
  })

  settingsWindow.on('close', () => {
    ipcMain.removeHandler('settings:get')
    ipcMain.removeHandler('settings:update')
  })
}

class Settings {
  private static instance: Settings
  private settings: SettingsProperties = {
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    width: 1000,
    height: 720,
    posY: 0,
    posX: 0,
    autoHideMenuBar: false,
    useProxy: false,
    httpProxy: '',
    httpsProxy: '',
    startMinimized: false,
    quietMode: false,
    disableGPU: false,
    maximized: false,
    fontSize: 'normal',
    backgroundImage: '',
    backgroundOpacity: 100,
    blurImages: false,
    customCSS: '',
    trayIcon: true,
    autoStart: false,
    globalShortcut: false
  }

  private settingsFile: string = `${app.getPath('userData')}/settings.json`

  static getInstance = (): Settings => {
    if (!this.instance) {
      this.instance = new Settings()
      this.instance.loadConfigs()
    }

    return this.instance
  }

  getAll = (): SettingsProperties => this.settings

  getString = (key: string): string => {
    return this.get(key).toString()
  }

  getNumber = (key: string): number => {
    return Number(this.get(key))
  }

  getBoolean = (key: string): boolean => {
    return this.get(key) === true
  }

  set = (key: string, value: SettingsValue): void => {
    this.settings[key] = value
  }

  storeSettings = (): void => {
    try {
      writeFileSync(this.settingsFile, JSON.stringify(this.settings))
      console.info(`Settings saved to ${this.settingsFile}`)
    } catch (e) {
      console.warn(`Failed to save settings to ${this.settingsFile} (${e})`)
    }
  }

  applyConfiguration(): void {
    const whatsApp = WhatsAppClient.getInstance()

    console.info('Applying configuration')
    if (this.get('maximized') && this.get('startMinimized') != true) {
      whatsApp.getWindow().maximize()
    }

    whatsApp.getWindow().webContents.on('dom-ready', () => {
      console.log('Applying custom CSS')
      const fontSize = this.getString('fontSize')
      const fontCSS = fontSize != 'normal' ? `font-size: ${fontSize}px !important;` : ''
      const cssContent: string[] = []

      cssContent.push(
        `* { text-rendering: optimizeSpeed !important; -webkit-font-smoothing: subpixel-antialiased !important; ${fontCSS}}`
      )

      const blurImages =
        'div.message-in img, div.message-out img { filter: contrast(25%) blur(8px) grayscale(75%); } \n \
                div.message-in:hover img, div.message-out:hover img { filter: none; }'

      if (this.getBoolean('blurImages')) {
        cssContent.push(blurImages)
      }

      if (this.get('customCSS') !== '') {
        try {
          cssContent.push(this.getString('customCSS'))
        } catch (e) {
          console.error('CSS error: ' + e)
        }
      }

      const imagePath = this.getString('backgroundImage')
      if (imagePath !== '') {
        const img = readFileSync(imagePath)
        const img64 = Buffer.from(img).toString('base64')
        const opacity = this.getNumber('backgroundOpacity') / 100.0

        ;(async (): Promise<void> => {
          const { default: mime } = await import('mime')
          const mimeType = mime.getType(imagePath)

          cssContent.push(
            '.pane-chat-tile { background: url("data:' +
              mimeType +
              ';base64,' +
              img64 +
              '") !important; background-size: cover !important; opacity: ' +
              opacity +
              ' !important; max-width: 100% !important; }'
          )

          whatsApp.getWindow().webContents.send('style:inject-css', cssContent.join(' '))
        })()
      } else {
        whatsApp.getWindow().webContents.send('style:inject-css', cssContent.join(' '))
      }
    })

    if (this.getBoolean('useProxy')) {
      const session = whatsApp.getWindow().webContents.session
      const httpProxy = this.getString('httpProxy')
      const httpsProxy = this.getString('httpsProxy') || httpProxy
      if (httpProxy) {
        console.info('Proxy configured: ' + 'http=' + httpProxy + ';https=' + httpsProxy)
        session.setProxy({ proxyRules: `http=${httpProxy};https=${httpsProxy}` })
      } else {
        console.info('No proxy')
      }
    }

    // OSX Dock menu
    if (process.platform == 'darwin') {
      const dockMenu = Menu.buildFromTemplate([
        {
          label: 'Show main window',
          click: (): void => {
            whatsApp.showWindow()
          }
        }
      ])
      app.dock.setMenu(dockMenu)
      app.on('activate', () => {
        whatsApp.showWindow()
      })
    }

    if (this.getBoolean('trayIcon') && !whatsApp.hasTray()) {
      whatsApp.createTray()
    } else if (!this.getBoolean('trayIcon') && whatsApp.hasTray()) {
      console.info('Destroying tray icon')
      whatsApp.destroyTray()
    }

    if (this.getBoolean('autoStart') == true) {
      app.setLoginItemSettings({
        openAtLogin: true
      })
    } else {
      const isAutoStart = app.getLoginItemSettings()
      if (isAutoStart.openAtLogin)
        app.setLoginItemSettings({
          openAtLogin: false
        })
    }
    whatsApp.getWindow().setMenuBarVisibility(!this.getBoolean('autoHideMenuBar'))
    whatsApp.getWindow().setAutoHideMenuBar(this.getBoolean('autoHideMenuBar'))
  }

  private get = (key: string): SettingsValue => {
    return this.settings[key]
  }

  private loadConfigs = (): void => {
    console.debug('Loading configuration')
    try {
      const data = readFileSync(this.settingsFile).toString()
      if (data !== '') {
        const parsedSettings = JSON.parse(data)
        Object.entries(parsedSettings).map(([key, value]) => {
          if (value != null || value != undefined) this.set(key, value as SettingsValue)
        })
        console.info('Configuration loaded from ' + this.settingsFile)
        this.storeSettings()
      } else {
        console.warn('Configuration file empty, using default')
        this.storeSettings()
      }
    } catch (e) {
      console.warn(
        'Error loading configuration from ' + this.settingsFile + ' (' + e + '), using default'
      )
    }

    if (this.get('disableGPU') == true) {
      console.warn('Disabling GPU acceleration')
      app.disableHardwareAcceleration()
    }
  }
}

export default Settings
