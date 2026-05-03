const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function notifySlack(lead) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🏠 *New Lead!*\n*Name:* ${lead.first_name} ${lead.last_name}\n*Phone:* ${lead.phone}\n*Email:* ${lead.email}\n*Address:* ${lead.property_address}\n*Timeline:* ${lead.timeline}\n*Repairs:* ${lead.repairs}\n*Reason:* ${lead.sell_reason}\n*Source:* ${(lead.source || 'meta').toUpperCase()}`,
      }),
    });
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_stages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        position INTEGER NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
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
    // Add last_followed_up column if it doesn't exist
    await client.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followed_up TIMESTAMP;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS dispo_price NUMERIC;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS offer_price NUMERIC;
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

    // Get the first column name from saved order, fallback to 'New Lead'
    let defaultStage = 'New Lead';
    try {
      const orderResult = await pool.query("SELECT value FROM settings WHERE key = 'column_order'");
      if (orderResult.rows.length > 0) {
        const order = JSON.parse(orderResult.rows[0].value);
        if (order && order.length > 0) {
          defaultStage = order[0];
        }
      }
    } catch (e) { /* use default */ }

    const result = await pool.query(
      `INSERT INTO leads (
        first_name, last_name, email, phone, property_address,
        wants_to_sell, timeline, repairs, sell_reason,
        stage, source, utm_campaign, utm_source,
        sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [first_name, last_name, email, phone, property_address,
       wants_to_sell, timeline, repairs, sell_reason,
       defaultStage, source || 'meta', utm_campaign, utm_source,
       sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5]
    );

    const newLead = result.rows[0];
    res.status(201).json(newLead);
    notifySlack(newLead);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// POST /api/leads/propertyleads — webhook ingest from PropertyLeads.com
// Optional auth: if PROPERTYLEADS_WEBHOOK_TOKEN is set, require ?token= match.
app.post('/api/leads/propertyleads', async (req, res) => {
  try {
    const expectedToken = process.env.PROPERTYLEADS_WEBHOOK_TOKEN;
    if (expectedToken && req.query.token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Log content-type, query, and body so we can see exactly what PL sent
    console.log('[propertyleads] content-type:', req.headers['content-type']);
    console.log('[propertyleads] query:', JSON.stringify(req.query));
    console.log('[propertyleads] body:', JSON.stringify(req.body));

    // Merge body + query so we catch leads delivered as either POST body OR GET-style query params
    const p = { ...(req.query || {}), ...(req.body || {}) };
    const pick = (...keys) => {
      for (const k of keys) {
        if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k];
      }
      return '';
    };

    let first_name = pick('First_Name', 'First Name', 'first_name', 'firstName', 'fname', 'first');
    let last_name = pick('Last_Name', 'Last Name', 'last_name', 'lastName', 'lname', 'last');
    if (!first_name && !last_name) {
      const full = pick('name', 'full_name', 'fullName', 'contact_name');
      if (full) {
        const parts = String(full).trim().split(/\s+/);
        first_name = parts[0] || '';
        last_name = parts.slice(1).join(' ');
      }
    }

    const email = pick('Email', 'email', 'email_address', 'emailAddress');
    const phone = pick('Primary_Phone', 'Primary Phone', 'phone', 'phone_number', 'phoneNumber', 'phone1', 'mobile', 'cell');

    const street = pick('Property_Address', 'Property Address', 'property_address', 'propertyAddress', 'address', 'street_address', 'streetAddress', 'street', 'address1', 'address_line_1');
    const city = pick('City', 'city');
    const state = pick('State', 'state', 'region');
    const zip = pick('Zip', 'zip', 'zipcode', 'zip_code', 'postal_code', 'postalCode');
    const county = pick('County', 'county');
    let property_address = [street, city, state, zip].filter(Boolean).join(', ');
    if (!property_address) property_address = street || '';

    const timeline = pick('Time_Frame_To_Sell', 'Time Frame To Sell', 'timeline', 'time_frame', 'timeframe');
    const repairs = pick('Repairs_Maintenance_Needed', 'Repairs Maintenance Needed', 'repairs', 'condition', 'property_condition');
    const sell_reason = pick('Reason_for_Selling', 'Reason_For_Selling', 'Reason For Selling', 'sell_reason', 'reason', 'motivation', 'why_selling');
    const wants_to_sell = pick('wants_to_sell', 'interested') || 'yes';

    const askingPrice = pick('Asking_Price', 'Asking Price', 'asking_price');
    const ownedHowLong = pick('How_Long_Owned_Property', 'How Long Owned Property', 'how_long_owned');
    const livingInHouse = pick('Anyone_Living_In_House', 'Anyone Living In House', 'anyone_living_in_house');
    const comments = pick('Comments', 'comments');
    const leadCost = pick('Lead_Cost', 'Lead Cost', 'lead_cost');
    const leadId = pick('Lead_ID', 'Lead ID', 'lead_id');
    const dateCreated = pick('Date_Created', 'Date Created', 'date_created');

    // PL extras intentionally not written to notes — keep card compact and
    // matching the existing layout. Reference unused vars to satisfy linter.
    void askingPrice; void ownedHowLong; void livingInHouse; void county;
    void leadCost; void leadId; void dateCreated; void comments;

    // Leave notes empty so the "Add note..." input renders like other cards
    const notes = null;

    let defaultStage = 'New Lead';
    try {
      const orderResult = await pool.query("SELECT value FROM settings WHERE key = 'column_order'");
      if (orderResult.rows.length > 0) {
        const order = JSON.parse(orderResult.rows[0].value);
        if (order && order.length > 0) defaultStage = order[0];
      }
    } catch (e) { /* use default */ }

    const result = await pool.query(
      `INSERT INTO leads (
        first_name, last_name, email, phone, property_address,
        wants_to_sell, timeline, repairs, sell_reason,
        stage, source, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [first_name, last_name, email, phone, property_address,
       wants_to_sell, timeline, repairs, sell_reason,
       defaultStage, 'propertyleads', notes]
    );

    const newLead = result.rows[0];
    res.status(201).json(newLead);
    notifySlack(newLead);
  } catch (err) {
    console.error('Error creating propertyleads lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// POST /api/leads/motivatedsellers — webhook ingest from MotivatedSellers.com
app.post('/api/leads/motivatedsellers', async (req, res) => {
  try {
    const expectedToken = process.env.MOTIVATEDSELLERS_WEBHOOK_TOKEN;
    if (expectedToken && req.query.token !== expectedToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('[motivatedsellers] content-type:', req.headers['content-type']);
    console.log('[motivatedsellers] query:', JSON.stringify(req.query));
    console.log('[motivatedsellers] body:', JSON.stringify(req.body));

    const p = { ...(req.query || {}), ...(req.body || {}) };
    const pick = (...keys) => {
      for (const k of keys) {
        if (p[k] !== undefined && p[k] !== null && p[k] !== '') return p[k];
      }
      return '';
    };

    const first_name = pick('first_name');
    const last_name = pick('last_name');
    const email = pick('email_address', 'email');
    const phone = pick('phone');

    const street = pick('address');
    const address2 = pick('address_2');
    const city = pick('city');
    const state = pick('state');
    const zip = pick('zip_code', 'zipcode');
    const property_address = [
      [street, address2].filter(Boolean).join(' '),
      city,
      state,
      zip,
    ].filter(Boolean).join(', ');

    const timeline = pick('timeframe');
    const wants_to_sell = 'yes';

    void pick('county'); void pick('bedrooms'); void pick('bathrooms');
    void pick('estimated_value'); void pick('price'); void pick('lead_id'); void pick('account');

    let defaultStage = 'New Lead';
    try {
      const orderResult = await pool.query("SELECT value FROM settings WHERE key = 'column_order'");
      if (orderResult.rows.length > 0) {
        const order = JSON.parse(orderResult.rows[0].value);
        if (order && order.length > 0) defaultStage = order[0];
      }
    } catch (e) { /* use default */ }

    const result = await pool.query(
      `INSERT INTO leads (
        first_name, last_name, email, phone, property_address,
        wants_to_sell, timeline, repairs, sell_reason,
        stage, source, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [first_name, last_name, email, phone, property_address,
       wants_to_sell, timeline, '', '',
       defaultStage, 'motivatedsellers', null]
    );

    const newLead = result.rows[0];
    res.status(201).json(newLead);
    notifySlack(newLead);
  } catch (err) {
    console.error('Error creating motivatedsellers lead:', err);
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
      'sub_id_1', 'sub_id_2', 'sub_id_3', 'sub_id_4', 'sub_id_5',
      'last_followed_up', 'notes', 'dispo_price', 'offer_price'
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

// DELETE /api/leads/:id — delete a lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET /api/stages — get custom stages
app.get('/api/stages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_stages ORDER BY position ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stages:', err);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

// POST /api/stages — create a custom stage
app.post('/api/stages', async (req, res) => {
  try {
    const { name, position } = req.body;
    const result = await pool.query(
      'INSERT INTO custom_stages (name, position) VALUES ($1, $2) RETURNING *',
      [name, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating stage:', err);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

// PATCH /api/stages/:id — rename a custom stage
app.patch('/api/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      'UPDATE custom_stages SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error renaming stage:', err);
    res.status(500).json({ error: 'Failed to rename stage' });
  }
});

// DELETE /api/stages/:id — delete a custom stage
app.delete('/api/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM custom_stages WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.json({ message: 'Stage deleted' });
  } catch (err) {
    console.error('Error deleting stage:', err);
    res.status(500).json({ error: 'Failed to delete stage' });
  }
});

// GET /api/settings/column-order — get column order
app.get('/api/settings/column-order', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'column_order'");
    if (result.rows.length === 0) {
      return res.json({ order: null });
    }
    res.json({ order: JSON.parse(result.rows[0].value) });
  } catch (err) {
    console.error('Error fetching column order:', err);
    res.status(500).json({ error: 'Failed to fetch column order' });
  }
});

// PUT /api/settings/column-order — save column order
app.put('/api/settings/column-order', async (req, res) => {
  try {
    const { order } = req.body;
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('column_order', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(order)]
    );
    res.json({ message: 'Column order saved' });
  } catch (err) {
    console.error('Error saving column order:', err);
    res.status(500).json({ error: 'Failed to save column order' });
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
