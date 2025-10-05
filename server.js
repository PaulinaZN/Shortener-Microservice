const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');

const app = express();
const port = process.env.PORT || 3000;

// Middleware esencial
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Soporte para POST JSON (por si freeCodeCamp lo usa)

// CORS completo para freeCodeCamp y navegadores
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Almacenamiento en memoria (reinicia en Render Free, pero OK para tests)
const urlDatabase = {};
let urlCount = 1;

// Ruta RAÍZ: Esto resuelve el "not found" - siempre responde con JSON
app.get('/', (req, res) => {
  res.json({ 
    message: 'URL Shortener Microservice is running!',
    endpoints: {
      post: '/api/shorturl (body: {url: "https://example.com"})',
      get: '/api/shorturl/:short_url (redirects to original)'
    }
  });
});

// Función de validación: Formato URL + DNS lookup con timeout
function validateUrl(originalUrl, callback) {
  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim().length === 0) {
    return callback(false);
  }

  const trimmedUrl = originalUrl.trim();
  let testUrl = trimmedUrl;
  
  // Si no tiene protocolo, agrega https para testing (pero no lo guardes así)
  if (!trimmedUrl.match(/^https?:\/\//i)) {
    testUrl = 'https://' + trimmedUrl;
  }

  let hostname;
  try {
    const parsedUrl = new URL(testUrl);
    hostname = parsedUrl.hostname;
    if (!hostname || hostname === 'localhost' || hostname.length < 1) {
      return callback(false);
    }
  } catch (err) {
    console.log('URL Parse Error:', err.message); // Log para debug
    return callback(false);
  }

  // DNS lookup con timeout de 3s (evita hangs en Render)
  const timeout = setTimeout(() => {
    callback(false);
  }, 3000);

  dns.lookup(hostname, (err, address) => {
    clearTimeout(timeout);
    if (err || !address) {
      console.log('DNS Lookup Failed for:', hostname); // Log para debug
      return callback(false);
    }
    console.log('DNS OK for:', hostname); // Log para debug
    callback(true, trimmedUrl); // Devuelve true y la URL original (sin modificar)
  });
}

// POST /api/shorturl: Crea short URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  validateUrl(originalUrl, (isValid, validatedUrl) => {
    if (!isValid) {
      return res.status(400).json({ error: 'invalid url' });
    }

    // Verifica duplicado por URL exacta (case-sensitive, como freeCodeCamp)
    let existingShort = null;
    for (const key in urlDatabase) {
      if (urlDatabase[key] === validatedUrl) {
        existingShort = parseInt(key, 10);
        break;
      }
    }

    if (existingShort !== null) {
      return res.json({ original_url: validatedUrl, short_url: existingShort });
    }

    // Nueva URL
    urlDatabase[urlCount] = validatedUrl;
    const response = { original_url: validatedUrl, short_url: urlCount };
    console.log('New URL added:', response); // Log para debug
    res.json(response);
    urlCount++;
  });
});

// GET /api/shorturl/:short_url: Redirige a original
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortId = parseInt(req.params.short_url, 10);
  if (isNaN(shortId) || shortId < 1) {
    return res.status(400).json({ error: 'invalid url' });
  }

  const originalUrl = urlDatabase[shortId];
  if (!originalUrl) {
    return res.status(404).json({ error: 'No short URL found in the database' });
  }

  console.log('Redirecting short_url', shortId, 'to', originalUrl); // Log para debug
  res.redirect(301, originalUrl); // 301 como espera freeCodeCamp
});

// Handler para rutas no encontradas (evita "not found" genérico)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found. Use / or /api/shorturl' });
});

// Inicia servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en puerto ${port}`);
  console.log('App ready! Visit / for status.');
});
