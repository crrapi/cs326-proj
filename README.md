# Stock Portfolio Visualizer

## Team 9

## Project Description

### Problem
Most stock visualization tools lack intuitive representations of portfolio performance. Traditional stock charts can be difficult to interpret at a glance, especially when trying to understand how multiple stocks contribute to overall portfolio performance. Investors often struggle to quickly assess their portfolio's composition and performance without diving into complex charts and data tables.

### Solution
Our Stock Portfolio Visualizer creates a more intuitive way to visualize stock portfolios using p5.js and/or HTML canvas. By assigning different colors to each stock and layering them in a unified view, investors can instantly understand their portfolio composition and performance trends. This approach transforms complex financial data into an easy-to-interpret visual representation.

### Key Features
- Portfolio Input: Users can input their stock purchases (ticker symbol, quantity, purchase date, and price)
- Data Integration: Connects to stock APIs to fetch current and historical price data
- Persistent Storage: Saves portfolio information in a SQLite database using Sequelize for easy access and management.
- **Robust API Endpoints:** Implemented server-side validation using Zod (e.g., for `POST /api/holdings`) to ensure data integrity. This includes checks for required fields and specific data types, returning clear `400 Bad Request` error messages for invalid input (e.g., `{ error: "Quantity must be a positive integer" }` for non-positive integer quantities).
- Intuitive Visualization: Uses p5.js to create color-coded, layered visualizations that show how each stock contributes to overall portfolio performance
- Performance Metrics: Displays key portfolio statistics and metrics to complement the visual representation

### Why This Project?
As investors ourselves, we understand the challenge of quickly assessing portfolio performance without getting lost in numbers and traditional charts. Our visualization approach provides a "quick glance" solution that gives investors immediate insight into their portfolio's composition and performance. This tool bridges the gap between complex financial data and intuitive visual understanding, helping investors make more informed decisions with less effort.

## Team Members

### Roman Pisani
Role: Backend Developer & UI Designer
- Issues:
  1. Design and implement database schema for storing portfolio data (SQLite & Sequelize).
  2. Create p5.js visualization component for stock portfolio rendering.
  3. Develop CSS styling and branding elements for consistent user experience.
  4. **Implement server-side input validation for API endpoints (e.g., using Zod for the `/api/holdings` route) to ensure data integrity and provide specific error feedback, including Postman tests for verification.** (Milestone 7)

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

# UI Designs

All our UI designs can be found at the following excalidraw document:

https://link.excalidraw.com/l/81G1x30cW02/79UafFrxW9H

# Database Designs:

The database designs can also be found at the excalidraw document, in a visual fashion.