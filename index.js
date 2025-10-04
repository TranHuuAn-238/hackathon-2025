require('dotenv').config();
const io = require('socket.io-client');

const socket = io(process.env.SOCKET_SERVER, {
  auth: { token: process.env.TOKEN }
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('join', {});
});

