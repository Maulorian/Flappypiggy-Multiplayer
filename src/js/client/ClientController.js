class ClientController {
    constructor(scene, socket) {
        this.scene = scene;
        this.socket = socket;

        this.pendingInputs = [];
        this.running = false;

        this.inputHistory = [];
        this.clientStep = 0;
        this.running = false;


        this.previousPhysics = 0;
        this.lagPhysics = 0;

        this.initializeNetworking();
    }

    initializeNetworking() {
        this.socket.on('updateState', serverState => this.onServerUpdate(serverState));
        this.socket.on('localPlayerNumber', number => this.localPlayerNumber = number);
        this.socket.on('newMatch', serverState => this.onNewMatch(serverState));
    }

    onServerUpdate(serverState) {
        this.serverState = this.getCopy(serverState);
        this.serverReconciliation();
    }

    onNewMatch(serverState) {
        console.log("[MATCH FOUND]");
        this.currentState = this.getCopy(serverState);
        this.setListeners();
        //initialize Scene
        this.scene.initialize(this.currentState, this.localPlayerNumber);
        this.scene.displayMessage(this.scene.annoncer, 'Match Found !');
        this.socket.on('won', () => this.scene.displayMessage(this.scene.annoncer, 'You Won !'));
        this.socket.on('lost', () => this.scene.displayMessage(this.scene.annoncer, 'You Lost !'));
        this.socket.on('countdown', count => {
            switch (count) {
                case 0:
                    this.scene.displayMessage(this.scene.annoncer, 'Go !');
                    this.running = true;
                    break;
                case -1:
                    this.scene.displayMessage(this.scene.annoncer, '');
                    break;
                default:
                    this.scene.displayMessage(this.scene.annoncer, count)

            }
        });
        this.startLoop();
    }

    physicsLoop() {
        requestAnimationFrame(this.physicsLoop.bind(this));
        let now = Date.now();
        let delta = now - this.previousPhysics;
        if (delta > 1000) {
            delta = SERVER_TICK_DURATION;
        }
        this.lagPhysics += delta;
        if (this.lagPhysics >= SERVER_TICK_DURATION) {
            if (this.running) {
                this.updatePhysics();
                this.clientStep++;
            }
            this.lagPhysics -= SERVER_TICK_DURATION;
        }
        this.previousPhysics = now;
    }

    startLoop() {
        this.startTime = Date.now();
        this.gameLoop();
        this.physicsLoop();
        /*setInterval(() => {
            console.log(this.currentState.players.find(player => player.number === this.localPlayerNumber).pig.vy);
            if (this.currentState.players.find(player => player.number === this.localPlayerNumber).pig.vy >= -PIG_SPEED){
                this.pendingInputs.push('jump')
            }
        },400);*/
    }

    gameLoop(time) {
        let delta = 0;
        let currentFrame;
        if (this.startTime === undefined) {
            this.startTime = time;
        } else {
            currentFrame = Math.round((time - this.startTime) / UPDATE_FRAME_TIME);
            delta = (currentFrame - this.lastFrame) * UPDATE_FRAME_TIME;
        }
        this.lastFrame = currentFrame;
        if (delta >= UPDATE_FRAME_TIME) {
            this.sendInputsToServer();
            if (this.running) {
                this.applyInputs();
                this.render();
            }
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    applyInputs() {
        let localPlayer = this.currentState.players.find(player => player.number === this.localPlayerNumber);
        this.pendingInputs.forEach(() => {
            localPlayer.pig.vy = PIG_SPEED;
        });
        this.pendingInputs = [];
    }

    getCopy(object) {
        return JSON.parse(JSON.stringify(object));
    }

    sendInputsToServer() {
        if (this.pendingInputs.length > 0) {
            this.socket.emit('packet', {
                id: this.localPlayerNumber,
                action: 'input',
                data: this.pendingInputs
            });

            this.inputHistory.push(this.clientStep);
        }
    }

    updateGame(state) {
        state.pipes.forEach(pipe => {
            pipe.x += PIPE_SPEED;
        });
        state.players.forEach(player => {
            player.pig.y += player.pig.vy;
            if (player.pig.y >= GAME_HEIGHT) {
                player.pig.y = GAME_HEIGHT
            }
            if (player.pig.vy + GRAVITY < PIG_MAX_SPEED) {
                player.pig.vy += GRAVITY;
            }
        })
    }


    setListeners() {
        let z = new KeyListener('z');
        z.press = () => {
            if (!this.running) {
                this.socket.emit('ready');
            } else {
                this.pendingInputs.push('jump');
            }
        };

        window.addEventListener('touchstart', () => {
            if (!this.running) {
                this.socket.emit('ready');
            } else {
                this.pendingInputs.push('jump');
            }
        });
    }

    serverReconciliation() {
        this.discardProcessedInputs();
        this.simulateGame();

    }

    discardProcessedInputs() {
        this.inputHistory = this.inputHistory.filter(inputStep => {
            return inputStep > this.serverState.serverStep;
        });
    }

    correctActorsPosition() {
        this.lastState = this.getCopy(this.currentState);
        this.currentState = this.getCopy(this.serverState);
        if (this.timeSinceLastServerSnapshot <= INTERPOLATION_PERIOD) {
            this.currentState.pipes.forEach(pipe => {
                let lastPipe = this.lastState.pipes.find(p => p.number === pipe.number);
                let serverPipe = this.currentState.pipes.find(p => p.number === pipe.number);
                if (lastPipe) {
                    pipe.x = this.lerp(lastPipe.x, serverPipe.x, this.timeSinceLastServerSnapshot / INTERPOLATION_PERIOD);
                } else {
                    pipe.x = serverPipe.x;
                }
            });
            /*this.currentState.players.forEach(player => {
                let lastStatePig = this.lastState.players.find(p => p.number === player.number).pig;
                let serverPig = this.currentState.players.find(p => p.number === player.number).pig;
                if (lastStatePig) {
                    player.pig.y = this.lerp(lastStatePig.y, serverPig.y, this.timeSinceLastServerSnapshot / INTERPOLATION_PERIOD);
                } else {
                    player.pig.y = serverPig.y;
                }
            })*/
        } else {
            this.currentState.pipes.forEach(pipe => {
                let serverPipe = this.currentState.pipes.find(p => p.number === pipe.number);
                pipe.x = serverPipe.x
            })
            // this.currentState.players.forEach(player => {
            //     let serverPig = this.currentState.players.find(p => p.number == player.number).pig;
            //     player.pig.y = serverPig.y;
            //
            // })
        }


    }

    lerp(start, end, time) {
        return start * (1 - time) + end * time;
    }


    render() {
        this.scene.render(this.currentState);
    }

    simulateGame() {
        let state = this.getCopy(this.serverState);
        let serverStep = state.serverStep;
        if (this.inputHistory.length > 0) {
            console.log(this.inputHistory.length);
            for (let i = 0; i < this.inputHistory.length; i++) {
                let nextInputStep = this.inputHistory.shift();
                for (let j = 0; j < nextInputStep - serverStep; j++) {
                    this.updateGame(state);
                }
            }
        } else {
            console.log(this.clientStep - serverStep, ' (', this.clientStep, '-', serverStep, ')');
            for (let i = 0; i < this.clientStep - serverStep; i++) {
                console.log('fixing game state');
                this.updateGame(state);
            }
            this.clientStep = serverStep;
        }

        this.currentState = this.getCopy(state);
    }


    updatePhysics() {
        this.updateGame(this.currentState);
    }
}