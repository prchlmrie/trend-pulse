# TrendPulse Frontend

A modern React application built with Vite that provides a user interface for the TrendPulse trend intelligence platform. This frontend connects to the FastAPI backend to display trend analysis, recommendations, and insights.

## Features

- **Dashboard**: Command center with trend lifecycle overview, opportunities, alerts, and confidence metrics
- **Trend Explorer**: Browse and search trends with advanced filtering capabilities
- **Trend Detail**: In-depth analysis of individual trends including time series data and keyword clusters
- **Opportunity Finder**: Budget-based product recommendations and strategy generation
- **Responsive Design**: Mobile-friendly interface with modern UI components

## Tech Stack

- **React 19**: Latest React with modern hooks and concurrent features
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing for single-page application
- **Lucide React**: Beautiful icon library
- **ESLint**: Code linting and formatting

## Project Structure

```
frontend/
  src/
    components/          # Reusable UI components
      Badge.jsx         # Status badges
      Button.jsx        # Custom button component
      Card.jsx          # Card layout component
      CommandCenter.jsx # Main dashboard view
      GenerateStrategyPanel.jsx # Strategy generation UI
      Layout.jsx        # App layout with navigation
      OpportunityFinder.jsx # Budget recommendations
      TrendDetail.jsx   # Individual trend analysis
      TrendExplorer.jsx # Trend browsing interface
    api/
      client.js         # API client for backend communication
    utils/
      formatters.js     # Data formatting utilities
    App.jsx             # Main app component with routing
    main.jsx            # App entry point
  public/               # Static assets
  package.json          # Dependencies and scripts
  vite.config.js        # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Running TrendPulse backend server on `http://localhost:8000`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## API Integration

The frontend communicates with the TrendPulse backend API through the `src/api/client.js` module. All API calls are centralized here for easy maintenance and testing.

Key API endpoints used:
- `/dashboard/summary` - Dashboard metrics
- `/trends` - Trend listing and search
- `/trends/{id}` - Individual trend details
- `/opportunities/analyze` - Budget recommendations
- `/notifications` - Alert feed

## Component Architecture

- **Layout**: Provides consistent navigation and structure
- **CommandCenter**: Main dashboard with key metrics and alerts
- **TrendExplorer**: Searchable trend list with filters
- **TrendDetail**: Detailed trend analysis view
- **OpportunityFinder**: Recommendation engine interface

## Development

This project uses modern React patterns including:
- Functional components with hooks
- Custom hooks for data fetching
- Responsive CSS with utility classes
- Component composition for reusability

## Contributing

1. Follow the existing code style and component patterns
2. Add proper TypeScript types (when applicable)
3. Test components across different screen sizes
4. Ensure API calls handle errors gracefully
