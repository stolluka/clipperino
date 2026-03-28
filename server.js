const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const axios = require("axios");
const path = require("path");
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
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

app.use(express.static("public"));

// ======================
// TWITCH LOGIN
// ======================
app.get("/auth/twitch", (req, res) => {
  const url = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/auth/twitch/callback&response_type=code&scope=`;
  res.redirect(url);
});

app.get("/auth/twitch/callback", async (req, res) => {
  try {
    const code = req.query.code;

    const tokenRes = await axios.post("https://id.twitch.tv/oauth2/token", null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.BASE_URL + "/auth/twitch/callback"
      }
    });

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${access_token}`
      }
    });

    const twitch_name = userRes.data.data[0].login;

    db.get("SELECT * FROM users WHERE twitch_name = ?", [twitch_name], (err, user) => {

      // USER EXISTIERT NICHT → ERSTELLEN
      if (!user) {
        db.run(
          "INSERT INTO users (twitch_name, approved, is_admin) VALUES (?, ?, ?)",
          [twitch_name, 1, twitch_name === "lukasheimer" ? 1 : 0],
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

      // LOGIN
      req.session.user = user;
      res.redirect("/dashboard.html");
    });

  } catch (err) {
    console.error(err);
    res.send("Login Fehler");
  }
});

// ======================
// LOGIN TEST (NOTFALL)
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
// CLIPS (USER)
// ======================
app.get("/api/clips", requireAuth, (req, res) => {
  db.all(
    "SELECT * FROM clips WHERE user_id = ? ORDER BY id DESC",
    [req.session.user.id],
    (err, rows) => {
      res.json(rows);
    }
  );
});

app.post("/api/clips", requireAuth, (req, res) => {
  const { link } = req.body;

  db.run(
    "INSERT INTO clips (user_id, link) VALUES (?, ?)",
    [req.session.user.id, link],
    function () {
      res.json({ success: true });
    }
  );
});

app.delete("/api/clips/:id", requireAuth, (req, res) => {
  db.run(
    "DELETE FROM clips WHERE id = ? AND user_id = ?",
    [req.params.id, req.session.user.id],
    () => res.json({ success: true })
  );
});

// ======================
// ALLE CLIPS (CLIPSABRUF)
// ======================
app.post("/api/all-clips", (req, res) => {
  const { password } = req.body;

  if (password !== "clips123") {
    return res.status(403).send("Falsches Passwort");
  }

  db.all(`
    SELECT clips.*, users.twitch_name 
    FROM clips
    JOIN users ON clips.user_id = users.id
    ORDER BY clips.id DESC
  `, (err, rows) => {
    res.json(rows);
  });
});

// ======================
// LOGOUT
// ======================
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ======================
// SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server läuft auf Port " + PORT);
});
