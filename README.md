# SIAPUS Frontend (Attendance System with CCTV)

**SIAPUS (Sistem Informasi Absensi Pustek)** is a modern, responsive, and feature-rich attendance management system built for schools. This frontend application is a Progressive Web App (PWA) designed to provide a seamless experience for Students, Teachers, Admins, and Security (Piket) staff across all devices.

## 🌟 Key Features

- **Role-Based Dashboards:** Unique, tailored interfaces for Admins, Teachers, Students, and Piket staff.
- **Mobile-First Experience:** A highly optimized mobile view featuring native-feeling horizontal carousels, swipeable tabs, and progressive web app (PWA) capabilities.
- **Advanced Attendance Methods:** Support for multiple check-in workflows based on dynamic rules:
  - 📷 **QR Code Scanning**
  - 📍 **GPS / Geolocation Check-in**
  - 🤳 **Selfie / Photo Verification**
- **Dynamic Scheduling Roadmap:** A real-time timeline for students and teachers showing expected gate scans, classes, break times, schedule overrides, and holidays.
- **Gate & CCTV Monitoring:** Dedicated dashboards for security and admins to monitor live gate attendance and integrate with CCTV feeds.
- **Complex Rule Engine:** Handles nuanced attendance policies including late tolerances, early leave thresholds, auto-alfa (absent) calculations, and substitute teacher assignments.
- **Premium UI/UX:** Built with Tailwind CSS v4 featuring glassmorphism, animated metrics cards, framer-motion page transitions, and dark mode support.

## 🛠 Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management & Data Fetching:** React Query (TanStack Query)
- **Routing:** React Router
- **Animations:** Framer Motion
- **QR Code Scanning:** HTML5-QRCode
- **PWA Integration:** Vite PWA Plugin

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or later, Node 20.x recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd fe-attendance-system-with-cctv
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration:**
   Copy the `.env.example` to `.env` and configure your API endpoints.
   ```bash
   cp .env.example .env
   ```
   *Make sure `VITE_API_URL` points to your running backend instance.*

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The application will be available at `http://localhost:5173`.

## 📜 Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production (includes PWA service worker generation).
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint to find and fix problems in the code.

## 🏗 Project Structure

```
src/
├── api/             # API client services, types, and axios interceptors
├── assets/          # Static assets like images and global styles
├── components/      # Reusable UI components (Atomic design: atoms, molecules, organisms)
├── hooks/           # Custom React hooks (e.g., useAuth, useAttendance)
├── layout/          # Page layout wrappers (Sidebar, Header, Mobile view wrappers)
├── pages/           # Application route pages (Dashboard, History, Settings, etc.)
├── router/          # Route definitions and guarded routes configuration
└── utils/           # Helper functions and formatters
```

## 🎨 Design System

This project originally derived its foundation from the TailAdmin template but has been heavily customized and expanded to fit the specific needs of the SIAPUS ecosystem. We follow strict component modularity and use Tailwind's utility classes to maintain a consistent, premium aesthetic across both desktop and mobile viewports.

## 📄 License

This project is proprietary and confidential. Unauthorized copying of files from this repository, via any medium, is strictly prohibited.
