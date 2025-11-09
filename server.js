const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { table } = require('console');
const app = express();
//const crypto = require('crypto');


app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined
});

const FLAGS_FILE = path.join(__dirname, 'flags.json');
const COUNTER_FILE = path.join(__dirname, 'counter.json');
function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

app.post('/api/toggle', (req, res) => {
  const { vuln, enabled } = req.body;
  const flags = readJson(FLAGS_FILE) || {};
  if (!(vuln in flags)) return res.status(400).json({ error: 'Unknown vulnerability' });
  flags[vuln] = !!enabled;
  if (enabled) {
    for (const k of Object.keys(flags)) flags[k] = (k === vuln);
  } else {
    flags[vuln] = false;
  }
  writeJson(FLAGS_FILE, flags);
  res.json({ ok: true, flags });
});

function isValidUsername(u) {
  return /^[A-Za-z0-9_]{1,50}$/.test(u);
}
app.post('/api/attack', async (req, res) => {
  const { inputName, inputPass } = req.body;
  const flags = readJson(FLAGS_FILE) || {};

  const InputName = (inputName ?? '').toString().trim();
  const InputPass = (inputPass ?? '').toString().trim();
  
  if (!InputName) {
    return res.status(400).json({ success: false, message: 'username required' });
  }

  try {
    if (flags.sql_injection) {
      const q = `SELECT id, username, password FROM users WHERE username = '${InputName}';`;
      const r = await pool.query(q);

      if (!isValidUsername(InputName)){
        return res.json({
          success: true,
          message: JSON.stringify(r.rows, null, 2),
        });
      } else if (r.rows[0].username == InputName){
        return res.json({ success: true, message: 'Valid input'});
      } else {
        return res.json({ success: false, message: 'Incorrect data'});
      }
    } else {
      const q = 'SELECT id, username, password FROM users WHERE username = $1;';
      if(!isValidUsername(InputName)){
        return res.status(400).json({ success: false, message: 'Invalid input'});
      }
      const r = await pool.query(q, [InputName]);
      queryResult = r.rows;
      if (r.rows[0].username == InputName){
        return res.json({ success: true, message: 'Valid input'});
      } else {
        return res.json({ success: false, message: 'Incorrect data'});
      }
    }
    
  } catch (err) {
    console.error('/api/attack error:', err);
    return res.status(500).json({ success: false, message: 'Invalid input'});
  }
});

app.post('/api/login', async (req, res) => {
  const { inputName, inputPass } = req.body;
  const flags = readJson(FLAGS_FILE) || {};
  let {br, time_counter} = readJson(COUNTER_FILE) || {};

  const InputName = (inputName ?? '').toString().trim();
  const InputPass = (inputPass ?? '').toString().trim();
  
  if (!InputName || !InputPass) {
    return res.status(400).json({ success: false, message: 'No sufficient data' });
  }
  if (br == 5){
    br = 0;
    time_counter = Date.now() + 5*60*1000;
    writeJson(COUNTER_FILE,{br, time_counter});
    return res.json({ success: false, message: 'Timeout'});
  } 
  if (time_counter && time_counter > Date.now()){
    return res.json({ success: false, message: 'Timeout ongoing'});
  }
  time_counter = null;
  if (flags.broken_auth) {
    try {      
      if (!isValidUsername(InputName)){
        return res.json({ success: false, message: 'User wrong format'});
      }
      const q = `SELECT id, username, password FROM users WHERE username = '${InputName}';`;
      const r = await pool.query(q);
      if (r.rows[0] == null){
        return res.status(400).json({ success: false, message: 'Username does not exist'});
      }
      if (r.rows[0].password == InputPass){
        return res.json({ success: true, message: 'Valid input - logging in'});
      } else {
        return res.json({ success: false, message: 'Wrong password'});
      }
    } catch (err) {
      console.error('/api/attack error:', err);
      return res.status(500).json({ success: false, message: 'Username does not exist'});
    }
  } else {
    try {     
      if (!isValidUsername(InputName)){
        br++;
        writeJson(COUNTER_FILE,{br, time_counter});
        return res.json({ success: false, message: 'User wrong format'});
      }
      const q = `SELECT id, username, password FROM users WHERE username = '${InputName}';`;
      const r = await pool.query(q);
      if (r.rows[0] == null){
        br++;
        writeJson(COUNTER_FILE,{br, time_counter});
        return res.status(400).json({ success: false, message: 'Wrong input'});
      }
      if (r.rows[0].password == InputPass){//crypto.createHash('sha256').update(r.rows[0].password + salt, 'utf8').digest('hex')
        return res.json({ success: true, message: 'Valid input - logging in'});
      } else {
        br++;
        writeJson(COUNTER_FILE,{br, time_counter});
        return res.json({ success: false, message: 'Wrong input'});
      }
    } catch (err) {
      console.error('/api/login error:', err);
      br++;
      writeJson(COUNTER_FILE,{br, time_counter});
      return res.status(500).json({ success: false, message: 'Wrong input'});
    }
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const flags = readJson(FLAGS_FILE) || {};
  for (const k of Object.keys(flags)) flags[k] = false;
  writeJson(FLAGS_FILE,flags)
  console.log(`Server running at http://localhost:${PORT}`);
});