const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Almacenamiento en memoria para URLs acortadas
const urlDatabase = {};
let urlCount = 1;

// Ruta POST para crear URL corta
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // Validar formato URL usando URL constructor
  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Validar que el hostname existe usando dns.lookup
  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    } else {
      // Verificar si la URL ya está almacenada
      for (const key in urlDatabase) {
        if (urlDatabase[key] === originalUrl) {
          return res.json({ original_url: originalUrl, short_url: Number(key) });
        }
      }
      // Guardar nueva URL y asignar short_url
      urlDatabase[urlCount] = originalUrl;
      res.json({ original_url: originalUrl, short_url: urlCount });
      urlCount++;
    }
  });
});

// Ruta GET para redirigir a la URL original
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  const originalUrl = urlDatabase[shortUrl];

  if (originalUrl) {
    res.redirect(originalUrl);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

// Servidor escuchando
app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
});
