# CodeForge

A production-ready coding tutorial & project showcase platform built on **React + Vite** (frontend) and **Cloudflare Workers + D1** (backend).

One administrator manages everything — posts, categories, tags, comments, code files, live previews, SEO and ads — from a secure admin panel. No public registration.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Admin Panel](#admin-panel)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)
- [Security](#security)
- [SEO & AdSense](#seo--adsense)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### Public Site
- Premium, mobile-first homepage with hero carousel, featured posts, latest posts, trending list and category chips
- Dynamic post cards with thumbnail, title, description, category, tags, date and views
- Individual post pages with breadcrumb, author, reading time, thumbnail, article body, image gallery, YouTube embed, features list, technologies, live preview, source code blocks, tags, related posts and comments
- Dynamic categories and tags, both with public listing pages
- Full-text search across titles, descriptions, article bodies, categories and tags
- View counter with per-visitor, per-day deduplication powering the trending list
- Dark mode / light mode / system preference, persisted in `localStorage`
- Fully responsive (mobile drawer nav, sidebar on side, hidden on mobile)
- Accessible — semantic HTML, skip link, ARIA labels, keyboard navigation, focus states
- Built-in policy pages: About, Contact, Privacy Policy, Terms, Disclaimer, Cookie Policy, 404

### Comments
- Public comment form on every post
- Name, email, comment validation
- Honeypot field for spam protection
- Rate limiting (3 comments per IP per hour)
- Auto-approve toggle or manual moderation
- Admin moderation panel — approve, reject, mark as spam, delete
- Email hashing (never store plain email)

### Admin Panel
- Single-admin authentication with PBKDF2-SHA256 password hashing and HMAC-signed session cookies
- One-time setup flow — setup form permanently disabled once account exists
- Dashboard with post/views/category/comment counts and recent posts table
- Full post editor with collapsible sections
- Rich-text article editor with headings, bold, italic, lists, links, images, quotes, code blocks, tables, inline YouTube embeds
- **Dynamic `+ Add` buttons** for images, source files, demo files, technologies and features — no hard-coded limits
- Thumbnail and article images accept **either** an image URL **or** a direct upload
- YouTube URL auto-parsed into safe embed
- Live Preview toggle with sandboxed iframe
- Download Project button that builds a real ZIP with folder structure preserved
- Category and tag CRUD with rename, delete and post counts
- Comments moderation with filters and search
- Site-wide settings: name, logo, favicon, description, author, contact, socials, footer, SEO defaults, AdSense, comments toggles
- Change password from settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6 |
| Styling | Custom CSS with design tokens (no Tailwind, no Bootstrap, no UI library) |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Assets | Cloudflare Assets binding (serves the Vite build) |
| Auth | PBKDF2-SHA256 via Web Crypto + HMAC-signed cookies |
| Sanitization | Cloudflare `HTMLRewriter` |
| ZIP generation | Custom dependency-free ZIP writer in browser |

No PHP, no MySQL, no Node.js backend, no Express, no Laravel, no R2, no Firebase, no Supabase.

---

## Architecture

