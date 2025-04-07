app.get('/config.js', (req, res) => {
    res.set('Content-Type', 'application/javascript');
    res.send(`window.BASE_PATH = "${BASE_PATH}";`);
  });