require("dotenv").config();

const server = require("./src/server");

const SOCKET_EVENT = require("./src/utils/socket-events");
const Game = require("./src/game");
const io = require("./src/utils/socket");

const PORT = process.env.PORT || 80;

server.listen(PORT, () => {
    console.log("App is running on port: " + PORT);
});

const game = new Game();

io.on(SOCKET_EVENT.CONNECT, (socket) => {
    console.log(`Socket ${socket.id} is connected`);

    socket.on(SOCKET_EVENT.JOIN_GAME, (idToken, fn) => {
        game.join(socket, idToken, fn);
    });

    socket.on(SOCKET_EVENT.LEAVE_GAME, (matchId, fn) => {
        game.leave(socket, matchId, fn);
    });

    socket.on(SOCKET_EVENT.ERROR, (error) => {
        console.error(error);
    });
});
