app.use(express.json());

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false
}));

app.get("/auth/twitch", (req, res) => {
  const redirect = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.BASE_URL}/auth/twitch/callback&response_type=code&scope=`;
  res.redirect(redirect);
});

app.get("/auth/twitch/callback", async (req, res) => {
  res.redirect("/dashboard.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server läuft auf " + PORT));

app.get("/api/clips", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("Nicht eingeloggt");

  db.all("SELECT * FROM clips WHERE user_id = ?", [user.id], (err, rows) => {
    if (err) return res.status(500).send("DB Fehler");
    res.json(rows);
  });
});

app.post("/api/clips", (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).send("Nicht eingeloggt");

  const { link } = req.body;

  if (!link) return res.status(400).send("Kein Link");

  db.get("SELECT COUNT(*) as count FROM clips WHERE user_id = ?", [user.id], (err, row) => {
    if (row.count >= 5) {
      return res.status(400).send("Max 5 Clips erreicht");
    }

    db.run("INSERT INTO clips (user_id, link) VALUES (?, ?)", [user.id, link], (err) => {
      if (err) return res.status(500).send("DB Fehler");
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
    (err) => {
      if (err) return res.status(500).send("DB Fehler");
      res.sendStatus(200);
    }
  );
});


// update
// force update
