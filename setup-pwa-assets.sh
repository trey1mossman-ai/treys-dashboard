#!/bin/bash

# Setup PWA Icons Script
# This script creates placeholder icons for PWA functionality
# Replace these with your actual app icons

echo "📱 Setting up PWA assets..."

# Create public directory if it doesn't exist
mkdir -p public

# Create a simple SVG icon as base
cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#6366f1"/>
  <text x="50" y="70" font-size="60" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">A</text>
</svg>
EOF

# Create different sized PNG placeholders using ImageMagick if available
if command -v convert &> /dev/null; then
    echo "🎨 Generating PNG icons from SVG..."
    
    # Generate various sizes
    convert -background none -density 384 public/favicon.svg -resize 32x32 public/favicon-32x32.png
    convert -background none -density 384 public/favicon.svg -resize 16x16 public/favicon-16x16.png
    convert -background none -density 384 public/favicon.svg -resize 64x64 public/pwa-64x64.png
    convert -background none -density 384 public/favicon.svg -resize 192x192 public/pwa-192x192.png
    convert -background none -density 384 public/favicon.svg -resize 512x512 public/pwa-512x512.png
    
    # Apple touch icons
    convert -background none -density 384 public/favicon.svg -resize 180x180 public/apple-touch-icon.png
    convert -background none -density 384 public/favicon.svg -resize 152x152 public/apple-touch-icon-152x152.png
    convert -background none -density 384 public/favicon.svg -resize 167x167 public/apple-touch-icon-167x167.png
    
    # Maskable icons (with padding)
    convert -background "#6366f1" -density 384 public/favicon.svg -resize 142x142 -gravity center -extent 192x192 public/pwa-maskable-192x192.png
    convert -background "#6366f1" -density 384 public/favicon.svg -resize 384x384 -gravity center -extent 512x512 public/pwa-maskable-512x512.png
    
    echo "✅ Icons generated successfully!"
else
    echo "⚠️  ImageMagick not found. Creating placeholder files..."
    
    # Create empty placeholder files
    touch public/favicon-32x32.png
    touch public/favicon-16x16.png
    touch public/pwa-64x64.png
    touch public/pwa-192x192.png
    touch public/pwa-512x512.png
    touch public/pwa-maskable-192x192.png
    touch public/pwa-maskable-512x512.png
    touch public/apple-touch-icon.png
    touch public/apple-touch-icon-152x152.png
    touch public/apple-touch-icon-167x167.png
    touch public/apple-touch-icon-180x180.png
    
    echo "⚠️  Placeholder files created. Please replace with actual icons."
    echo "💡 Install ImageMagick to auto-generate icons: brew install imagemagick"
fi

# Create offline.html fallback page
cat > public/offline.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Agenda Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 2rem;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #6366f1;
        }
        p {
            color: #888;
            line-height: 1.6;
        }
        button {
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
        }
        button:hover {
            background: #5558e3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📵 You're Offline</h1>
        <p>It looks like you've lost your internet connection.<br>
        Some features may be unavailable until you're back online.</p>
        <button onclick="window.location.reload()">Try Again</button>
    </div>
</body>
</html>
EOF

echo "📄 Created offline.html fallback page"

# Create robots.txt
cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
EOF

echo "🤖 Created robots.txt"

# Create .well-known directory for app associations
mkdir -p public/.well-known

# Create apple-app-site-association for iOS
cat > public/.well-known/apple-app-site-association << 'EOF'
{
  "applinks": {
    "apps": [],
    "details": []
  },
  "webcredentials": {
    "apps": []
  }
}
EOF

echo "🍎 Created apple-app-site-association"

echo ""
echo "✅ PWA assets setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Replace placeholder icons with your actual app icons"
echo "2. Run 'npm install' to install new dependencies"
echo "3. Run 'npm run dev' to test the PWA features"
echo "4. Test on a mobile device or use Chrome DevTools"
echo ""
echo "💡 Tips:"
echo "- Use https://realfavicongenerator.net to generate all icon sizes"
echo "- Test PWA installation on actual devices"
echo "- Check Lighthouse scores in Chrome DevTools"
EOF

chmod +x setup-pwa-assets.sh