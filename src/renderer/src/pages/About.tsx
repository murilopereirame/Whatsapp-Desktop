import { Component } from 'solid-js'

const About: Component = () => {
  return (
    <main class="container">
      <div class={'container'} style={{ 'text-align': 'center', 'margin-top': '24px' }}>
        <h2>About</h2>
      </div>
      <p>
        Whatstron is an <span class={'bold'}>Unofficial</span> WhatsApp Web client for Linux made in
        Electron.
        <br />
        <br />
        This project is based on Enrico204's{' '}
        <a href="https://github.com/Enrico204/Whatsapp-Desktop" target="_blank">
          WhatsApp-Desktop
        </a>
        <br />
        <br />
        <span class={'bold'}>Version:</span> 1.0.0
        <br />
        <span class={'bold'}>Email:</span> hello@murilopereira.dev
        <br />
        <span class={'bold'}>Website:</span>{' '}
        <a target={'_blank'} href={'https://murilopereira.dev.br'}>
          murilopereira.dev.br
        </a>
      </p>
    </main>
  )
}

export default About
