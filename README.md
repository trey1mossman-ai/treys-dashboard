# Agenda Dashboard

A professional, neon-tasteful agenda dashboard with workflow tools, fitness tracking, and PWA capabilities.

## Features

- ✅ **Agenda Management**: Editable schedule with timeline view, live progress tracking, and per-day checkboxes
- ✅ **Workflow Hub**: Compose and send emails/SMS/WhatsApp, AI agent chat interface
- ✅ **Fitness & Nutrition**: Track workouts and meals with progress indicators
- ✅ **PWA Support**: Installable on mobile and desktop
- ✅ **Dark Theme**: Glowy neon accents with excellent accessibility
- ✅ **Data Persistence**: LocalStorage with import/export capabilities
- ✅ **Desktop App**: Optional Tauri wrapper for native Mac app

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui components
- **State**: Zustand
- **Validation**: Zod
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa with Workbox
- **Desktop**: Tauri (optional)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
/
├── src/
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature modules (agenda, workflows, fitness)
│   ├── pages/           # Route pages
│   ├── services/        # API service layers
│   ├── state/           # Zustand stores
│   ├── lib/             # Utilities and helpers
│   ├── hooks/           # Custom React hooks
│   └── styles/          # Global styles and theme
├── functions/           # Serverless function examples
│   ├── cloudflare/     # Cloudflare Workers
│   └── netlify/        # Netlify Functions
├── tauri/              # Desktop app configuration
└── public/             # Static assets and PWA manifest
```

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Add your API keys (only for serverless functions, not frontend)
3. Deploy serverless functions to your chosen platform

## Deployment

### Web App

**Netlify**:
```bash
# Build command
pnpm build

# Publish directory
dist

# Functions directory
functions/netlify
```

**Cloudflare Pages**:
```bash
# Build command
pnpm build

# Build output directory
dist

# Functions directory
functions/cloudflare
```

### Desktop App

```bash
cd tauri
pnpm tauri build
```

## API Endpoints

All sensitive operations go through serverless functions:

- `POST /api/agent/relay` - AI agent chat
- `POST /api/email/send` - Send email
- `POST /api/sms/send` - Send SMS
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/fitness/today` - Get today's workout
- `GET /api/nutrition/today` - Get today's nutrition plan

## Features in Detail

### Agenda
- Timeline view with current time indicator
- Click items to edit, checkbox to mark complete
- Auto-scrolls to "now" on load
- Progress bar shows day completion
- Data persists per day in localStorage

### Workflows
- **Message Composer**: Email/SMS/WhatsApp with provider selection
- **AI Chat**: Conversational interface with streaming support (ready)
- **Quick Actions**: Customizable shortcuts for common tasks

### Fitness & Nutrition
- Track workout exercises with sets/reps/weight
- Monitor meal intake with macro tracking
- Visual progress indicators
- Per-item completion toggles

### Settings
- Theme toggle (dark/light)
- Schedule configuration (day start/end hours)
- Data export/import
- Clear all data option

## PWA Features

- Offline support with service worker
- Install prompts on compatible devices
- App-like experience on mobile
- Automatic updates

## Security Notes

- API keys are never exposed to frontend
- All sensitive operations go through serverless functions
- Environment variables use `VITE_` prefix for public config only
- Secrets stay in deployment platform environment

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## License

MIT