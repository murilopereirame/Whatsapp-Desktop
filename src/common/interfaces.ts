interface SettingsProperties {
  userAgent: string
  width: number
  height: number
  posY: number
  posX: number
  autoHideMenuBar: boolean
  useProxy: boolean
  httpProxy: string
  httpsProxy: string
  startMinimized: boolean
  quietMode: boolean
  disableGPU: boolean
  maximized: boolean
  fontSize: string
  backgroundImage: string
  backgroundOpacity: number
  blurImages: boolean
  customCSS: string
  trayIcon: boolean
  autoStart: boolean
  globalShortcut: boolean
}

interface IpcAPI {
  updateSettings: (settings: SettingsProperties) => void
  getSettings: () => Promise<SettingsProperties>
}

export type { SettingsProperties, IpcAPI }
