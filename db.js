const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitch_name TEXT UNIQUE,
      approved INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      link TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO users (twitch_name, approved, is_admin)
    VALUES ('LukasHeimer', 1, 1)
  `);
});

module.exports = db;
