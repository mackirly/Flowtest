module.exports = {
  // Настройки запуска браузера по умолчанию
  launch: {
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  },
  
  // Настройки страницы по умолчанию
  page: {
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    }
  }
};