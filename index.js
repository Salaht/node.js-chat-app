var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var users = {};
var oldMessages = {};
var rooms = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function addZero(number){
  if(number < 10){
      return "0" + number;
  } else {
      return number;
  }
}

io.on('connection', function(socket){
  socket.on('oldMessages', function(msg){
      socket.emit('oldMessages', oldMessages[socket.room]);
  });

  function getTime() {
    var currentdate = new Date();
    var minutes = currentdate.getMinutes();
    var hours = currentdate.getHours();
    return addZero(hours) + ":" + addZero(minutes); 
  }

  socket.on('new name', function(name){
    if (name.toLowerCase() in users) {
      socket.emit('usernameFail', name);
    } else {
      socket.username = name;
      socket.emit('username', name);
    };
  });

  function userList(){
    io.in(socket.room).emit('userList', users[socket.room]);
  }

  socket.on('chat message', function(msg){
    if (typeof socket.username !== 'undefined') {
      if (msg.trim().length === 0) {
      // do nothing
      } else {
        oldMessages[socket.room].push("<li><p><b>" + getTime() + " " + socket.username + ":</b> " + msg + "</p></li>");
        io.in(socket.room).emit('chat message', {msg: msg, username: socket.username, time: getTime()});
      };
    } else {
      socket.emit('chat message fail');
    }
  });

  socket.on('disconnect', function(msg){
    if (typeof socket.username !== 'undefined') {
      var removeUser = users[socket.room].indexOf(socket.username);
      if (removeUser !== -1) {
        users[socket.room].splice(removeUser, 1);
        userList();
      }
    }
  });

  socket.on('roomList', function(msg){
    roomList();
  });

  socket.on('new room', function(name){
    rooms.push(name);
    socket.room = name;
    socket.join(name);
    oldMessages[socket.room] = [];
    users[socket.room] = [];
    users[socket.room].push(socket.username);
    updateChannelName();
    roomList();
    userList();

    socket.emit('chat message', {msg: 'You have created Room: ' + name + '.', username: socket.username, time: getTime()});
    socket.emit('joinedRoom');
  });

  socket.on('joinRoom', function(name){
    socket.room = name;
    socket.join(name);
    users[socket.room].push(socket.username);
    updateChannelName();
    userList();

    socket.emit('chat message', {msg: 'You have joined Room: ' + name + '.', username: socket.username, time: getTime()});
    socket.emit('joinedRoom');
  });

  function updateChannelName(){
    socket.emit('updateChannelName', socket.room);
  }

  function roomList(){
    io.emit('roomList', rooms);
  }
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});