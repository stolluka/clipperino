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
});

module.exports = db;

app.get("/api/clips", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("Nicht eingeloggt");

  db.all("SELECT * FROM clips WHERE user_id = ?", [user.id], (err, rows) => {
    res.json(rows);
  });
});


app.post("/api/clips", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("Nicht eingeloggt");

  const { link } = req.body;

  db.get("SELECT COUNT(*) as count FROM clips WHERE user_id = ?", [user.id], (err, row) => {
    if (row.count >= 5) {
      return res.status(400).send("Max 5 Clips erreicht");
    }

    db.run("INSERT INTO clips (user_id, link) VALUES (?, ?)", [user.id, link], () => {
      res.sendStatus(200);
    });
  });
});


app.delete("/api/clips/:id", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("Nicht eingeloggt");

  db.run(
    "DELETE FROM clips WHERE id = ? AND user_id = ?",
    [req.params.id, user.id],
    () => res.sendStatus(200)
  );
});
