const PLAYER_STATUS = {
    SAFE: "safe",
    ELIMINATED: "eliminated",
    WINNER: "winner",
};

class Player {
    constructor(socketId, userRecord) {
        // UserRecord {
        //   uid: "mnoNB9rqpAO40sZ0bQRHgQQObXJ2",
        //   email: undefined,
        //   emailVerified: false,
        //   displayName: undefined,
        //   photoURL: undefined,
        //   phoneNumber: undefined,
        //   disabled: false,
        //   metadata:
        //    UserMetadata {
        //      creationTime: "Thu, 04 Jul 2019 23:42:07 GMT",
        //      lastSignInTime: "Thu, 04 Jul 2019 23:42:07 GMT" },
        //   providerData: [],
        //   passwordHash: undefined,
        //   passwordSalt: undefined,
        //   customClaims: undefined,
        //   tokensValidAfterTime: undefined
        // }
        this.uid = userRecord.uid;
        this.displayName = userRecord.displayName || null;
        // this.photoURL = userRecord.photoURL || null;
        this.score = 0;
        this.status = PLAYER_STATUS.SAFE;
        this.socketId = socketId;
    }

    isSafe() {
        return this.status == PLAYER_STATUS.SAFE;
    }

    eliminate() {
        this.status = PLAYER_STATUS.ELIMINATED;
    }

    updateScore(points) {
        this.score += points;
    }

    win() {
        this.status = PLAYER_STATUS.WINNER;
    }

    getProperties() {
        return {
            uid: this.uid,
            displayName: this.displayName,
            // photoURL: this.photoURL,
            score: this.score,
            status: this.status,
        };
    }
}

module.exports = Player;
