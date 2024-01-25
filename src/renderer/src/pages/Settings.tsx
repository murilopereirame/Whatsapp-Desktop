import { Component, createSignal, onMount } from 'solid-js'
import '../styles.css'
import { SettingsProperties, SettingsValue } from '../../../common'
import { toast, Toaster } from 'solid-toast'

const Settings: Component = () => {
  const [settings, setSettings] = createSignal<SettingsProperties | undefined>()

  onMount(() => {
    window.api.getSettings().then((st) => {
      setSettings(st)
    })
  })

  const saveSettings = (): void => {
    const settingsToSave = settings()
    if (!settingsToSave) return

    window.api.updateSettings(settingsToSave)
    toast.success('Settings saved', {
      style: {
        'background-color': 'var(--background-color)',
        color: 'var(--color)'
      }
    })
  }

  const updateSettings = (key: string, value: SettingsValue): void => {
    const currentSettings = settings()
    if (!currentSettings) return

    currentSettings[key] = value
    setSettings(currentSettings)
  }

  return (
    <main class="container">
      <Toaster position="top-center" gutter={16} />
      <div class={'container'} style={{ 'text-align': 'center', 'margin-top': '24px' }}>
        <h2>Settings</h2>
      </div>
      <section>
        <h5>Window</h5>
        <label>
          <input
            onChange={(e) => updateSettings('maximized', e.currentTarget.checked)}
            checked={settings()?.maximized}
            role={'switch'}
            type={'checkbox'}
          />
          Start Maximized
        </label>
        <label>
          <input
            onChange={(e) => updateSettings('startMinimized', e.currentTarget.checked)}
            checked={settings()?.startMinimized}
            role={'switch'}
            type={'checkbox'}
          />
          Start Minimized
        </label>
        <label>
          <input
            onChange={(e) => updateSettings('disableGPU', e.currentTarget.checked)}
            checked={settings()?.disableGPU}
            role={'switch'}
            type={'checkbox'}
          />
          Disable GPU
        </label>
      </section>
      <section>
        <h5>System</h5>
        <label>
          <input
            onChange={(e) => updateSettings('trayIcon', e.currentTarget.checked)}
            checked={settings()?.trayIcon}
            role={'switch'}
            type={'checkbox'}
          />
          Run in background
        </label>
        <label>
          <input
            onChange={(e) => updateSettings('autoStart', e.currentTarget.checked)}
            checked={settings()?.autoStart}
            role={'switch'}
            type={'checkbox'}
          />
          Start with system
        </label>
      </section>
      <section>
        <h5>Proxy</h5>
        <fieldset>
          <label>
            <input
              onChange={(e) => updateSettings('useProxy', e.currentTarget.checked)}
              checked={settings()?.useProxy}
              role={'switch'}
              type={'checkbox'}
            />
            Use proxy
          </label>
        </fieldset>
        <label for={'httpProxy'}>HTTP Proxy</label>
        <input
          onInput={(e) => updateSettings('httpProxy', e.target.value)}
          value={settings()?.httpProxy}
          id={'httpProxy'}
          type={'text'}
        />
        <label for={'httpsProxy'}>HTTPS Proxy</label>
        <input
          onInput={(e) => updateSettings('httpsProxy', e.target.value)}
          value={settings()?.httpsProxy}
          id={'httpsProxy'}
          type={'text'}
        />
      </section>
      <section>
        <h5>Client</h5>
        <label for={'userAgent'}>User-Agent</label>
        <input
          onInput={(e) => updateSettings('userAgent', e.target.value)}
          value={settings()?.userAgent}
          id={'userAgent'}
          type={'text'}
        />
      </section>
      <section>
        <h5>Chat</h5>
        <fieldset>
          <label>
            <input
              onChange={(e) => updateSettings('blurImages', e.currentTarget.checked)}
              checked={settings()?.blurImages}
              role={'switch'}
              type={'checkbox'}
            />
            Blur images
          </label>
          <label>
            <input
              onChange={(e) => updateSettings('hideAvatars', e.currentTarget.checked)}
              checked={settings()?.hideAvatars}
              role={'switch'}
              type={'checkbox'}
            />
            Hide avatar
          </label>
          <label>
            <input
              onChange={(e) => updateSettings('hidePreviews', e.currentTarget.checked)}
              checked={settings()?.hidePreviews}
              role={'switch'}
              type={'checkbox'}
            />
            Hide preview
          </label>
          <label>
            <input
              onChange={(e) => updateSettings('autoHideMenuBar', e.currentTarget.checked)}
              checked={settings()?.autoHideMenuBar}
              role={'switch'}
              type={'checkbox'}
            />
            Auto hide menu bar
          </label>
        </fieldset>
        <label for={'backgroundOpacity'}>Background opacity</label>
        <input
          onInput={(e) => updateSettings('backgroundOpacity', e.target.value)}
          value={settings()?.backgroundOpacity}
          id={'backgroundOpacity'}
          min={0}
          max={100}
          type={'number'}
        />
        <label for={'fontSize'}>Font size</label>
        <input
          onChange={(e) => updateSettings('fontSize', e.target.value)}
          value={settings()?.fontSize}
          id={'fontSize'}
          min={1}
          type={'number'}
        />
        <label for={'thumbSize'}>Thumb size</label>
        <input
          onChange={(e) => updateSettings('thumbSize', e.target.value)}
          value={settings()?.thumbSize}
          id={'thumbSize'}
          min={1}
          type={'number'}
        />
        <label for={'backgroundImage'}>Background image</label>
        <input
          onChange={(e) => updateSettings('backgroundImage', e.target.value)}
          value={settings()?.backgroundImage}
          id={'backgroundImage'}
          type={'text'}
        />
        <label for={'customCSS'}>Custom CSS</label>
        <textarea
          onChange={(e) => updateSettings('customCSS', e.target.value)}
          value={settings()?.customCSS}
          id={'customCSS'}
        />
        <button onClick={saveSettings} class={'secondary'}>
          Save
        </button>
      </section>
    </main>
  )
}

export default Settings
