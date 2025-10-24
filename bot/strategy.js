function getOppositeDirection(dir) {
    const oppositeMap = {
      'UP': 'DOWN',
      'DOWN': 'UP', 
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    };
    return oppositeMap[dir] || 'UP'; // Default UP
}

module.exports = {
    getOppositeDirection
};