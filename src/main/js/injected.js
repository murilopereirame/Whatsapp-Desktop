;(function () {
  const { ipcRenderer } = require('electron')
  const { remote } = require('electron')

  ipcRenderer.on('style:inject-css', (_, css) => {
    const styleSheet = document.createElement('style', {
      id: 'custom-css'
    })
    styleSheet.innerText = css
    document.head.appendChild(styleSheet)
  })

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      const observer = new MutationObserver(function () {
        const mainChat = document.querySelector('#main')

        if (mainChat) {
          mainChat.firstElementChild.classList.add('pane-chat-tile')
        }

        const inputSearch = document.querySelector('input.input-search')
        if (inputSearch) {
          console.log('Adding event listeners')

          document.addEventListener('keydown', function (event) {
            // cmd+k and cmd+f focuses on search input.
            if ((event.keyCode === 75 || event.keyCode === 70) && event.metaKey === true)
              inputSearch.focus()
          })

          console.log('Disconnecting the observer')
          observer.disconnect()
        }
      })

      var config = { childList: true, subtree: true }
      observer.observe(document.querySelector('body'), config)
    },
    false
  )

  const NativeNotification = Notification
  Notification = function (title, options) {
    if (remote.getGlobal('config').currentSettings.quietMode) {
      return
    }

    var notification = new NativeNotification(title, options)

    notification.addEventListener('click', function () {
      ipcRenderer.send('notificationClick')
    })

    return notification
  }

  Notification.prototype = NativeNotification.prototype
  Notification.permission = NativeNotification.permission
  Notification.requestPermission = NativeNotification.requestPermission.bind(Notification)
})()
