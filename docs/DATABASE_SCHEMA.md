# Database Schema Documentation

## Overview
PostgreSQL database schema for December AI Builder running on Railway. This database stores container metadata, user information, and project data.

## Database Tables

### 1. Users Table
Stores user authentication and profile information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 2. Containers Table
Stores Docker container metadata and status information.

```sql
CREATE TABLE containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id VARCHAR(255) UNIQUE NOT NULL, -- Docker container ID
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- created, running, stopped, deleted
    image_name VARCHAR(255),
    assigned_port INTEGER,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    labels JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_containers_container_id ON containers(container_id);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_containers_user_id ON containers(user_id);
CREATE INDEX idx_containers_created_at ON containers(created_at);
CREATE INDEX idx_containers_assigned_port ON containers(assigned_port);
```

### 3. Sessions Table
Manages user sessions and authentication.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);
```

**Indexes:**
```sql
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### 4. Projects Table
Stores project metadata and information.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) DEFAULT 'nextjs', -- nextjs, react, vue, etc.
    status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_projects_container_id ON projects(container_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
```

### 5. Chat Messages Table
Stores AI chat conversation history.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
```sql
CREATE INDEX idx_chat_messages_container_id ON chat_messages(container_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

### 6. File Storage Table
Tracks file storage metadata for generated projects.

```sql
CREATE TABLE file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);
```

**Indexes:**
```sql
CREATE INDEX idx_file_storage_container_id ON file_storage(container_id);
CREATE INDEX idx_file_storage_file_path ON file_storage(file_path);
```

## Database Functions

### Update Timestamp Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Triggers
```sql
-- Containers table
CREATE TRIGGER update_containers_updated_at 
    BEFORE UPDATE ON containers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Projects table
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- File storage table
CREATE TRIGGER update_file_storage_updated_at 
    BEFORE UPDATE ON file_storage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Database Views

### Active Containers View
```sql
CREATE VIEW active_containers AS
SELECT 
    c.*,
    p.name as project_name,
    p.description as project_description,
    u.email as user_email
FROM containers c
LEFT JOIN projects p ON c.id = p.container_id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.status IN ('running', 'created')
ORDER BY c.created_at DESC;
```

### User Projects View
```sql
CREATE VIEW user_projects AS
SELECT 
    p.*,
    c.status as container_status,
    c.assigned_port,
    c.url,
    COUNT(cm.id) as message_count
FROM projects p
LEFT JOIN containers c ON p.container_id = c.id
LEFT JOIN chat_messages cm ON c.id = cm.container_id
GROUP BY p.id, c.status, c.assigned_port, c.url
ORDER BY p.updated_at DESC;
```

## Migration Scripts

### Initial Migration
```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables (in order of dependencies)
-- Users table
-- Sessions table  
-- Containers table
-- Projects table
-- Chat messages table
-- File storage table

-- Create indexes
-- Create functions and triggers
-- Create views
```

### Sample Data
```sql
-- Insert test user
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User');

-- Insert test container
INSERT INTO containers (container_id, name, status, user_id) 
VALUES ('test-container-123', 'Test Project', 'created', 
        (SELECT id FROM users WHERE email = 'test@example.com'));
```

## Connection Configuration

### Railway Environment Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_SSL=true
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000
```

### Connection Pool Settings
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Backup Strategy

### Automated Backups
- Daily automated backups via Railway
- Point-in-time recovery capability
- Cross-region backup replication

### Data Retention
- User data: 7 years
- Container metadata: 1 year
- Chat messages: 6 months
- File storage: 1 year

## Performance Optimization

### Query Optimization
- Use appropriate indexes
- Implement connection pooling
- Optimize JSONB queries
- Use prepared statements

### Monitoring
- Query performance monitoring
- Connection pool metrics
- Database size monitoring
- Slow query logging
