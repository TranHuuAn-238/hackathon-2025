require('dotenv').config();
const io = require('socket.io-client');

const socket = io(process.env.SOCKET_SERVER, {
  auth: { token: process.env.TOKEN }
});

let myUID = null;
let myPos = { x: 0, y: 0 };
let currentDir = null;
let moveInterval = null;
let waitingForExplode = false;
let escaping = false;
let canPlaceBomb = false;
const ESCAPE_MS = 4000;
const BOMB_LIFE_MS = 5000;
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
  if(moveInterval) clearInterval(moveInterval);
  moveInterval = setInterval(() => {
    if (currentDir && !waitingForExplode) socket.emit('move', { orient: currentDir });
  }, 17);
}

function stopMove() {
  if(moveInterval) { clearInterval(moveInterval); moveInterval = null; }
}

function scheduleChange() {
  const t = Math.floor(Math.random() * 2000) + 1000; // 1–3s
  setTimeout(() => { changeDir(); scheduleChange(); }, t);
}

// Select the escape direction and run during ESCAPE_MS time
function runEscapeFrom(bombX, bombY){
  if(escaping) return;
  escaping = true;
  waitingForExplode = false;

  // simple heuristic
  const dx = myPos.x - bombX;
  const dy = myPos.y - bombY;

  let escapeDir;
  if(Math.abs(dx) >= Math.abs(dy)){
    escapeDir = dx >= 0 ? 'RIGHT' : 'LEFT'; //
  } else {
    escapeDir = dy >= 0 ? 'DOWN' : 'UP'; //
  }

  // Runnn
  currentDir = escapeDir;
  startMove();

  setTimeout(() => {
    stopMove();
    waitingForExplode = true;
    escaping = false;
  }, ESCAPE_MS);
}

// socket.on('connect', () => {
  socket.emit('join', {});
  console.log('Connected!');
// });

socket.on('user', (data) => {
  const me = data.bombers.find(b => b.name === botName);
  if (me) {
    myUID = me.uid;
    myPos = { x: me.x, y: me.y };
    console.log('Founded bot:', myUID);
  }

  currentDir = randomDir();
  startMove();
  // scheduleChange();

  setTimeout(() => {
    canPlaceBomb = true;
  }, 5000);
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
      // dang chay bom thi khong dat nua và item pha duoc
      if (!waitingForExplode && canPlaceBomb) {
        socket.emit('place_bomb');
      }
      changeDir();
    }
    myPos = { x: d.x, y: d.y };
  }
});

socket.on('new_bomb', (bomb) => {
  if(!bomb) return;
  if(bomb.uid === myUID){
    runEscapeFrom(bomb.x, bomb.y);
  } else {
    const sameX = Math.abs(bomb.x - myPos.x) <= 16;
    const sameY = Math.abs(bomb.y - myPos.y) <= 16;
    if(sameX || sameY){
      // runEscapeFrom(bomb.x, bomb.y);
      changeDir();
    }
  }
});

socket.on('bomb_explode', (bomb) => {
  if(!bomb) return;
  if(bomb.uid === myUID && waitingForExplode){
    // resume move
    waitingForExplode = false;
    currentDir = randomDir();
    startMove();
    // scheduleChange();
  }
});
