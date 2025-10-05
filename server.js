const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Almacenamiento
const urlDatabase = {};
let urlCount = 1;

// Ruta raíz simplificada
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener Microservice' });
});

// Función de validación mejorada
function validateUrl(originalUrl, callback) {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return callback(false);
  }

  const trimmedUrl = originalUrl.trim();
  if (trimmedUrl.length === 0) {
    return callback(false);
  }

  // Validación de formato básico (como freeCodeCamp espera)
  const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/i;
  if (!urlRegex.test(trimmedUrl)) {
    return callback(false);
  }

  let urlToCheck = trimmedUrl;
  // Si no tiene protocolo, agrega https para el DNS lookup
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    urlToCheck = 'https://' + trimmedUrl;
  }

  let hostname;
  try {
    const parsedUrl = new URL(urlToCheck);
    hostname = parsedUrl.hostname;
    
    // Validaciones básicas del hostname
    if (!hostname || hostname === 'localhost') {
      return callback(false);
    }
  } catch (err) {
    return callback(false);
  }

  // DNS lookup con timeout más corto
  const timeout = setTimeout(() => {
    // Si el DNS timeout, igual aceptamos la URL (más permisivo)
    callback(true, trimmedUrl);
  }, 2000);

  dns.lookup(hostname, (err, address) => {
    clearTimeout(timeout);
    if (err || !address) {
      console.log('DNS lookup failed for:', hostname);
      // Aún así aceptamos la URL si el formato es correcto
      return callback(true, trimmedUrl);
    }
    callback(true, trimmedUrl);
  });
}

// POST /api/shorturl - CORREGIDO
app.post('/api/shorturl', (req, res) => {
  console.log('POST received, body:', req.body); // Debug
  
  // Manejar tanto JSON como form-urlencoded
  const originalUrl = req.body.url;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  validateUrl(originalUrl, (isValid, validatedUrl) => {
    if (!isValid) {
      return res.json({ error: 'invalid url' }); // Sin status 400, solo JSON
    }

    // Buscar URL existente
    let existingShort = null;
    for (const key in urlDatabase) {
      if (urlDatabase[key] === validatedUrl) {
        existingShort = parseInt(key, 10);
        break;
      }
    }

    if (existingShort !== null) {
      return res.json({ 
        original_url: validatedUrl, 
        short_url: existingShort 
      });
    }

    // Nueva URL
    const shortUrl = urlCount;
    urlDatabase[urlCount] = validatedUrl;
    
    const response = { 
      original_url: validatedUrl, 
      short_url: shortUrl 
    };
    
    console.log('New URL stored:', response);
    urlCount++;
    
    res.json(response); // Respuesta exacta como freeCodeCamp espera
  });
});

// GET /api/shorturl/:short_url - CORREGIDO
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortId = parseInt(req.params.short_url, 10);
  
  if (isNaN(shortId) || shortId < 1 || !urlDatabase[shortId]) {
    return res.json({ error: 'invalid url' }); // Mismo formato de error
  }

  const originalUrl = urlDatabase[shortId];
  console.log('Redirecting to:', originalUrl);
  res.redirect(originalUrl);
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.json({ error: 'invalid url' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
