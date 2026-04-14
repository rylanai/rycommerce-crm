const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        property_address TEXT,
        wants_to_sell VARCHAR(10),
        timeline VARCHAR(50),
        repairs VARCHAR(100),
        sell_reason VARCHAR(100),
        stage VARCHAR(50) DEFAULT 'New Lead',
        source VARCHAR(50) DEFAULT 'meta',
        utm_campaign VARCHAR(255),
        utm_source VARCHAR(255),
        sub_id_1 VARCHAR(255),
        sub_id_2 VARCHAR(255),
        sub_id_3 VARCHAR(255),
        sub_id_4 VARCHAR(255),
        sub_id_5 VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
};

// POST /api/leads — create a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, property_address,
      wants_to_sell, timeline, repairs, sell_reason,
      source, utm_campaign, utm_source,
      sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (
        first_name, last_name, email, phone, property_address,
        wants_to_sell, timeline, repairs, sell_reason,
        source, utm_campaign, utm_source,
        sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [first_name, last_name, email, phone, property_address,
       wants_to_sell, timeline, repairs, sell_reason,
       source || 'meta', utm_campaign, utm_source,
       sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// GET /api/leads — get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// PATCH /api/leads/:id/stage — update pipeline stage
app.patch('/api/leads/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const result = await pool.query(
      'UPDATE leads SET stage = $1 WHERE id = $2 RETURNING *',
      [stage, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating stage:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// PATCH /api/leads/:id — update any lead field
app.patch('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'property_address',
      'wants_to_sell', 'timeline', 'repairs', 'sell_reason', 'stage',
      'source', 'utm_campaign', 'utm_source',
      'sub_id_1', 'sub_id_2', 'sub_id_3', 'sub_id_4', 'sub_id_5'
    ];
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => allowedFields.includes(k));
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(id);

    const result = await pool.query(
      `UPDATE leads SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Rycommerce CRM API' });
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
