import { app, BrowserWindow, nativeImage, shell } from 'electron'
import WhatsAppClient from '../WhatsAppClient'
import Settings, { openSettings } from './Settings'
import { svgToPng, WhatsAppIcon } from './Resources'
import * as path from 'path'
import MenuItem = Electron.MenuItem
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions

export class Menu {
  public static getMenuTemplate = (): Array<MenuItemConstructorOptions | MenuItem> => {
    const baseTemplate: Array<MenuItemConstructorOptions | MenuItem> = [
      {
        label: `&Edit`,
        submenu: [
          {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            role: 'undo'
          },
          {
            label: 'Redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
            role: 'redo'
          },
          {
            type: 'separator'
          },
          {
            label: 'Cut',
            accelerator: 'CmdOrCtrl+X',
            role: 'cut'
          },
          {
            label: 'Copy',
            accelerator: 'CmdOrCtrl+C',
            role: 'copy'
          },
          {
            label: 'Paste',
            accelerator: 'CmdOrCtrl+V',
            role: 'paste'
          },
          {
            label: 'Select All',
            accelerator: 'CmdOrCtrl+A',
            role: 'selectAll'
          },
          {
            type: 'separator'
          },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: (): void => {
              openSettings()
            }
          }
        ]
      },
      {
        label: '&View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: (_, focusedWindow): void => {
              if (focusedWindow) {
                focusedWindow.reload()
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Toggle Full Screen',
            accelerator: ((): string => {
              if (process.platform == 'darwin') return 'Ctrl+Command+F'
              else return 'F11'
            })(),
            click: (_, focusedWindow): void => {
              if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
            }
          },
          {
            label: 'Quiet mode',
            accelerator: 'CmdOrCtrl+Shift+Alt+Q',
            type: 'checkbox',
            checked: ((): boolean => {
              return Settings.getInstance().getBoolean('quietMode')
            })(),
            click: (item): void => {
              Settings.getInstance().set(
                'quietMode',
                !Settings.getInstance().getBoolean('quietMode')
              )
              item.checked = Settings.getInstance().getBoolean('quietMode')
              Settings.getInstance().storeSettings()
            }
          },
          { type: 'separator' },
          {
            label: 'Toggle Developer Tools',
            accelerator: ((): string => {
              if (process.platform == 'darwin') return 'Alt+Command+I'
              else return 'Ctrl+Shift+I'
            })(),
            click: (_, focusedWindow): void => {
              if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
          }
        ]
      },
      {
        label: '&Window',
        role: 'window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            role: 'minimize'
          },
          {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            role: 'close'
          },
          ...this.getDarwinWindowSubmenu()
        ]
      }
    ]
    if (process.platform == 'darwin') {
      const name = 'WhatsApp Desktop'

      return [
        {
          label: `&${name}`,
          submenu: [
            {
              label: `About ${name}`,
              role: 'about'
            },
            {
              type: 'separator'
            },
            {
              label: `Hide ${name}`,
              accelerator: 'Command+H',
              role: 'hide'
            },
            {
              label: 'Hide Others',
              accelerator: 'Command+Alt+H',
              role: 'hideOthers'
            },
            {
              label: 'Show All',
              role: 'unhide'
            },
            {
              type: 'separator'
            },
            {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: (): void => {
                WhatsAppClient.getInstance().releaseWindowLock()
                app.quit()
              }
            }
          ]
        },
        ...baseTemplate
      ]
    } else {
      return [
        {
          label: '&File',
          submenu: [
            {
              label: 'About',
              click: (): void => {
                this.openAbout()
              }
            },
            {
              label: 'Quit',
              accelerator: 'Ctrl+Q',
              click: (): void => {
                WhatsAppClient.getInstance().releaseWindowLock()
                app.quit()
              }
            }
          ]
        },
        ...baseTemplate
      ]
    }
  }

  public static getTrayMenu = (): Array<MenuItemConstructorOptions | MenuItem> => {
    return [
      {
        label: 'Show',
        visible: Settings.getInstance().getBoolean('startMinimized'), // Hide this option on start
        click: (): void => {
          WhatsAppClient.getInstance().showWindow()
        }
      },

      {
        label: 'Hide',
        visible: !Settings.getInstance().getBoolean('startMinimized'), // Show this option on start
        click: (): void => {
          WhatsAppClient.getInstance().getWindow().hide()
        }
      },

      // Quit WhatsApp
      {
        label: 'Quit',
        click: (): void => {
          WhatsAppClient.getInstance().releaseWindowLock()
          app.quit()
        }
      }
    ]
  }

  static openAbout(): void {
    const aboutWindow = new BrowserWindow({
      parent: WhatsAppClient.getInstance().getWindow(),
      modal: true,
      maxWidth: 500,
      width: 500,
      maxHeight: 320,
      height: 320,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        sandbox: false
      },
      title: 'About',
      icon: nativeImage.createFromBuffer(svgToPng(WhatsAppIcon))
    })

    aboutWindow.setMenuBarVisibility(false)

    if (process.env.ELECTRON_RENDERER_URL) {
      aboutWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?path=about`)
    } else {
      aboutWindow.loadURL(`${path.join(__dirname, '../dist/html/index.html')}?path=about`)
    }

    aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  private static getDarwinWindowSubmenu = (): Array<MenuItemConstructorOptions> => {
    if (process.platform !== 'darwin') return []

    return [
      { type: 'separator' },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ]
  }
}
