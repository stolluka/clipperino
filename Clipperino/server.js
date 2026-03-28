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
  res.send("Login funktioniert!");
});

app.listen(3000, () => console.log("Server läuft"));