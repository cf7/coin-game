/*
 * Server side game module. Maintains the game state and processes all the messages from clients.
 *
 * Exports:
 *   - addPlayer(name)
 *   - move(direction, name)
 *   - state()
 */

const { clamp, randomPoint, permutation } = require('./gameutil');
const redis = require ('redis').createClient();
const WIDTH = 64;
const HEIGHT = 64;
const MAX_PLAYER_NAME_LENGTH = 32;
const NUM_COINS = 100;


redis.on("error", function (error) {
  console.error(`Error: ${error}`);
});

/*
  For testing:
  use redis.select()
  write integration tests

  start redis instance
  flush db
  insert data
  test data
  flush db again when finished

  have game play on 0
  have tests on a different index
*/

// A KEY-VALUE "DATABASE" FOR THE GAME STATE.
//
// The game state is maintained in an object. Your homework assignment is to swap this out
// for a Redis database.
//
// In this version, the players never die. For homework, you need to make a player die after
// five minutes of inactivity. You can use the Redis TTL for this.
//
// Here is how the storage is laid out:
//
// player:<name>    string       "<row>,<col>"
// scores           sorted set   playername with score
// coins            hash         { "<row>,<col>": coinvalue }
// usednames        set          all used names, to check quickly if a name has been used
//

// replace this object with Redis
const database = {
  scores: {},
  usednames: new Set(),
  coins: {},
};

exports.addPlayer = (name) => {                                     // sys.member check, replace with Redis
  if (name.length === 0 || name.length > MAX_PLAYER_NAME_LENGTH || database.usednames.has(name)) {
    return false;
  }
  redis.sadd('usednames', name);
  database.usednames.add(name);

  redis.hset('players', `${name}`, randomPoint(WIDTH, HEIGHT).toString());
  database[`player:${name}`] = randomPoint(WIDTH, HEIGHT).toString();
  // ^^^ SADD call

  redis.zadd('scores', name, 0);
  database.scores[name] = 0;
  // ^^^ ZADD sorted set

  return true;
};

function placeCoins() {
  permutation(WIDTH * HEIGHT).slice(0, NUM_COINS).forEach((position, i) => {
    const coinValue = (i < 50) ? 1 : (i < 75) ? 2 : (i < 95) ? 5 : 10;
    const index = `${Math.floor(position / WIDTH)},${Math.floor(position % WIDTH)}`;
    database.coins[index] = coinValue;
    redis.hset("coins", index, coinValue, redis.print);
  });
}

// Return only the parts of the database relevant to the client. The client only cares about
// the positions of each player, the scores, and the positions (and values) of each coin.
// Note that we return the scores in sorted order, so the client just has to iteratively
// walk through an array of name-score pairs and render them.
exports.state = () => {
  // let positions = [];
  const positions = Object.entries(database) // iterator over key-value pairs
                          .filter(([key]) => key.startsWith('player:'))
                          .map(([key, value]) => [key.substring(7), value]); // remove 'player:'
  redis.hgetall('players', function (error, players) {
      // positions = Object.entries(players) // iterator over key-value pairs
      //             .filter(([key]) => key.startsWith('player:'))
      //             .map(([key, value]) => [key.substring(7), value]); // remove 'player:'
      console.log("players");
      console.log(players);
  });
  

  const scores = Object.entries(database.scores);
  scores.sort(([, v1], [, v2]) => v2 - v1); // pass comparator to the sort(), sort descending order
  // ZREVRANGE equivalent
  redis.zrevrange(['scores', 0, -1, 'WITHSCORES'], function (error, scores) {
      if (error) {
        throw error;
      }
      console.log("scores");
      console.log(scores);
  });

  return {
    positions,
    scores,
    coins: database.coins,
  };
};

exports.move = (direction, name) => {
  const delta = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] }[direction];
  if (delta) {
    const playerKey = `player:${name}`;
    const [x, y] = database[playerKey].split(',');
    redis.hget('players', playerKey, console.log);
    const [newX, newY] = [clamp(+x + delta[0], 0, WIDTH - 1), clamp(+y + delta[1], 0, HEIGHT - 1)];
    const value = database.coins[`${newX},${newY}`];
    redis.hget('coins', `${newX},${newY}`, console.log);
    if (value) {
      // hget scores name
      // hincrby scores name incrvalue
      redis.zincrby('scores', value, name);
      database.scores[name] += value;
      // hdel coins "x,y"
      redis.hdel('coins', `${newX},${newY}`);
      delete database.coins[`${newX},${newY}`];
    }
    // hset players 'name' 'x,y'
    // remove substring() after switch to Redis
    redis.hset('players', playerKey.substring(7), `${newX},${newY}`);
    database[playerKey] = `${newX},${newY}`;

    // When all coins collected, generate a new batch.
    redis.hgetall('coins', function (error, coins) { 
        console.log(coins);
    });

    if (Object.keys(database.coins).length === 0) {
      placeCoins();
    }
  }
};

placeCoins();

redis.smembers("usednames", function (error, object) {
  console.log(object);
});
