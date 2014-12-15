var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var db = require("./models/index");
var express = require("express");
var app = express();
var http = require("http").Server(app);
var flash = require("connect-flash");
var io = require("socket.io")(http);
var passport = require("passport");
var session = require("express-session");
var LocalStrategy = require("passport-local").Strategy;

// ----------
// Middleware
// ----------
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: "session secret",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ----------------
// Passport Helpers
// ----------------
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  db.User.find(id).then(function(user) {
    done(null, user);
  }).catch(function (error) {
    done(error);
  });
});
function isLoggedIn (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}
passport.use("local-signup", new LocalStrategy({
  usernameField: "username",
  passwordField: "password",
  passReqToCallback: true
}, function(req, username, password, done) {
  db.User.find({
    where: {username: username}
  }).then(function (user) {
    if (user) {
      done(null, false, req.flash("signupMessage", "That username is already taken."));
    } else {
      db.User.create({
        username: username,
        password: db.User.generateHash(password)
      }).then(function (newUser) {
        done(null, newUser);
      }).catch(function (error) {
        done(error);
      });
    }
  }).catch(function (error) {
    return done(error);
  });
}));
passport.use("local-login", new LocalStrategy({
  usernameField : "username",
  passwordField : "password",
  passReqToCallback : true
}, function(req, username, password, done) {
  db.User.find({
    where: {username: username}
  }).then(function (user) {
    if (!user) {
      return done(null, false, req.flash("loginMessage", "No user found."));
    }
    if (!user.validPassword(password)) {
      return done(null, false, req.flash("loginMessage", "Oops! Wrong password."));
    }
    return done(null, user);
  }).catch(function (error) {
    return done(error);
  });
}));

// ------------
// Login Routes
// ------------
app.get("/login", function(req, res) {
  res.render("login.ejs", {message: req.flash("loginMessage")});
});
app.get("/signup", function(req, res) {
  res.render("signup.ejs", {message: req.flash("signupMessage")});
});
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});
app.post("/login", passport.authenticate("local-login", {
  successRedirect : "/",
  failureRedirect : "/login",
  failureFlash : true
}));
app.post("/signup", passport.authenticate("local-signup", {
  successRedirect: "/",
  failureRedirect: "/signup",
  failureFlash: true
}));

// --------------
// Routes
// --------------
app.get("/", isLoggedIn, function(req, res){
  db.User.all().then(function (users) {
    res.sendFile(__dirname + "/index.html");
  });
});

io.on("connection", function(socket){
  console.log("a user connected");
  var nickname = "anonymous user";
  socket.on("nickname", function (nick) {
    nickname = nick || nickname;
    socket.broadcast.emit("connect message", nickname + " connected");
  });
  socket.on("chat message", function (msg) {
    console.log("message: " + msg);
    socket.broadcast.emit("chat message", nickname + ": " + msg);
  });
  socket.on("disconnect", function () {
    console.log("a user disconnected");
    socket.broadcast.emit("connect message", nickname + " disconnected");
  });
});

http.listen(3000, function(){
  console.log("listening on *:3000");
});
