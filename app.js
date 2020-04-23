require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://kash123:kash123@users-xbc0s.mongodb.net/test?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  }
);

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret :  process.env.SECRET , encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      // userProfileURL: "https://www.google.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  /*if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }*/
  User.find({"secret" : {$ne: null}},(err,foundSecret)=>{
    if(err){
      console.log(err);
    }else{
      if(foundSecret){
        res.render("secrets",{userWithSecrets: foundSecret});
      }
    }
  });
});

app.get("/submit",(req,res)=>{
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    }
  );

  /*bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    const newUser = new User({
      email: req.body.username,
      password: hash,
    });
    // console.log(newUser);

    newUser.save((err) => {
      if (!err) {
        res.render("secrets");
      } else {
        console.log(err);
      }
    });
  });*/
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    passport: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });

  /*const username = req.body.username;
  const password = req.body.password;

  User.findOne(
    {
      email: username,
    },
    (err, foundUser) => {
      if (!err) {
        if (foundUser) {
          bcrypt.compare(password, foundUser.password, function (err, result) {
            if (result === true) {
              res.render("secrets");
            }
          });
        }
      } else {
        console.log(err);
      }
    }
  );*/
});

app.post("/submit",(req,res)=>{
  const submittedSecret = req.body.secret;

  console.log(req.user);
  User.findById(req.user.id,(err,foundUser)=>{
    if(!err){
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
          res.redirect("/secrets");
        });
      }
    }else{
      console.log(err);
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, (req, res) => {
    console.log("server started successfully");
});
