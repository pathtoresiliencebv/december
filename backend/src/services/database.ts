import { Pool, PoolClient } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create containers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS containers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        container_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'created',
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
      )
    `);

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100) DEFAULT 'nextjs',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        metadata JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}'
      )
    `);

    // Create chat_messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Create file_storage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT false
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_containers_container_id ON containers(container_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_containers_user_id ON containers(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_containers_created_at ON containers(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_containers_assigned_port ON containers(assigned_port)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_projects_container_id ON projects(container_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_container_id ON chat_messages(container_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_file_storage_container_id ON file_storage(container_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_file_storage_file_path ON file_storage(file_path)');

    // Create update timestamp function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_containers_updated_at ON containers;
      CREATE TRIGGER update_containers_updated_at 
        BEFORE UPDATE ON containers 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
      CREATE TRIGGER update_projects_updated_at 
        BEFORE UPDATE ON projects 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_file_storage_updated_at ON file_storage;
      CREATE TRIGGER update_file_storage_updated_at 
        BEFORE UPDATE ON file_storage 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Container operations
export async function createContainerRecord(data: {
  containerId: string;
  name: string;
  imageName: string;
  assignedPort: number;
  userId?: string;
}): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO containers (container_id, name, image_name, assigned_port, user_id, status)
      VALUES ($1, $2, $3, $4, $5, 'created')
      RETURNING *
    `, [data.containerId, data.name, data.imageName, data.assignedPort, data.userId]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function updateContainerStatus(containerId: string, status: string, url?: string): Promise<void> {
  const client = await pool.connect();
  try {
    const updateData: any = { status };
    if (url) updateData.url = url;
    
    if (status === 'running') {
      updateData.started_at = new Date();
    } else if (status === 'stopped') {
      updateData.stopped_at = new Date();
    }

    const setClause = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [containerId, ...Object.values(updateData)];

    await client.query(`
      UPDATE containers 
      SET ${setClause}
      WHERE container_id = $1
    `, values);
  } finally {
    client.release();
  }
}

export async function getContainers(userId?: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    let query = `
      SELECT c.*, p.name as project_name, p.description as project_description
      FROM containers c
      LEFT JOIN projects p ON c.id = p.container_id
    `;
    
    const params: any[] = [];
    if (userId) {
      query += ' WHERE c.user_id = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function deleteContainerRecord(containerId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM containers WHERE container_id = $1', [containerId]);
  } finally {
    client.release();
  }
}

// Chat message operations
export async function saveChatMessage(data: {
  containerId: string;
  sessionId: string;
  role: string;
  content: string;
  attachments?: any[];
}): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO chat_messages (container_id, session_id, role, content, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.containerId, data.sessionId, data.role, data.content, JSON.stringify(data.attachments || [])]);
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getChatHistory(containerId: string, sessionId: string): Promise<any[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM chat_messages 
      WHERE container_id = $1 AND session_id = $2
      ORDER BY created_at ASC
    `, [containerId, sessionId]);
    
    return result.rows;
  } finally {
    client.release();
  }
}

// Export pool for direct queries
export { pool };
