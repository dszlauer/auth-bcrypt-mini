const express = require("express");
const bodyPaser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const massive = require("massive");

require("dotenv").config();
const app = express();
massive(process.env.CONNECTION_STRING).then(db => app.set("db", db));

app.use(bodyPaser.json());
app.use(
  session({
    secret: "mega hyper ultra secret",
    saveUninitialized: false,
    resave: false
  })
);
app.use(express.static(`${__dirname}/../build`));

app.post("/register", (req, res) => {
  const db = req.app.get("db");
  const { username, password } = req.body;

  bcrypt.hash(password, saltRounds).then(hashedPassword => {
    db.create_user([username, hashedPassword])
      .then(() => {
        req.session.user = { username };
        res.status(200).json(req.session.user);
      })
      .catch(error => {
        if (error.message.match(/duplicate key/)) {
          res.status(409).json({ message: "That user already exists" });
        } else {
          res.status(500).json({
            message:
              "An error occurred on the server, sending FBI to your house!!!!!!"
          });
        }
      });
  });
});

app.post("/login", (req, res) => {
  const db = req.app.get("db");
  const { username, password } = req.body;

  db.find_user(username).then(user => {
    if (user.length) {
      bcrypt.compare(password, user[0].password).then(passwordMatch => {
        if (passwordMatch) {
          req.session.user = { username: user[0].username };
          res.status(200).json(req.session.user);
        } else {
          res.status(403).json({ message: "invalid password" });
        }
      });
    } else {
      res
        .status(403)
        .json({ message: "I dont know know who that is!!! get outta here!" });
    }
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.status(200).end();
});

function ensureLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(403).json({ message: "You are not authorized" });
  }
}

app.get("/secure-data", ensureLoggedIn, (req, res) => {
  res.json({ someSecureData: 123 });
});

const PORT = 3030;
app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});
