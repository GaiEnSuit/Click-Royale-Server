const admin = require("./utils/firebase");
const SOCKET_EVENT = require("./utils/socket-events");
const Match = require("./match");

class Game {
    constructor() {
        this.matches = {};
        this.latestMatch = null;
    }

    join(socket, idToken, ackFn) {
        admin
            .auth()
            .verifyIdToken(idToken)
            .then((decodedToken) => admin.auth().getUser(decodedToken.uid))
            .then((userRecord) => {
                const match = this.getJoinableMatch();
                match.addPlayer(socket, userRecord);
                ackFn({
                    matchId: match.id,
                    matchStatus: match.status,
                    players: match.getPlayers(),
                });
            })
            .catch((error) => {
                console.log(error)
                socket.emit(SOCKET_EVENT.ERROR, error);
            });
    }

    leave(socket, matchId, ackFn) {
        const match = this.matches[matchId];
        if (match) {
            match.removePlayer(socket);
            ackFn(true);
            console.log(
                `Socket ${socket.id} has left the match ${matchId} successfully`
            );
        } else {
            ackFn(false);
        }
    }

    getJoinableMatch() {
        if (
            this.latestMatch &&
            !this.latestMatch.isFull() &&
            this.latestMatch.isWaiting()
        ) {
            return this.latestMatch;
        }
        const match = new Match(this.onMatchFinishedCallback.bind(this));
        this.latestMatch = match;
        this.matches[match.id] = match;
        console.log(`Match ${match.id} is created`);
        return match;
    }

    onMatchFinishedCallback(match) {
        if (this.latestMatch === match) {
            this.latestMatch = null;
        }

        if (match.getPlayers().length !== 0) {
            admin
                .firestore()
                .collection("matches")
                .add({
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    players: match
                        .getPlayers()
                        .map((player) => player.getProperties()),
                })
                .then((docRef) => {
                    console.log("Document written with ID: ", docRef.id);
                })
                .catch((error) => {
                    console.log("Error adding document: ", error);
                });
        }

        delete this.matches[match.id];

        console.log(`Match ${match.id} is finished`);
    }
}

module.exports = Game;
