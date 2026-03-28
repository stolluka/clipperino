const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");
const db = require("./db");

const app = express();

app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, "public")));

// ===== TWITCH LOGIN =====

app.get("/auth/twitch", (req, res) => {
  const redirect = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/auth/twitch/callback&response_type=code&scope=`;
  res.redirect(redirect);
});

app.get("/auth/twitch/callback", async (req, res) => {
  const code = req.query.code;

  try {
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
  if (err) {
    console.error(err);
    return res.send("DB Fehler");
  }

  // USER EXISTIERT NICHT → ERSTELLEN + DIREKT EINLOGGEN
  if (!user) {
    db.run(
      "INSERT INTO users (twitch_name, approved, is_admin) VALUES (?, ?, ?)",
      [twitch_name, twitch_name === "LukasHeimer" ? 1 : 0, twitch_name === "LukasHeimer" ? 1 : 0],
      function (err) {
        if (err) {
          console.error(err);
          return res.send("Insert Fehler");
        }

        // User sofort holen
        db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, newUser) => {
          req.session.user = newUser;

          if (newUser.is_admin) {
            return res.redirect("/admin.html");
          }

          if (!newUser.approved) {
            return res.send("Warte auf Freigabe durch Admin");
          }

          res.redirect("/dashboard.html");
        });
      }
    );
    return;
  }

  // ADMIN
  if (user.is_admin) {
    req.session.user = user;
    return res.redirect("/admin.html");
  }

  // NICHT FREIGEGEBEN
  if (!user.approved) {
    return res.send("Warte auf Freigabe durch Admin");
  }

  req.session.user = user;
  res.redirect("/dashboard.html");
});

      // NEUER USER → automatisch speichern
      if (!user) {
        db.run("INSERT INTO users (twitch_name, approved, is_admin) VALUES (?, ?, ?)",
          [twitch_name, twitch_name === "LukasHeimer" ? 1 : 0, twitch_name === "LukasHeimer" ? 1 : 0]
        );

        return res.send("Registriert! Seite neu laden.");
      }

      // ADMIN darf immer rein
      if (user.is_admin) {
        req.session.user = user;
        return res.redirect("/admin.html");
      }

      // NORMAL USER → muss approved sein
      if (!user.approved) {
        return res.send("Warte auf Freigabe durch Admin");
      }

      req.session.user = user;
      res.redirect("/dashboard.html");
    });

  } catch (err) {
    console.error(err);
    res.send("Login Fehler");
  }
});

// ===== CLIPS =====

app.get("/api/clips", (req, res) => {
  if (!req.session.user) return res.status(401).send("Nicht eingeloggt");

  db.all("SELECT * FROM clips WHERE user_id = ?", [req.session.user.id], (err, rows) => {
    res.json(rows);
  });
});

app.post("/api/clips", (req, res) => {
  if (!req.session.user) return res.status(401).send("Nicht eingeloggt");

  const { link } = req.body;

  db.get("SELECT COUNT(*) as count FROM clips WHERE user_id = ?", [req.session.user.id], (err, row) => {
    if (row.count >= 5) return res.status(400).send("Max 5 Clips erreicht");

    db.run("INSERT INTO clips (user_id, link) VALUES (?, ?)", [req.session.user.id, link], () => {
      res.sendStatus(200);
    });
  });
});

app.delete("/api/clips/:id", (req, res) => {
  if (!req.session.user) return res.status(401).send("Nicht eingeloggt");

  db.run("DELETE FROM clips WHERE id = ? AND user_id = ?", [req.params.id, req.session.user.id], () => {
    res.sendStatus(200);
  });
});

// ===== ADMIN =====

app.get("/api/admin/users", (req, res) => {
  if (!req.session.user?.is_admin) return res.sendStatus(403);

  db.all("SELECT * FROM users", (err, rows) => {
    res.json(rows);
  });
});

app.post("/api/admin/approve/:id", (req, res) => {
  if (!req.session.user?.is_admin) return res.sendStatus(403);

  db.run("UPDATE users SET approved = 1 WHERE id = ?", [req.params.id], () => {
    res.sendStatus(200);
  });
});

app.delete("/api/admin/user/:id", (req, res) => {
  if (!req.session.user?.is_admin) return res.sendStatus(403);

  db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => {
    res.sendStatus(200);
  });
});

// ===== SERVER =====

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server läuft auf " + PORT));
