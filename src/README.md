# Egypt Air - Customer Sentiment Analysis System

## Source Code Structure

This directory contains the source code for the Egypt Air Customer Sentiment Analysis application.

### 📁 Directory Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (Radix UI based)
│   ├── Dashboard.tsx   # Main dashboard with analytics
│   ├── LoginPage.tsx   # Authentication page
│   ├── Layout.tsx      # App layout wrapper
│   ├── FeedbackList.tsx        # Feedback management
│   ├── FeedbackDetailModal.tsx # Feedback detail view
│   ├── UploadFeedback.tsx      # CSV/Excel upload
│   ├── Reports.tsx     # Analytics & reports
│   ├── Settings.tsx    # Application settings
│   └── UserManagement.tsx      # User administration
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── data/              # Mock data for development
│   └── mockData.ts    # Sample sentiment data
├── types/             # TypeScript type definitions
│   └── index.ts       # Type declarations
├── assets/            # Static assets (images, etc.)
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
├── index.css          # Global styles & Tailwind CSS
└── vite-env.d.ts      # Vite environment types
```

### 🎨 Key Components

#### **Dashboard.tsx**

- Real-time sentiment statistics
- Interactive charts (pie chart, line chart)
- Recent feedback overview
- Sentiment distribution visualization

#### **LoginPage.tsx**

- User authentication
- Role-based access (Agent/Supervisor)
- Form validation

#### **FeedbackList.tsx**

- Paginated feedback listing
- Search and filter functionality
- Sentiment and language filters
- Expandable detail view

#### **Reports.tsx**

- Sentiment trends analysis
- Language distribution charts
- Time-based analytics
- Export functionality

#### **UserManagement.tsx**

- User CRUD operations (Supervisor only)
- Role assignment
- Status management

#### **Settings.tsx**

- Model configuration
- Language preferences
- Export settings

### 🔧 Technical Details

**Framework:** React 18 with TypeScript  
**Build Tool:** Vite  
**Styling:** Tailwind CSS (via index.css)  
**UI Components:** Radix UI  
**Charts:** Recharts  
**Icons:** Lucide React  
**State Management:** React Context API

### 📊 Data Flow

1. **Authentication:** AuthContext manages user state
2. **Mock Data:** mockData.ts provides sample feedback for development
3. **Types:** TypeScript definitions ensure type safety
4. **Components:** Modular React components for each feature

### 🌐 Supported Languages

- **Arabic (AR):** Full RTL support
- **English (EN):** Native support
- **Mixed:** Bilingual feedback detection

### 🔐 User Roles

- **Agent:** View feedback, upload data, view reports
- **Supervisor:** Full access including user management

### 📝 Notes

- All data is currently mocked for development
- Real backend integration required for production
- Uses AraBERT-v2 model for sentiment analysis (placeholder)

### 🚀 Getting Started

See the main project README.md in the root directory for installation and running instructions.
