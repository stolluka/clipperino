const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const axios = require("axios");
const db = require("./db");

const app = express();

// ======================
// CONFIG (SAFE DEFAULTS)
// ======================
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";

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
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));

// ======================
// TEST ROUTE (WICHTIG)
// ======================
app.get("/", (req, res) => {
  res.send("Server läuft!");
});

// ======================
// TWITCH LOGIN (SAFE)
// ======================
app.get("/auth/twitch", (req, res) => {
  if (!CLIENT_ID) {
    return res.send("Twitch nicht konfiguriert");
  }

  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${BASE_URL}/auth/twitch/callback&response_type=code&scope=`;
  res.redirect(url);
});

app.get("/auth/twitch/callback", async (req, res) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.send("Twitch ENV fehlt");
    }

    const code = req.query.code;

    const tokenRes = await axios.post("https://id.twitch.tv/oauth2/token", null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: BASE_URL + "/auth/twitch/callback"
      }
    });

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": CLIENT_ID,
        Authorization: `Bearer ${access_token}`
      }
    });

    const twitch_name = userRes.data.data[0].login;

    db.get("SELECT * FROM users WHERE twitch_name = ?", [twitch_name], (err, user) => {

      if (!user) {
        db.run(
          "INSERT INTO users (twitch_name, approved, is_admin) VALUES (?, 1, 0)",
          [twitch_name],
          function () {
            req.session.user = {
              id: this.lastID,
              twitch_name
            };
            return res.redirect("/dashboard.html");
          }
        );
        return;
      }

      req.session.user = user;
      res.redirect("/dashboard.html");
    });

  } catch (err) {
    console.error("TWITCH ERROR:", err.message);
    res.send("Login Fehler");
  }
});

// ======================
// LOGIN TEST
// ======================
app.get("/login-test", (req, res) => {
  req.session.user = {
    id: 1,
    twitch_name: "testuser"
  };
  res.send("Login OK");
});

// ======================
// AUTH CHECK
// ======================
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).send("Nicht eingeloggt");
  }
  next();
}

// ======================
// CLIPS USER
// ======================
app.get("/api/clips", requireAuth, (req, res) => {
  db.all(
    "SELECT * FROM clips WHERE user_id = ? ORDER BY id DESC",
    [req.session.user.id],
    (err, rows) => {
      if (err) return res.status(500).send("DB Fehler");
      res.json(rows);
    }
  );
});

app.post("/api/clips", requireAuth, (req, res) => {
  const { link } = req.body;

  if (!link) return res.status(400).send("Kein Link");

  db.run(
    "INSERT INTO clips (user_id, link) VALUES (?, ?)",
    [req.session.user.id, link],
    function (err) {
      if (err) return res.status(500).send("DB Fehler");
      res.json({ success: true });
    }
  );
});

// ======================
// ADMIN CLIPS (PASSWORT)
// ======================
app.post("/api/all-clips", (req, res) => {
  const { password } = req.body;

  if (password !== "clips123") {
    return res.status(403).send("Falsch");
  }

  db.all(`
    SELECT clips.*, users.twitch_name 
    FROM clips
    JOIN users ON clips.user_id = users.id
    ORDER BY clips.id DESC
  `, (err, rows) => {
    if (err) return res.status(500).send("DB Fehler");
    res.json(rows);
  });
});

// ======================
// SERVER START
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
