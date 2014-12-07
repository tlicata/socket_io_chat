var express = require("express")
var http = require("http");
var socket = require("socket.io");

var app = express();
var server = http.Server(app);
var io = socket(server);

app.get("/", function(req, res){
  res.sendFile(__dirname + "/index.html");
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

server.listen(3000, function(){
  console.log("listening on *:3000");
});
