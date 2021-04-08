const app = require("./app");
const http = require("http");
const https = require("https");
const fs = require("fs");

let server = null;

if (process.env.NODE_ENV == "development") {
    server = http.Server(app);
} else {
    server = https.createServer(
        {
            key: fs.readFileSync(process.env.KEY, "utf-8"),
            cert: fs.readFileSync(process.env.CERT, "utf-8"),
        },
        app
    );
}

module.exports = server;
