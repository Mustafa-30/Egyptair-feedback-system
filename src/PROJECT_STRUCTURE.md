# 📁 Project Structure

## Overview

This document describes the organization of the Egypt Air Customer Sentiment Analysis project.

## Directory Structure

```
egyptair-sentiment-analysis/
│
├── src/                        # Source code
│   ├── assets/                 # Static assets (images, fonts, etc.)
│   │   └── *.png              # Logo and images
│   │
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components (shadcn/ui based)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (other UI components)
│   │   │
│   │   ├── Dashboard.tsx          # Main dashboard with stats & charts
│   │   ├── FeedbackList.tsx       # Feedback listing with filters
│   │   ├── FeedbackDetailModal.tsx # Detailed feedback view
│   │   ├── Layout.tsx             # App layout wrapper with navigation
│   │   ├── LoginPage.tsx          # Authentication page
│   │   ├── Reports.tsx            # Analytics and reports
│   │   ├── Settings.tsx           # Application settings
│   │   ├── UploadFeedback.tsx     # CSV/Excel upload
│   │   └── UserManagement.tsx     # User administration
│   │
│   ├── contexts/              # React Context providers
│   │   └── AuthContext.tsx    # Authentication state management
│   │
│   ├── data/                  # Data layer
│   │   └── mockData.ts        # Mock data for development
│   │
│   ├── lib/                   # Shared libraries & utilities
│   │   ├── constants.ts       # Application constants
│   │   ├── utils.ts           # Utility functions
│   │   └── index.ts           # Library exports
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # Global type declarations
│   │
│   ├── App.tsx                # Main application component
│   ├── main.tsx               # Application entry point
│   ├── index.css              # Global styles (Tailwind CSS)
│   ├── vite-env.d.ts          # Vite environment types
│   └── README.md              # Source code documentation
│
├── public/                    # Public assets (served as-is)
│   └── vite.svg               # Vite logo
│
├── node_modules/              # Dependencies (auto-generated)
│
├── index.html                 # HTML entry point
├── package.json               # Project dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── tsconfig.node.json         # TypeScript config for Vite
├── vite.config.ts             # Vite build configuration
├── INSTALL_AND_RUN.bat        # Windows batch installer
├── INSTALL_AND_RUN.ps1        # PowerShell installer
├── SETUP_GUIDE.html           # Visual setup guide
└── README.md                  # Project README
```

## Component Hierarchy

```
App.tsx
└── AuthProvider
    ├── LoginPage (if not authenticated)
    └── Layout (if authenticated)
        ├── Sidebar Navigation
        ├── Header
        └── Page Content
            ├── Dashboard
            ├── UploadFeedback
            ├── FeedbackList
            │   └── FeedbackDetailModal
            ├── Reports
            ├── UserManagement (Supervisor only)
            └── Settings
```

## File Responsibilities

### Core Files

| File            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `main.tsx`      | Application entry point, renders App component     |
| `App.tsx`       | Root component, handles routing and authentication |
| `index.css`     | Global styles, Tailwind CSS configuration          |
| `vite-env.d.ts` | TypeScript declarations for Vite & assets          |

### Components

| Component                 | Description                          | Access Level     |
| ------------------------- | ------------------------------------ | ---------------- |
| `Dashboard.tsx`           | Main analytics dashboard with charts | All users        |
| `LoginPage.tsx`           | User authentication                  | Public           |
| `Layout.tsx`              | App shell with navigation            | All users        |
| `FeedbackList.tsx`        | Browse and filter feedback           | All users        |
| `FeedbackDetailModal.tsx` | View single feedback details         | All users        |
| `UploadFeedback.tsx`      | Upload CSV/Excel files               | All users        |
| `Reports.tsx`             | Generate and export reports          | All users        |
| `UserManagement.tsx`      | Manage users                         | Supervisors only |
| `Settings.tsx`            | Application configuration            | All users        |

### Contexts

| Context           | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `AuthContext.tsx` | Manages authentication state, user info, login/logout |

### Data

| File          | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `mockData.ts` | Sample sentiment analysis data for development |

### Types

| File             | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `types/index.ts` | TypeScript interfaces: User, Feedback, Sentiment, etc. |

### Library

| File               | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `lib/constants.ts` | App constants: colors, routes, API endpoints, messages  |
| `lib/utils.ts`     | Utility functions: date formatting, exports, validation |
| `lib/index.ts`     | Central export point for library functions              |

## Naming Conventions

### Files

- **Components:** PascalCase (e.g., `Dashboard.tsx`, `FeedbackList.tsx`)
- **Utilities:** camelCase (e.g., `utils.ts`, `constants.ts`)
- **Types:** camelCase with .ts extension (e.g., `index.ts`)

### Code

- **Components:** PascalCase (e.g., `export function Dashboard()`)
- **Functions:** camelCase (e.g., `formatDate()`, `getSentimentColor()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `APP_NAME`, `USER_ROLES`)
- **Interfaces:** PascalCase (e.g., `interface User`, `type Sentiment`)

## Import Structure

Recommended import order:

```typescript
// 1. React imports
import { useState, useEffect } from "react";

// 2. Third-party libraries
import { PieChart, Pie, Cell } from "recharts";

// 3. Local contexts
import { useAuth } from "@/contexts/AuthContext";

// 4. Local components
import { Button } from "@/components/ui/button";

// 5. Local utilities & constants
import { formatDate, COLORS } from "@/lib";

// 6. Types
import type { Feedback, Sentiment } from "@/types";

// 7. Styles (if needed)
import "./custom-styles.css";
```

## Code Organization Best Practices

### 1. Component Structure

```typescript
// Imports
import { ... } from '...';

// Types/Interfaces
interface ComponentProps {
  ...
}

// Main Component
export function Component({ props }: ComponentProps) {
  // State
  const [state, setState] = useState();

  // Contexts
  const { user } = useAuth();

  // Effects
  useEffect(() => { ... }, []);

  // Handlers
  const handleClick = () => { ... };

  // Render helpers
  const renderSection = () => { ... };

  // JSX
  return (
    ...
  );
}
```

### 2. Keep Components Focused

- Each component should have a single responsibility
- Extract logic into custom hooks when needed
- Use composition over inheritance

### 3. Type Safety

- Always define TypeScript interfaces for props
- Use type annotations for function parameters
- Avoid `any` type when possible

## Future Additions

### Planned Directories

```
src/
├── hooks/              # Custom React hooks
│   ├── useFeedback.ts
│   └── useAnalytics.ts
│
├── services/           # API service layer
│   ├── api.ts
│   ├── auth.service.ts
│   └── feedback.service.ts
│
└── config/            # Configuration files
    ├── api.config.ts
    └── theme.config.ts
```

## Notes

- **UI Components** (`src/components/ui/`) are based on shadcn/ui and Radix UI
- **Mock Data** will be replaced with real API calls in production
- **Assets** should be optimized for web (compressed images)
- **Styling** uses Tailwind CSS utility classes via `index.css`

## Getting Started

For instructions on running the project, see the main `README.md` in the project root.

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Project:** Egypt Air Customer Sentiment Analysis System
