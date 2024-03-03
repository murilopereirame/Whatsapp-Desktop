import '@picocss/pico/css/pico.min.css'
import { render } from 'solid-js/web'
import Settings from './pages/Settings'
import './styles.css'
import About from './pages/About'

const searchParams = new URLSearchParams(window.location.search)
const path = searchParams.get('path')
render(
  () => {
    if (path === 'settings') return <Settings />
    else if (path === 'about') return <About />

    return (
      <>
        <main class="container">
          <div class={'container'} style={{ 'text-align': 'center' }}>
            <h2>Loading...</h2>
          </div>
        </main>
      </>
    )
  },
  document.getElementById('root') as HTMLElement
)
