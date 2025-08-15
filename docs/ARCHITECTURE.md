# December AI Builder - Architecture Documentation

## Overview
December AI Builder is an AI-powered development platform that generates complete applications using Docker containers. This document outlines the hybrid architecture for production deployment.

## Current Architecture (Local Development)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Docker        │
│   (Next.js)     │◄──►│   (Express.js)  │◄──►│   Containers    │
│   Port: 3000    │    │   Port: 4000    │    │   Dynamic Ports │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Target Architecture (Production)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Vercel)      │◄──►│   (Railway)     │◄──►│   (PostgreSQL)  │
│   Static Host   │    │   Container API │    │   Metadata      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   File Storage  │
                       │   (Railway)     │
                       │   Project Files │
                       └─────────────────┘
```

## Component Details

### Frontend (Vercel)
- **Technology**: Next.js 15
- **Hosting**: Vercel (Static Site Generation)
- **Features**:
  - AI chat interface
  - Project management
  - Code editor integration
  - Live preview functionality

### Backend (Railway)
- **Technology**: Express.js with TypeScript
- **Hosting**: Railway (Container-based)
- **Features**:
  - Docker container management
  - AI integration (OpenRouter/Anthropic)
  - File system operations
  - Database interactions

### Database (PostgreSQL on Railway)
- **Purpose**: Container metadata and user management
- **Tables**:
  - `containers`: Container information and status
  - `users`: User authentication and profiles
  - `sessions`: User session management
  - `projects`: Generated project metadata

### File Storage (Railway Volumes)
- **Purpose**: Generated project files and assets
- **Structure**:
  - `/projects/{containerId}/`: Individual project files
  - `/templates/`: Base templates
  - `/exports/`: Exported projects

## Data Flow

### 1. Container Creation
```
User Request → Frontend → Backend API → Docker Build → Database Store → Response
```

### 2. AI Code Generation
```
User Chat → Frontend → Backend → AI Service → Code Generation → File System → Response
```

### 3. Project Management
```
User Action → Frontend → Backend → Database Query → File System → Response
```

## Security Considerations

### Authentication
- JWT-based authentication
- Session management via database
- Rate limiting on API endpoints

### CORS Configuration
- Frontend domain whitelist
- Secure cookie settings
- HTTPS enforcement

### API Security
- Input validation
- SQL injection prevention
- XSS protection

## Environment Variables

### Backend (Railway)
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
CORS_ORIGIN=https://your-app.vercel.app
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Deployment Strategy

### Phase 1: Backend Migration
1. Railway project setup
2. Database schema implementation
3. Docker service adaptation
4. Environment configuration

### Phase 2: Frontend Adaptation
1. API client updates
2. Environment variable integration
3. Build optimization
4. Vercel deployment

### Phase 3: Integration Testing
1. End-to-end testing
2. Performance optimization
3. Security validation
4. Production deployment

## Monitoring and Logging

### Backend Monitoring
- Railway built-in monitoring
- Application logs
- Database performance metrics
- Container health checks

### Frontend Monitoring
- Vercel Analytics
- Error tracking
- Performance monitoring
- User behavior analytics

## Backup and Recovery

### Database Backup
- Automated PostgreSQL backups
- Point-in-time recovery
- Data retention policies

### File Storage Backup
- Railway volume snapshots
- Cross-region replication
- Disaster recovery procedures

## Cost Optimization

### Railway Costs
- Container usage optimization
- Database connection pooling
- File storage compression

### Vercel Costs
- Static generation optimization
- Image optimization
- CDN utilization

## Future Enhancements

### Scalability
- Horizontal scaling
- Load balancing
- Caching strategies

### Features
- Multi-user support
- Team collaboration
- Advanced AI models
- Custom templates
