require('dotenv').config();
const io = require('socket.io-client');

const socket = io(process.env.SOCKET_SERVER, {
  auth: { token: process.env.TOKEN }
});

let myUID = null;
let myPos = { x: 0, y: 0 };
let currentDir = null;
const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const botName = 'BomberBoy';

function randomDir() {
  return dirs[Math.floor(Math.random() * dirs.length)];
}
function changeDir() {
  let dir;
  do { dir = randomDir(); } while (dir === currentDir);
  currentDir = dir;
}
function startMove() {
  setInterval(() => {
    if (currentDir) socket.emit('move', { orient: currentDir });
  }, 10);
}
function scheduleChange() {
  const t = Math.floor(Math.random() * 2000) + 1000; // 1–3s
  setTimeout(() => { changeDir(); scheduleChange(); }, t);
}

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('join', {});
});

socket.on('user', (data) => {
  const me = data.bombers.find(b => b.name === botName);
  if (me) {
    myUID = me.uid;
    myPos = { x: me.x, y: me.y };
    console.log('Founded bot:', myUID);
  }

  currentDir = randomDir();
  startMove();
  scheduleChange();
});

// Production
// socket.on('start', () => {
//   currentDir = randomDir();
//   startMove();
//   scheduleChange();
// });

socket.on('player_move', (d) => {
  if (d.uid === myUID) {
    if (myPos.x === d.x && myPos.y === d.y) {
      socket.emit('place_bomb');
      changeDir();
    }
    myPos = { x: d.x, y: d.y };
  }
});

socket.on('new_bomb', (b) => {
  if (b.uid !== myUID) {
    const sameX = Math.abs(b.x - myPos.x) <= 16;
    const sameY = Math.abs(b.y - myPos.y) <= 16;
    if (sameX || sameY) changeDir();
  }
});
