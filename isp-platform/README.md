# ISP Operations Platform

A unified, professional web-based ISP Operations Platform that fully integrates Live Fibre Infrastructure Mapping, CRM, Network/Router-Level Client Data, and Field Engineering Activity Records.

![ISP Platform](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## 🚀 Features

### Core Principle
**Everything is connected.** Every client in the CRM exists on the map. Every fibre core is tracked. Map and CRM are two views of the same data.

### Key Capabilities

- **🗺️ Live Fibre Infrastructure Mapping**
  - Leaflet + OpenStreetMap integration (no API key required)
  - MST boxes, poles, manholes, and client premises visualization
  - Auto-drawn fibre routes between infrastructure points
  - Real-time capacity visualization

- **👥 CRM (Customer Relationship Management)**
  - Complete client management with network integration
  - PPPoE credentials, VLAN, OLT/PON tracking
  - Service plans and speed management
  - Optical power monitoring

- **🔗 Fibre Core Management**
  - Standard fiber color codes (Blue, Orange, Green, etc.)
  - Core status tracking (free/used/faulty/reserved)
  - Splicing record management
  - Automatic core generation for routes

- **📊 Network Monitoring**
  - Client online/offline status
  - MST capacity monitoring
  - Optical power alerts
  - Faulty core tracking

- **📝 Activity Logging**
  - Complete audit trail
  - Before/after state tracking
  - User attribution
  - Location-tagged records

- **⚡ Real-time Updates**
  - WebSocket-based live synchronization
  - Prevents double-using fibre cores
  - Instant capacity updates

## 🏗️ Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js 18, TypeScript, Tailwind CSS |
| State Management | Zustand |
| Map Engine | Leaflet + OpenStreetMap |
| Backend | Python, FastAPI |
| Database | PostgreSQL with PostGIS |
| Real-time | WebSockets |

### Project Structure

```
isp-platform/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── models/        # Database models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── core/          # Configuration & security
│   │   └── websocket/     # WebSocket manager
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API & WebSocket services
│   │   ├── store/         # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # Tailwind CSS
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ with PostGIS extension

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/isp_platform"
export SECRET_KEY="your-secret-key-here"

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API URL (if needed)

# Run development server
npm run dev
```

### Database Setup

```sql
-- Create database
CREATE DATABASE isp_platform;

-- Connect to database
\c isp_platform

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Seed Demo Data

```bash
# After starting the backend, seed demo data
curl -X POST http://localhost:8000/api/seed/demo
```

## 📱 Screenshots

### Dashboard
The main dashboard provides an overview of network statistics, client status, and recent activity.

### Network Map
Interactive map showing all infrastructure, fibre routes, and client connections with real-time updates.

### Client Management
Complete CRM with network integration - every client is linked to their physical network path.

### MST Management
Track MST box capacity, splitter ports, and connected clients.

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| Super Admin | Full system access |
| ISP Admin | Management access |
| Field Engineer | Create/edit operations |
| NOC Viewer | Read-only access |

### Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Super Admin |
| engineer | engineer123 | Field Engineer |
| noc | noc123 | NOC Viewer |

## 📡 API Documentation

Once the backend is running, access the API documentation at:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### Key Endpoints

```
# Authentication
POST /api/auth/login
POST /api/auth/register

# Clients
GET    /api/clients/
POST   /api/clients/
GET    /api/clients/{id}
PUT    /api/clients/{id}
DELETE /api/clients/{id}
POST   /api/clients/{id}/connect-mst

# MST Boxes
GET    /api/mst/
POST   /api/mst/
GET    /api/mst/{id}
PUT    /api/mst/{id}
DELETE /api/mst/{id}

# Fibre Routes
GET    /api/fibre/routes
POST   /api/fibre/routes
GET    /api/fibre/routes/{id}/cores

# Map
GET    /api/map/markers
GET    /api/map/routes
GET    /api/map/client/{id}/path

# Dashboard
GET    /api/dashboard/stats
GET    /api/dashboard/network-summary
GET    /api/dashboard/alerts
```

## 🔄 WebSocket Events

Connect to `ws://localhost:8000/ws` for real-time updates:

```javascript
// Authentication
{ "type": "auth", "token": "your-jwt-token" }

// Received events
{ "type": "client_update", "data": {...} }
{ "type": "mst_update", "data": {...} }
{ "type": "fibre_update", "data": {...} }
{ "type": "activity_log", "data": {...} }
{ "type": "alert", "data": {...} }
```

## 🎨 Fibre Core Colors

Standard fiber color codes are implemented:

| Core # | Color | Hex |
|--------|-------|-----|
| 1 | Blue | #3b82f6 |
| 2 | Orange | #f97316 |
| 3 | Green | #22c55e |
| 4 | Brown | #a16207 |
| 5 | Slate | #64748b |
| 6 | White | #f8fafc |
| 7 | Red | #ef4444 |
| 8 | Black | #171717 |
| 9 | Yellow | #eab308 |
| 10 | Violet | #8b5cf6 |
| 11 | Rose | #f43f5e |
| 12 | Aqua | #06b6d4 |

## 📋 Roadmap

- [ ] Mobile responsive improvements
- [ ] Offline mode for field engineers
- [ ] Advanced reporting and analytics
- [ ] Integration with OLT systems
- [ ] Automated network topology discovery
- [ ] Customer portal

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with modern technologies for ISP professionals who need a unified view of their network infrastructure.
