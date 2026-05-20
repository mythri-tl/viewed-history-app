const bcrypt = require('bcrypt');
const { pool, query } = require('./db');

const seedDB = async () => {
  console.log("Starting PostgreSQL database seeding...");

  try {
    // 1. Clear existing test data to ensure clean slate and restart identity (auto-increment sequences)
    console.log("Clearing existing tables and resetting sequences...");
    await query(`
      TRUNCATE TABLE 
        notifications, 
        messages, 
        saved_jobs, 
        job_applications, 
        connections, 
        viewed_history, 
        user_history_settings, 
        comments, 
        likes, 
        posts, 
        users 
      RESTART IDENTITY CASCADE
    `);

    console.log("Generating hashes for test passwords...");
    const passwordHash = await bcrypt.hash('password123', 10);

    // 2. Insert Mock Users
    console.log("Inserting mock users...");
    let res;
    
    res = await query(
      `INSERT INTO users (name, email, password_hash, profile_image) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Alice Vance', 'alice@dwellsync.com', passwordHash, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150']
    );
    const aliceId = res.rows[0].id;

    res = await query(
      `INSERT INTO users (name, email, password_hash, profile_image) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Bob Miller', 'bob@dwellsync.com', passwordHash, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150']
    );
    const bobId = res.rows[0].id;

    res = await query(
      `INSERT INTO users (name, email, password_hash, profile_image) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Charlie Smith', 'charlie@dwellsync.com', passwordHash, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150']
    );
    const charlieId = res.rows[0].id;

    // Create Settings
    console.log("Creating default settings...");
    for (const uid of [aliceId, bobId, charlieId]) {
      await query(
        `INSERT INTO user_history_settings (user_id, is_paused, private_mode, auto_delete_days, min_duration_seconds, min_visibility_pct, filter_read_posts) VALUES ($1, false, false, 30, 3, 50, false)`,
        [uid]
      );
    }

    // 3. Establish Connections
    console.log("Establishing connection records...");
    await query(
      `INSERT INTO connections (requester_id, receiver_id, status) VALUES ($1, $2, 'accepted')`,
      [aliceId, bobId]
    );
    await query(
      `INSERT INTO connections (requester_id, receiver_id, status) VALUES ($1, $2, 'pending')`,
      [charlieId, aliceId]
    );

    // 4. Create Job Postings
    console.log("Inserting job listings...");
    await query(
      `INSERT INTO jobs (title, description, company, location, salary_range, skills_required) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Senior Vision-Language Researcher',
        'Join our advanced research division to build next-generation context-aware scene decoders. You will work on massive datasets and develop vision-language systems that scale.\n\nKey Responsibilities:\n- Research vision-language model architectures.\n- Optimize real-time multimodal model pipelines.',
        'Google DeepMind',
        'London, UK (Hybrid)',
        '$160k - $210k',
        'PyTorch, Multimodal, Transformers, Python'
      ]
    );

    await query(
      `INSERT INTO jobs (title, description, company, location, salary_range, skills_required) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Senior Full Stack Architect',
        'Lead development on core collaborative features. We are scaling our systems and need experts in Express, SQLite, Node, React, and live WebSockets communication protocols.\n\nQualifications:\n- 5+ years experience building highly concurrent web backends.\n- Expertise in Socket.io and performance profiling.',
        'OpenAI',
        'San Francisco, CA',
        '$190k - $240k',
        'React, Node.js, Express, SQLite, WebSockets'
      ]
    );

    await query(
      `INSERT INTO jobs (title, description, company, location, salary_range, skills_required) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Interaction & UX Engineer',
        'Craft gorgeous, responsive glassmorphism interfaces and interactive dashboards. You will build user-friendly components, responsive layouts, and rich animations.\n\nRequirements:\n- Deep understanding of vanilla CSS variables and custom animations.\n- Solid experience in React hooks and state sync.',
        'Stripe',
        'New York, NY (Remote)',
        '$140k - $170k',
        'CSS, React, Glassmorphism, Responsive UI'
      ]
    );

    // 5. Create Mock Posts (for the DwellSync scroll-visibility feed)
    console.log("Inserting professional feed posts...");
    await query(
      `INSERT INTO posts (user_id, content, hashtags) VALUES ($1, $2, $3)`,
      [
        bobId,
        "DwellSync is working beautifully! I love tracking my professional learning journey by measuring scroll-visibility and focus dwell time using advanced IntersectionObserver algorithms in real time. Productive feed consumption is the future!",
        "#DwellSync #Productivity #EdTech #ReactJS"
      ]
    );

    await query(
      `INSERT INTO posts (user_id, content, hashtags) VALUES ($1, $2, $3)`,
      [
        charlieId,
        "Just open-sourced our Scene Decoder vision-language model! It generates context-aware, highly accurate textual descriptions of images in real time and handles voice generation for accessibility. Multimodal AI is truly accelerating.",
        "#SceneDecoder #AI #ComputerVision #Accessibility"
      ]
    );

    // Add a couple of initial messages logs
    console.log("Adding default conversation messages...");
    await query(
      `INSERT INTO messages (sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, NOW() - INTERVAL '10 minutes')`,
      [bobId, aliceId, "Hey Alice! Welcome to DwellSync. Let's chat here in real time using our custom Socket.io integration! Let me know if you can see this message."]
    );
    await query(
      `INSERT INTO messages (sender_id, receiver_id, message, timestamp) VALUES ($1, $2, $3, NOW() - INTERVAL '5 minutes')`,
      [aliceId, bobId, "Hi Bob! Yes, I see your message perfectly. The real-time connection and notification updates work incredibly fast!"]
    );

    // Add a default notification
    await query(
      `INSERT INTO notifications (user_id, type, message, is_read) VALUES ($1, $2, $3, false)`,
      [aliceId, 'connection_request', 'Charlie Smith sent you a connection request.']
    );

    console.log("Database seeded successfully!");
    console.log("\n==========================================");
    console.log("TEST USER CREDENTIALS FOR TESTING:");
    console.log("1. alice@dwellsync.com (password: password123)");
    console.log("2. bob@dwellsync.com   (password: password123)");
    console.log("3. charlie@dwellsync.com (password: password123)");
    console.log("==========================================\n");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await pool.end();
  }
};

module.exports = { seedDB };

if (require.main === module) {
  seedDB();
}
