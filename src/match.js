const { v4: uuidv4 } = require("uuid");
const io = require("./utils/socket");
const SOCKET_EVENT = require("./utils/socket-events");
const { timer, Subject, fromEvent } = require("rxjs");
const Player = require("./player");
const {
    map,
    take,
    tap,
    takeUntil,
    throttleTime,
    filter,
} = require("rxjs/operators");

const MATCH_STATUS = {
    WAITING: "waiting",
    READY: "ready",
    PLAYING: "playing",
    FINISHED: "finished",
};

const MAX_PLAYERS_PER_MATCH = 20;
const WAITING_TIME = 20; // seconds
const READY_TIME = 5; // seconds
const PLAYING_TIME = 20; // seconds

class Match {
    constructor(onFinish) {
        this.id = uuidv4();
        this.status = MATCH_STATUS.WAITING;
        this.onFinish = onFinish;
        this.players = {};
        this.numberOfPlayers = 0;
        this.isFullSubject = new Subject();
        this.broadcastPlayersSubject = new Subject();

        this.setupWaitingInterval();
        this.broadcastPlayersSubject
            .pipe(throttleTime(50))
            .subscribe(() =>
                io
                    .in(this.id)
                    .emit(SOCKET_EVENT.UPDATE_PLAYER_LIST, this.getPlayers())
            );
    }

    // Public functions
    isFull() {
        return this.numberOfPlayers >= MAX_PLAYERS_PER_MATCH;
    }

    isWaiting() {
        return this.status === MATCH_STATUS.WAITING;
    }

    addPlayer(socket, userRecord) {
        socket.join(this.id);

        // Add and broadcast players information
        this.players[socket.id] = new Player(socket.id, userRecord);
        this.numberOfPlayers++;
        this.broadcastPlayers();

        // Emit a full event when the players are enough
        if (this.isFull()) {
            this.isFullSubject.next();
            this.isFullSubject.complete();
        }

        // Disconnection handler
        // this.disconnectSubscription = fromEvent(socket, SOCKET_EVENT.DISCONNECT)
        //     .pipe(
        //         filter(() => this.status === MATCH_STATUS.WAITING),
        //         tap((reason) =>
        //             console.log(
        //                 `Socket ${socket.id} is disconnected (Reason: ${reason})`
        //             )
        //         )
        //     )
        //     .subscribe(() => {
        //         this.removePlayer(socket);
        //     });

        // Update score handler
        this.updateScoreSubscription = fromEvent(
            socket,
            SOCKET_EVENT.UPDATE_SCORE
        ).subscribe((points) => {
            if (this.status === MATCH_STATUS.FINISHED) return;
            this.players[socket.id].updateScore(points);
            this.broadcastPlayers();
        });
    }

    removePlayer(socket) {
        if (this.status == MATCH_STATUS.WAITING) {
            delete this.players[socket.id];
            this.numberOfPlayers--;
        }
        this.broadcastPlayers();
    }

    getPlayers() {
        return Object.values(this.players);
    }

    // Private functions

    broadcastPlayers() {
        this.broadcastPlayersSubject.next();
    }

    setMatchStatus(status) {
        this.status = status;
        io.in(this.id).emit(SOCKET_EVENT.MATCH_STATUS_CHANGED, status);
    }

    createTimerSource(time) {
        return timer(0, 1000).pipe(
            map((x) => time - x),
            take(time + 1),
            tap((x) => io.in(this.id).emit(SOCKET_EVENT.TIMER, x))
        );
    }

    setupWaitingInterval() {
        this.createTimerSource(WAITING_TIME)
            .pipe(takeUntil(this.isFullSubject))
            .subscribe({
                complete: () => {
                    if (this.numberOfPlayers === 0) {
                        this.finishMatch();
                    } else if (this.numberOfPlayers > 1) {
                        this.setMatchStatus(MATCH_STATUS.READY);
                        this.setupReadyInterval();
                    } else {
                        this.setupWaitingInterval();
                    }
                },
            });
    }

    setupReadyInterval() {
        this.createTimerSource(READY_TIME).subscribe({
            complete: () => {
                this.setMatchStatus(MATCH_STATUS.PLAYING);
                this.setupPlayingInterval();
            },
        });
    }

    setupPlayingInterval() {
        this.createTimerSource(PLAYING_TIME).subscribe({
            complete: () => {
                this.eliminatePlayers();
                this.broadcastPlayers();
                if (this.status === MATCH_STATUS.FINISHED) {
                    this.finishMatch();
                } else {
                    this.setupPlayingInterval();
                }
            },
        });
    }

    calcNoOfPlayersToEliminate(currentNumberOfPlayers) {
        return Math.floor(currentNumberOfPlayers / 2);
    }

    calcMinimumAcceptanceScore() {
        const scores = Object.values(this.players)
            .map((p) => {
                if (p.isSafe()) {
                    return p.score;
                }
                return null;
            })
            .filter((score) => {
                return score != null;
            });

        const noOfPlayersToEliminate = this.calcNoOfPlayersToEliminate(
            scores.length
        );

        scores.sort();

        return scores[noOfPlayersToEliminate - 1] + 1;
    }

    eliminatePlayers() {
        const minScore = this.calcMinimumAcceptanceScore();

        // list of players whose score are smaller than the minimum
        const toBeEliminatedPlayers = Object.values(this.players).filter(
            (p) => p.isSafe() && p.score < minScore
        );

        const nSafePlayers = Object.values(this.players).filter((p) =>
            p.isSafe()
        ).length;

        // can"t eliminate all players, keep fighting
        if (toBeEliminatedPlayers.length === nSafePlayers) {
            return;
        }

        toBeEliminatedPlayers.forEach((p) => p.eliminate());

        // remaining safe players
        const safePlayers = Object.values(this.players).filter((p) =>
            p.isSafe()
        );

        if (safePlayers.length === 1) {
            safePlayers[0].win();
            this.setMatchStatus(MATCH_STATUS.FINISHED);
        }
    }

    finishMatch() {
        // this.disconnectSubscription.unsubscribe();
        this.updateScoreSubscription.unsubscribe();
        this.onFinish(this);
    }
}

module.exports = Match;
