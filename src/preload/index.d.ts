import { ElectronAPI } from '@electron-toolkit/preload'
import { IpcAPI } from '../common'

declare global {
  interface Window {
    electron: ElectronAPI
    api: IpcAPI
  }
}
