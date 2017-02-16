/*
 * Coin game server.
 *
 * This is the entry point for the Node.js application.
 */

const express = require('express');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const game = require('./server/game');

// Images, scripts, stylesheets, and other assets will be in this directory.
app.use(express.static('public'));

// The client application lives on a single HTML page.
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});

io.on('connection', (socket) => {

  /** /
  game.state((error, state) => {
      if (error) {
        console.error(error);
      }
      console.log("state ========");
      console.log(state);
  });
  game.addPlayer('testName', (error, result) => {
      if (error) {
        throw error;
      } else {
        console.log("Successfully added player? ============");
        console.log(result);
      }
  });

  game.move('U', 'testName', (error) => {
    if (error) {
      throw error;
    }
    game.state((error, state) => {
      if (error) {
        throw error;
      }
      console.log("state after move ========");
      console.log(state);
    });
  });
  /**/

  // When first connected, don't accept any messages except `name`. Keep accepting name
  // messages until a name is accepted. When a name is finally accepted, send a `welcome`
  // message and a the current game state, "turn off" the `name` message listener, then
  // start accepting `move` messages.

  /**/
    const nameListener = (name) => {
      const trimmedName = name.trim();
      game.addPlayer(trimmedName, (error, result) => {
        if (!result) {
          io.to(socket.id).emit('badname', trimmedName);
          return;
        }
        io.to(socket.id).emit('welcome');
        game.state((error, state) => {
          if (error) {
            throw error;
          }
          io.emit('state', state);
        });
        socket.removeListener('name', nameListener);
        socket.on('move', (direction) => {
          game.move(direction, trimmedName, (error) => {
            if (error) {
              throw error;
            }
            game.state((error, state) => {
              if (error) {
                throw error;
              }
              if (!state.positions) {
                io.emit('gameover', state);
              } else {
                io.emit('state', state);
              }
            });
          }); 
          // io.emit('state', game.state()); // state() returns everything, scores, players, moves - current state of the game
        });
      });
    };
    socket.on('name', nameListener);
    /**/
});

// io.on() means listen from everyone 
// socket.on() means listen from a specific client

// It begins (https://xkcd.com/1656/)
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
