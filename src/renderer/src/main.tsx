import '@picocss/pico/css/pico.min.css'
import { render } from 'solid-js/web'
import Settings from './pages/Settings'

render(() => <Settings />, document.getElementById('root') as HTMLElement)
