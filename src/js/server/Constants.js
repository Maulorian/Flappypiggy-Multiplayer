const PIG_HEIGHT = 75;
const PIG_WIDTH = PIG_HEIGHT * 14 / 9;
const PIPE_HEIGHT = 500;
const PIPE_WIDTH = 200;
const PIPE_DISTANCE = 700;
const GAP_SIZE = PIG_HEIGHT * 4;

const GAME_HEIGHT = 900;
const GAME_WIDTH = 1600;

//can't change
const PHYSICS_TICKRATE = 60;
const PHYSICS_TICK_DURATION = 1000 / PHYSICS_TICKRATE; //in ms

const CLIENT_TICKRATE = 1;
const CLIENT_TICK_DURATION = 1000 / CLIENT_TICKRATE; //in ms


const GRAVITY = 7200 / (PHYSICS_TICKRATE * PHYSICS_TICKRATE);
const PIG_SPEED = -1200 / PHYSICS_TICKRATE;
const PIPE_SPEED = -600 / PHYSICS_TICKRATE;
const PIG_MAX_SPEED = 800 / PHYSICS_TICKRATE;

module.exports = {
    PIG_HEIGHT,
    PIG_WIDTH,
    PIG_SPEED,
    PIPE_HEIGHT,
    PIPE_WIDTH,
    PIPE_SPEED,
    GAP_SIZE,
    GAME_HEIGHT,
    GAME_WIDTH,
    GRAVITY,
    PHYSICS_TICKRATE,
    CLIENT_TICKRATE,
    PHYSICS_TICK_DURATION,
    CLIENT_TICK_DURATION,
    PIPE_DISTANCE,
    PIG_MAX_SPEED
};
