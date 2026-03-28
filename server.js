const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const db = require("./db");

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({
    db: "sessions.db",
    dir: "./"
  }),
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

// ======================
// STATIC FILES
// ======================
app.use(express.static("public"));

// ======================
// AUTH CHECK
// ======================
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  next();
}

// ======================
// TEST LOGIN (WICHTIG!!!)
// ======================
// Falls Twitch gerade nervt → damit kannst du testen
app.get("/login-test", (req, res) => {
  req.session.user = {
    id: 1,
    twitch_name: "TestUser"
  };

  res.send("Test Login erfolgreich");
});

// ======================
// CLIPS SPEICHERN
// ======================
app.post("/api/clips", requireAuth, (req, res) => {
  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: "Kein Link angegeben" });
  }

  const userId = req.session.user.id;

  db.run(
    "INSERT INTO clips (user_id, link) VALUES (?, ?)",
    [userId, link],
    function (err) {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: "DB Fehler" });
      }

      res.json({
        success: true,
        id: this.lastID
      });
    }
  );
});

// ======================
// CLIPS LADEN
// ======================
app.get("/api/clips", requireAuth, (req, res) => {
  const userId = req.session.user.id;

  db.all(
    "SELECT * FROM clips WHERE user_id = ? ORDER BY id DESC",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: "DB Fehler" });
      }

      res.json(rows);
    }
  );
});

// ======================
// CLIP LÖSCHEN
// ======================
app.delete("/api/clips/:id", requireAuth, (req, res) => {
  const id = req.params.id;
  const userId = req.session.user.id;

  db.run(
    "DELETE FROM clips WHERE id = ? AND user_id = ?",
    [id, userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Fehler beim Löschen" });
      }

      res.json({ success: true });
    }
  );
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});

// ==========================
// ALLE CLIPS (ADMIN)
// ==========================
app.get("/api/all-clips", (req, res) => {

  db.all(`
    SELECT clips.id, clips.link, users.twitch_name 
    FROM clips
    JOIN users ON clips.user_id = users.id
    ORDER BY clips.id DESC
  `, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB Fehler" });
    }

    res.json(rows);
  });

});
