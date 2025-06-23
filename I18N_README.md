# 🌐 ELI6 Movies Internationalization (i18n) System

This document describes the complete internationalization system implemented for the ELI6 Movies streaming platform, supporting English, Italian, and Russian languages using LibreTranslate for dynamic content translation.

## 🚀 Features

### ✅ Static Content Translation
- **JSON-based translation files** for UI strings
- **Automatic language detection** from URL parameters, cookies, and browser settings
- **Real-time language switching** with persistent preferences
- **Fallback system** to English when translations are missing

### ✅ Dynamic Content Translation
- **LibreTranslate integration** for movie/TV show titles and descriptions
- **Batch translation API** for efficient processing
- **Automatic content detection** using data attributes
- **Caching and error handling** for optimal performance

### ✅ User Experience
- **Language switcher** in the navigation bar
- **URL parameter support** (`?lng=it`, `?lng=ru`)
- **Cookie-based persistence** for language preferences
- **Smooth transitions** between languages

## 📁 File Structure

```
frontend/
├── locales/
│   ├── en.json          # English translations
│   ├── it.json          # Italian translations
│   └── ru.json          # Russian translations
├── js/
│   └── i18n.js          # Main i18n library
├── index.html           # Updated with i18n support
├── movies.html          # Updated with i18n support
├── tvshows.html         # Updated with i18n support
└── test-i18n.html       # Test page for i18n system

backend/
├── index.js             # Updated with translation API endpoints
└── package.json         # Updated with node-fetch dependency
```

## 🔧 Installation & Setup

### 1. Backend Dependencies
```bash
cd backend
npm install node-fetch@2
```

### 2. Start the Backend Server
```bash
cd backend
npm start
```

### 3. Access the Application
- Open `frontend/index.html` in your browser
- Or use a local server: `python -m http.server 8000` in the frontend directory

## 🎯 Usage

### Language Detection Priority
1. **URL Parameter**: `?lng=it`, `?lng=ru`, `?lng=en`
2. **Cookie**: `eli6_language` cookie
3. **Browser Language**: `navigator.language`
4. **Default**: English (`en`)

### Static Content Translation

Add `data-i18n` attributes to HTML elements:

```html
<!-- Navigation -->
<a href="index.html" data-i18n="nav.home">Home</a>
<a href="movies.html" data-i18n="nav.movies">Movies</a>

<!-- Section titles -->
<h2 data-i18n="movies.sections.trending">Trending Movies</h2>

<!-- Buttons -->
<button data-i18n="home.hero.watchNow">Watch Now</button>
```

### Dynamic Content Translation

Add `data-dynamic-translate` and `data-original-text` attributes:

```html
<div class="movie-title" 
     data-dynamic-translate="true" 
     data-original-text="The Avengers">
    The Avengers
</div>

<p class="movie-overview" 
   data-dynamic-translate="true" 
   data-original-text="Earth's mightiest heroes...">
    Earth's mightiest heroes...
</p>
```

### Translation Keys Structure

```json
{
  "nav": {
    "home": "Home",
    "movies": "Movies",
    "tvshows": "TV Shows",
    "mylist": "My List"
  },
  "home": {
    "hero": {
      "watchNow": "Watch Now",
      "moreInfo": "More Info"
    },
    "sections": {
      "trending": "Trending Now",
      "popular": "Popular"
    }
  },
  "movies": {
    "sections": {
      "trending": "Trending Movies",
      "popular": "Popular Movies"
    }
  },
  "common": {
    "loading": "Loading...",
    "error": "Error"
  }
}
```

## 🔌 API Endpoints

### Translation API (Backend)

#### Single Text Translation
```http
POST /api/translation/translate
Content-Type: application/json

{
  "text": "Hello World",
  "targetLanguage": "it"
}
```

#### Batch Translation
```http
POST /api/translation/translate-batch
Content-Type: application/json

{
  "texts": ["Text 1", "Text 2", "Text 3"],
  "targetLanguage": "ru"
}
```

#### Get Supported Languages
```http
GET /api/translation/languages
```

## 🧪 Testing

### Test Page
Visit `frontend/test-i18n.html` to test the i18n system:

- **Static Content Test**: Verify JSON-based translations
- **Dynamic Content Test**: Verify LibreTranslate API integration
- **Language Switching**: Test URL parameters and language switcher
- **API Connection**: Verify backend translation endpoints

### Test URLs
- `test-i18n.html?lng=en` - English
- `test-i18n.html?lng=it` - Italian
- `test-i18n.html?lng=ru` - Russian

## 🎨 Language Switcher

The language switcher automatically appears in the navigation bar and includes:

- **Current language display** with flag icon
- **Dropdown menu** with all supported languages
- **Active state indication** for current language
- **Smooth animations** and hover effects

## 🔄 How It Works

### 1. Initialization
```javascript
// Automatically initialized when i18n.js loads
const i18n = new I18nManager();
```

### 2. Language Detection
```javascript
// Detects language from multiple sources
i18n.detectLanguage();
```

### 3. Static Translation
```javascript
// Loads JSON translations and applies to DOM
await i18n.loadTranslations();
i18n.translateStaticContent();
```

### 4. Dynamic Translation
```javascript
// Observes DOM changes and translates dynamic content
i18n.setupDynamicTranslationObserver();
await i18n.translateDynamicElements();
```

### 5. Language Switching
```javascript
// Changes language and re-translates content
await i18n.changeLanguage('it');
```

## 🛠️ Customization

### Adding New Languages

1. **Create translation file**:
   ```bash
   cp frontend/locales/en.json frontend/locales/es.json
   ```

2. **Update i18n.js**:
   ```javascript
   this.supportedLanguages = ['en', 'it', 'ru', 'es'];
   this.languageNames = {
     'en': 'English',
     'it': 'Italiano',
     'ru': 'Русский',
     'es': 'Español'
   };
   ```

3. **Update backend language mapping**:
   ```javascript
   const languageCodeMap = {
     'en': 'en',
     'it': 'it',
     'ru': 'ru',
     'es': 'es'
   };
   ```

### Adding New Translation Keys

1. **Add to all locale files**:
   ```json
   {
     "newSection": {
       "newKey": "New Translation"
     }
   }
   ```

2. **Use in HTML**:
   ```html
   <span data-i18n="newSection.newKey">New Translation</span>
   ```

## 🐛 Troubleshooting

### Common Issues

1. **Translations not loading**:
   - Check browser console for errors
   - Verify locale files exist and are valid JSON
   - Ensure backend server is running

2. **Dynamic content not translating**:
   - Verify LibreTranslate API is accessible
   - Check network requests in browser dev tools
   - Ensure `data-dynamic-translate` attributes are present

3. **Language switcher not appearing**:
   - Check if navbar has `.nav-icons` container
   - Verify i18n.js is loaded before DOM manipulation

### Debug Mode

Enable debug logging in `i18n.js`:
```javascript
// Add to I18nManager constructor
this.debug = true;
```

## 📊 Performance Considerations

- **Batch translation**: Multiple texts translated in single API call
- **Caching**: Translation results cached to avoid duplicate requests
- **Lazy loading**: Dynamic content translated only when needed
- **Error handling**: Graceful fallback to original text on API failures

## 🔒 Security Notes

- **No API key required**: LibreTranslate is free and open-source
- **Rate limiting**: Built-in delays to respect API limits
- **Error handling**: Secure fallback mechanisms
- **CORS**: Properly configured for cross-origin requests

## 📝 License

This i18n system is part of the ELI6 Movies project and uses:
- **LibreTranslate**: Open-source translation API
- **node-fetch**: MIT License
- **Custom implementation**: Project-specific code

## 🤝 Contributing

To add new languages or improve translations:

1. Fork the repository
2. Add new locale files
3. Update translation keys
4. Test with the test page
5. Submit a pull request

---

**🌐 Happy Internationalization!** 🎬 