# VERCEL QUICK REFERENCE

## Your Deployment Commands

### First Deployment (what's running now)
```bash
npx vercel --prod
```

### Future Deployments
```bash
# Deploy to preview (for testing)
npx vercel

# Deploy to production
npx vercel --prod

# Deploy with specific name
npx vercel --name="treys-dashboard"
```

## Useful Vercel Commands

### Check Deployment Status
```bash
npx vercel list
```

### View Logs
```bash
npx vercel logs [deployment-url]
```

### Set Environment Variables
```bash
npx vercel env add
```

### Link to Git Repository
```bash
npx vercel link
```

### Remove Deployment
```bash
npx vercel remove [deployment-url]
```

## Automatic Deployments
Once connected to GitHub:
- Every push to `main` → Production deployment
- Every PR → Preview deployment with unique URL

## Custom Domain Setup
1. Go to Vercel Dashboard
2. Settings → Domains
3. Add your domain
4. Update DNS records as instructed

## Performance Monitoring
Vercel Dashboard provides:
- Real User Metrics (Web Vitals)
- Build & Function logs
- Analytics (with Pro plan)

## Troubleshooting

### If deployment fails:
1. Check build logs in Terminal
2. Verify `npm run build` works locally
3. Check for missing environment variables
4. Ensure all dependencies are in package.json

### If PWA doesn't work:
1. Verify HTTPS is enabled (automatic)
2. Check manifest.json is served
3. Test service worker registration
4. Use Chrome DevTools → Application tab

### Common Issues & Fixes:
- **404 on routes**: Add vercel.json with rewrites
- **Large bundle**: Check for unused dependencies
- **Slow build**: Use caching, optimize imports
- **CORS issues**: Configure headers in vercel.json

## Your Project Info
- **Framework**: Vite
- **Output**: dist folder
- **Build Command**: npm run build
- **Install Command**: npm install
- **Node Version**: 18.x or higher
