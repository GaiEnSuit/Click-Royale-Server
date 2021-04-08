const server = require("../server");
const io = require("socket.io")(server);

module.exports = io;
