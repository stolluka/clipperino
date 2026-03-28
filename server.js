const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION (WICHTIG)
app.use(session({
  store: new SQLiteStore({ db: "sessions.db" }),
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

// STATIC FILES
app.use(express.static("public"));


// ==========================
// LOGIN CHECK
// ==========================
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  next();
}


// ==========================
// CLIPS SPEICHERN
// ==========================
app.post("/api/clips", requireAuth, (req, res) => {
  const { link } = req.body;
  const userId = req.session.user.id;

  if (!link) {
    return res.status(400).json({ error: "Kein Link" });
  }

  db.run(
    "INSERT INTO clips (user_id, link) VALUES (?, ?)",
    [userId, link],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB Fehler" });
      }

      res.json({ success: true, id: this.lastID });
    }
  );
});


// ==========================
// CLIPS LADEN
// ==========================
app.get("/api/clips", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  db.all(
    "SELECT * FROM clips WHERE user_id = ? ORDER BY id DESC",
    [userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB Fehler" });
      }

      res.json(rows);
    }
  );
});


// ==========================
// CLIP LÖSCHEN
// ==========================
app.delete("/api/clips/:id", requireAuth, (req, res) => {
  const id = req.params.id;
  const userId = req.session.user.id;

  db.run(
    "DELETE FROM clips WHERE id = ? AND user_id = ?",
    [id, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Fehler" });
      }

      res.json({ success: true });
    }
  );
});


// ==========================
// TEST ROUTE (DEBUG)
// ==========================
app.get("/api/test", (req, res) => {
  res.json({ status: "Server läuft!" });
});


// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
