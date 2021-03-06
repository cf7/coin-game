/*
 * Server side game module. Maintains the game state and processes all the messages from clients.
 *
 * Exports:
 *   - addPlayer(name)
 *   - move(direction, name)
 *   - state()
 */

const { clamp, randomPoint, permutation, zip, evenArrayToObject } = require('./gameutil');
const redis = require('redis').createClient();

const WIDTH = 64;
const HEIGHT = 64;
const MAX_PLAYER_NAME_LENGTH = 32;
const NUM_COINS = 100;

/*
  Redis is Asynchronous!!!!!
  (i.e. it requires callbacks)
*/

redis.on('error', (error) => {
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


exports.addPlayer = (name, callback) => {
  redis.sismember('usednames', name, (error, result) => {
    if (error) {
      callback(error);
    } else if (name.length === 0 || name.length > MAX_PLAYER_NAME_LENGTH || result) {
      callback(null, false);
    } else {
      redis.sadd('usednames', name);

      redis.set(`player:${name}`, randomPoint(WIDTH, HEIGHT).toString());

      redis.zadd('scores', 0, name);

      callback(null, true);
    }
  });
};

function placeCoins() {
  let coins = [];
  permutation(WIDTH * HEIGHT).slice(0, NUM_COINS).forEach((position, i) => {
    const coinValue = (i < 50) ? 1 : (i < 75) ? 2 : (i < 95) ? 5 : 10;
    const index = `${Math.floor(position / WIDTH)},${Math.floor(position % WIDTH)}`;
    coins.push(index);
    coins.push(coinValue);
  });
  redis.hmset("coins", coins, (error, result) => {
    if (error) {
      throw error;
    }
  });
}

// Return only the parts of the database relevant to the client. The client only cares about
// the positions of each player, the scores, and the positions (and values) of each coin.
// Note that we return the scores in sorted order, so the client just has to iteratively
// walk through an array of name-score pairs and render them.
exports.state = (callback) => {
  redis.keys('player:*', (error, players) => {
    if (error) {
      callback(error);
    }

    if (players.length !== 0) {
      redis.mget(players, (error, values) => {
        if (error) {
          callback(error);
        }
        let positions = zip(players, values).map(([key, value]) => [key.substring(7), value]);
        redis.zrevrange(['scores', 0, -1, 'WITHSCORES'], (error, scores) => {
          if (error) {
            callback(error);
          }

          scores = evenArrayToObject(scores);

          redis.hgetall('coins', (error, coins) => {
            if (error) {
              callback(error);
            }
            return callback(null, { positions, scores, coins });
          });
        });
      });
    } else {
      redis.zrevrange(['scores', 0, -1, 'WITHSCORES'], (error, scores) => {
        if (error) {
          callback(error);
        }

        scores = evenArrayToObject(scores);

        redis.hgetall('coins', (error, coins) => {
          if (error) {
            callback(error);
          }
          return callback(null, { scores, coins });
        });
      });
    }
  });
};

exports.move = (direction, name, callback) => {
  const delta = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] }[direction];
  if (delta) {
    redis.get(`player:${name}`, (error, position) => {
      if (error) {
        callback(error);
      }
      if (position) {
        const [x, y] = position.split(',');
        const [newX, newY] = [clamp(+x + delta[0], 0, WIDTH - 1), clamp(+y + delta[1], 0, HEIGHT - 1)];
        redis.hget('coins', `${newX},${newY}`, (error, value) => {
          if (error) {
            callback(error);
          }
          if (value) {
            redis.zincrby('scores', value, name);
            redis.hdel('coins', `${newX},${newY}`);
          }
          redis.set(`player:${name}`, `${newX},${newY}`);
          redis.expire(`player:${name}`, 30);

          // When all coins collected, generate a new batch.
          redis.hgetall('coins', (error, coins) => {
            if (error) {
              callback(error);
            }
            if (Object.keys(coins).length === 0) {
              placeCoins();
            }
            callback(null);
          });
        });
      } else {
        callback(null);
      }
    });
  }
};

placeCoins();
