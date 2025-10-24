# Breeze: Content Calendar & Publishing Workflows

Breeze is a modern content calendar that keeps posts, channels, and approvals perfectly in sync across calendar and kanban views. It is built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people, and designed to feel like a polished production tool from the very first load.

## Highlights
- Channel-aware planning: Blog, LinkedIn, Instagram, X, and any custom channels you add
- Calendar and workflow board stay synchronized
- Drag cards onto dates to schedule, or between columns to update status
- Local persistence with browser storage so you never lose progress
- Clean, responsive UI with keyboard focus styles and WCAG-friendly contrast

## Getting Started
1. Open `index.html` for the landing experience
2. Click any CTA to open the app at `app.html`
3. Add channels and posts, drag to schedule, and switch between Calendar and Board

No build step is required. Everything runs in your browser.

## Tech Stack
- Tailwind CSS (via CDN)
- jQuery 3.7.x
- Vanilla HTML5 and modular JavaScript (no frameworks)

## File Structure
- index.html: marketing-focused landing page with diagonal hero and CTAs
- app.html: functional application (calendar and kanban views)
- styles/main.css: global CSS for polish and micro-interactions
- scripts/helpers.js: utilities, date helpers, and localStorage facade
- scripts/ui.js: UI rendering, events, drag-and-drop, and modals
- scripts/main.js: entry point orchestrating init and render
- assets/logo.svg: brand mark used in both pages

## Accessibility & UX
- Semantic HTML and ARIA roles on interactive areas
- Focus-visible outlines and touch-friendly targets
- Respects reduced motion by keeping animations subtle

## Persistence
All data is stored locally:
- Channels: `cc_channels`
- Posts: `cc_posts`
- Preferences (view, filters, month): `cc_prefs`

## Notes
- Default seed data is provided on first load
- Deleting a channel reassigns its posts to the first available channel
- Scheduling a draft or in-review item sets status to Scheduled automatically

Enjoy planning with clarity!
