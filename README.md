# Frontend - Audio-Visual Synchrony Experiment

This folder contains the static frontend files for the psychology experiment.

## Files

- `index.html` - Main HTML page
- `experiment.js` - Experiment logic and UI interactions
- `style.css` - Styling
- `config.js` - API endpoint configuration
- `assets/` - Images and sounds for the experiment

## Deploying to GitHub Pages

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub, then:
git init
git add .
git commit -m "Initial commit - Psychology experiment frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings**
3. Scroll down to **Pages** section
4. Under **Source**, select `main` branch and `/root` folder
5. Click **Save**
6. Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

### Step 3: Configure API Endpoint

Before deploying, edit `config.js` and change the API_BASE_URL to your backend server:

```javascript
const API_BASE_URL = 'http://YOUR_SERVER_IP:3000';
// or
const API_BASE_URL = 'https://yourdomain.com';
```

**Important:** If using HTTP (not HTTPS), users may see browser warnings about mixed content if GitHub Pages uses HTTPS. Consider setting up HTTPS on your backend server (see backend README).

## Local Testing

To test locally, you can use any simple HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Configuration

Edit `config.js` to set your backend API URL:

- **Local development**: `http://localhost:3000`
- **Production**: Your server's public URL (e.g., `http://123.456.789.012:3000` or `https://api.yourserver.com`)
