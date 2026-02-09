# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive playground for experimenting with GraphAI graphs. Vue 3 web application for building and testing graph workflows.

## Commands

```bash
yarn serve      # Start Vite dev server
yarn build      # Build for production (vue-tsc && vite build)
yarn lint       # Run ESLint
yarn format     # Format with Prettier
```

## Architecture

- Vue 3 + Vite + TypeScript
- `src/components/` - Vue components
- `src/router/` - Vue Router configuration
- `src/config/` - Application configuration
- `src/i18n/` - Internationalization
- Uses Vue Composition API
