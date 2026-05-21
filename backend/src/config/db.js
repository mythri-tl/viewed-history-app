const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Use DATABASE_URL if available (standard for Railway/Supabase), otherwise fallback to individual variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

const initDB = async () => {
  try {
    // 1. Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Posts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        hashtags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS hashtags TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 3. Likes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);

    // 4. Comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS comment_text TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await pool.query(`
      UPDATE comments
      SET
        content = COALESCE(content, comment_text),
        comment_text = COALESCE(comment_text, content)
      WHERE content IS NULL OR comment_text IS NULL
    `);

    // 5. Viewed History
    await pool.query(`
      CREATE TABLE IF NOT EXISTS viewed_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        resumed_count INTEGER DEFAULT 0,
        UNIQUE(user_id, post_id)
      )
    `);

    // 6. User History Settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_history_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_paused BOOLEAN DEFAULT FALSE,
        private_mode BOOLEAN DEFAULT FALSE,
        auto_delete_days INTEGER DEFAULT 30,
        min_duration_seconds INTEGER DEFAULT 3,
        min_visibility_pct INTEGER DEFAULT 50,
        filter_read_posts BOOLEAN DEFAULT FALSE
      )
    `);

    // 7. Connections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) CHECK(status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, receiver_id)
      )
    `);

    // 8. Jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        salary_range VARCHAR(100),
        skills_required TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Job Applications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, user_id)
      )
    `);

    // 10. Saved Jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, user_id)
      )
    `);

    // 11. Messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Hot-path indexes for feed, comments, likes, and history reads.
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON comments (post_id, created_at ASC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes (post_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_viewed_history_user_id_viewed_at ON viewed_history (user_id, viewed_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_viewed_history_user_id_post_id ON viewed_history (user_id, post_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_id ON posts (id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_content ON posts (content)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts (hashtags)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_name ON users (name)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs (title)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company)`);

    console.log("PostgreSQL Database schema initialized successfully.");
  } catch (err) {
    console.error("Error initializing PostgreSQL schema:", err);
  }
};

const query = (text, params = []) => pool.query(text, params);

module.exports = { pool, query, initDB };
