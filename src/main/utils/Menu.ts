import { app } from 'electron'
import WhatsAppClient from '../WhatsAppClient'
import Configs from './Configs'
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
              //fixme implement settings
              console.warn('Not Implemented')
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
            label: 'Dark mode',
            accelerator: 'CmdOrCtrl+Shift+Alt+D',
            type: 'checkbox',
            checked: ((): boolean => {
              return Configs.getInstance().getBoolean('darkMode')
            })(),
            click: (item, focusedWindow): void => {
              Configs.getInstance().set(
                'darkMode',
                Configs.getInstance().getBoolean('darkMode') != true
              )
              item.checked = Configs.getInstance().getBoolean('darkMode')
              Configs.getInstance().storeSettings()
              Configs.getInstance().applyConfiguration()
              if (focusedWindow) focusedWindow.reload()
            }
          },
          {
            label: 'Quiet mode',
            accelerator: 'CmdOrCtrl+Shift+Alt+Q',
            type: 'checkbox',
            checked: ((): boolean => {
              return Configs.getInstance().getBoolean('quietMode')
            })(),
            click: (item): void => {
              Configs.getInstance().set('quietMode', !Configs.getInstance().getBoolean('quietMode'))
              item.checked = Configs.getInstance().getBoolean('quietMode')
              Configs.getInstance().storeSettings()
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
      },
      {
        label: '&Audio',
        submenu: [
          {
            label: 'Increase Audio Rate by 20%',
            accelerator: 'CmdOrCtrl+=',
            click: (_, focusedWindow): void => {
              focusedWindow &&
                focusedWindow.webContents.executeJavaScript(
                  'window.audioRate = (window.audioRate || 1) + 0.2'
                )
            }
          },
          {
            label: 'Decrease Audio Rate by 20%',
            accelerator: 'CmdOrCtrl+-',
            click: (_, focusedWindow): void => {
              focusedWindow &&
                focusedWindow.webContents.executeJavaScript(
                  'window.audioRate = (window.audioRate || 1) - 0.2'
                )
            }
          }
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
                app.quit()
              }
            }
          ]
        },
        ...baseTemplate
      ]
    } else if (process.platform == 'linux' || process.platform == 'win32') {
      return [
        {
          label: '&File',
          submenu: [
            {
              label: 'About',
              click: (): void => {
                //fixme implement about
                console.warn('Not implemented')
              }
            },
            {
              label: 'Quit',
              accelerator: 'Ctrl+Q',
              click: (): void => {
                require('electron').app.quit()
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
        // fixme load config
        visible: true, //config.get('startminimized'), // Hide this option on start
        click: (): void => {
          WhatsAppClient.getInstance().showWindow()
        }
      },

      {
        label: 'Hide',
        visible: true, //!config.get('startminimized'), // Show this option on start
        click: (): void => {
          WhatsAppClient.getInstance().getWindow().hide()
        }
      },

      // Quit WhatsApp
      {
        label: 'Quit',
        click: (): void => {
          app.quit()
        }
      }
    ]
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
