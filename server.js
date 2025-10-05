const express = require('express');
const bodyParser = require('body-parser');

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

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener Microservice' });
});

// Función de validación SIMPLIFICADA (como freeCodeCamp espera)
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  
  // Validación básica de formato URL
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Verificar que tenga protocolo http o https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Verificar que tenga hostname
    if (!urlObj.hostname) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// POST /api/shorturl
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  console.log('Received URL:', originalUrl); // Debug
  
  if (!isValidUrl(originalUrl)) {
    console.log('URL invalid:', originalUrl);
    return res.json({ error: 'invalid url' });
  }

  // Buscar si la URL ya existe
  let existingShort = null;
  for (const [shortUrl, storedUrl] of Object.entries(urlDatabase)) {
    if (storedUrl === originalUrl) {
      existingShort = parseInt(shortUrl);
      break;
    }
  }

  if (existingShort !== null) {
    console.log('URL exists, returning existing short_url:', existingShort);
    return res.json({ 
      original_url: originalUrl, 
      short_url: existingShort 
    });
  }

  // Crear nueva URL corta
  const shortUrl = urlCount;
  urlDatabase[urlCount] = originalUrl;
  
  console.log('New URL stored. Short URL:', shortUrl, 'Original:', originalUrl);
  
  const response = { 
    original_url: originalUrl, 
    short_url: shortUrl 
  };
  
  urlCount++;
  res.json(response);
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortId = parseInt(req.params.short_url);
  
  console.log('Redirect request for short_url:', shortId);
  
  if (isNaN(shortId) || shortId < 1 || !urlDatabase[shortId]) {
    console.log('Invalid short_url requested:', shortId);
    return res.json({ error: 'invalid url' });
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
