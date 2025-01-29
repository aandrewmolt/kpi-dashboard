# SF KPI Frontend

The frontend application for the SF KPI Dashboard, built with React, TypeScript, and Material-UI.

## Features

- Modern, responsive UI
- Real-time data visualization
- Advanced filtering and search
- TypeScript for better type safety
- Material-UI components
- Recharts for data visualization

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Environment Setup

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:3001
```

### Installation

```bash
npm install
```

### Available Scripts

#### `npm start`

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

#### `npm test`

Launches the test runner in interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder.

#### `npm run lint`

Runs ESLint to check for code style issues.

#### `npm run lint:fix`

Automatically fixes ESLint issues where possible.

## Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard/       # Dashboard components
│   ├── Incidents/       # Incident management
│   ├── Jobs/           # Job management
│   ├── Layout/         # Layout components
│   ├── Operators/      # Operator management
│   └── Pads/           # Pad management
├── config.ts           # Application configuration
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

## Component Guidelines

- Use TypeScript interfaces for props
- Implement error boundaries where appropriate
- Use Material-UI theme for consistent styling
- Implement responsive design using Material-UI breakpoints
- Use proper TypeScript types for all variables and functions

## State Management

- Use React hooks for local state
- Implement proper error handling
- Use TypeScript for type safety
- Follow React best practices for state updates

## Styling

- Use Material-UI's styling solution
- Follow the established theme
- Implement responsive design
- Use proper TypeScript types for styled components

## Error Handling

- Implement proper error boundaries
- Display user-friendly error messages
- Log errors appropriately
- Handle API errors gracefully

## Testing

- Write unit tests for components
- Test error scenarios
- Test responsive behavior
- Test user interactions

## Build and Deployment

- Ensure all environment variables are set
- Run linting before build
- Check for TypeScript errors
- Optimize bundle size

## Contributing

1. Follow the established code style
2. Write meaningful commit messages
3. Update documentation as needed
4. Add appropriate tests
5. Use TypeScript properly
