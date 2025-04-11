# Stock Portfolio Visualizer

## Team 9

## Project Description

### Problem

Most stock visualization tools lack intuitive representations of portfolio performance. Traditional stock charts can be difficult to interpret at a glance, especially when trying to understand how multiple stocks contribute to overall portfolio performance. Investors often struggle to quickly assess their portfolio's composition and performance without diving into complex charts and data tables.

### Solution

Our Stock Portfolio Visualizer creates a more intuitive way to visualize stock portfolios using p5.js and/or HTML canvas. By assigning different colors to each stock and layering them in a unified view, investors can instantly understand their portfolio composition and performance trends. This approach transforms complex financial data into an easy-to-interpret visual representation.

### Key Features

- **Portfolio Input**: Users can input their stock purchases (ticker symbol, quantity, purchase date, and price).
- **Dynamic Content Updates**: The portfolio list and visualizations dynamically update as users add, edit, or delete stocks.
- **Form Validation**: Real-time validation for stock input forms, including ticker symbol, quantity, purchase date, and price.
- **Multi-View Navigation**: Seamless navigation between different views (e.g., portfolio visualization, stock details, settings) without page reloads.
- **Persistent Storage**: Saves portfolio information in IndexedDB for easy access and data persistence across sessions.
- **Asynchronous Data Handling**: Fetches mock stock data (e.g., historical prices) from a local JSON file to simulate API integration.
- **Intuitive Visualization**: Uses p5.js to create color-coded, layered visualizations that show how each stock contributes to overall portfolio performance.
- **Performance Metrics**: Displays key portfolio statistics and metrics to complement the visual representation.

### Why This Project?

As investors ourselves, we understand the challenge of quickly assessing portfolio performance without getting lost in numbers and traditional charts. Our visualization approach provides a "quick glance" solution that gives investors immediate insight into their portfolio's composition and performance. This tool bridges the gap between complex financial data and intuitive visual understanding, helping investors make more informed decisions with less effort.

## Team Members

### Roman Pisani

Role: Backend Developer & UI Designer

- Issues:
  1. Design and implement database schema for storing portfolio data.
  2. Create p5.js visualization component for stock portfolio rendering.
  3. Develop CSS styling and branding elements for consistent user experience.

### Christopher Rrapi

Role: API Integration Specialist

- Issues:
  1. Research and select appropriate stock market data API.
  2. Develop interface layer for communicating with selected stock API.
  3. Implement user authentication and account management system.

### Ram Koukuntla

Role: Frontend Developer & API Routes Implementer

- Issues:
  1. Create frontend user interface components (buttons, forms, inputs).
  2. Design and implement page layout and navigation structure.
  3. Develop Express API routes that connect frontend with database schema and stock API interface.

## Milestone #5 Updates

### New Features Implemented

- **Dynamic Content Updates**: Portfolio list and visualizations dynamically update without page reloads.
- **Form Validation**: Real-time validation for stock input forms with user feedback for errors.
- **Multi-View Navigation**: Implemented JavaScript-based navigation for seamless transitions between views.
- **Persistent Storage**: Integrated IndexedDB for storing portfolio data and user preferences.
- **Asynchronous Data Handling**: Fetches mock stock data from a local JSON file to simulate API integration.

### Updated Problem/Solution Alignment

The features implemented in this milestone directly address the problem of complex and unintuitive stock visualization tools by providing:

- Real-time updates to portfolio data and visualizations.
- Persistent storage for user data, ensuring a seamless experience across sessions.
- A multi-view interface for better organization and navigation.

### Team Member Updates

- No changes to team members or roles.

## UI Designs

All our UI designs can be found at the following Excalidraw document:

[UI Designs](https://link.excalidraw.com/l/81G1x30cW02/79UafFrxW9H)

## Database Designs

The database designs can also be found at the Excalidraw document, in a visual fashion.
