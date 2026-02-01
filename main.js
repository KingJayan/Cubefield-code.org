  /*  ____ _   _ ____  _____ _____ ___ _____ _     ____  
 / ___| | | | __ )| ____|  ___|_ _| ____| |   |  _ \ 
| |   | | | |  _ \|  _| | |_   | ||  _| | |   | | | |   by jayan
| |___| |_| | |_) | |___|  _|  | || |___| |___| |_| |
 \____|\___/|____/|_____|_|   |___|_____|_____|____/ 
                                                      */

// See how i did (shaders, shadows, etc for detail dont render properly in gamelab, so i decided not to include them)
// Model game: https://cubefield.stackblitz.io 


// sprites = boxes, sprite interactins: char -- block --> die, char -- moving block --> die, block -- moving block --> die.

World.frameRate = 50;

// inital pos of camera
var camX = 0;
var camY = -80;
var camZ = 1000;
var camAngle = 0; // camera angle for turning
var turnSpeed = 0;
var blocks = []; // array that stores all the blocks
var moveblocks = [];
var viewDistance = 700; // distance that the camera can see
var blockMax = 700; // max distance block renders
var score = 0;
var scoreCanvas; // p2d canvas for score rendering [cannot render 2d on 3d, need to make new canvas]
var arrowOffs = 400; // arrow ahead of camera
var gl = 0; // ground level for grey area
var speed = 10; // speed
var maxSpeed = 25; // max speed for accel
var speedchange = 10; 
var turnInc = 0.4; // increment of turning
var accel = 1; // speed of acceleration
var fadeSpeed = 5; // speed of fade-in effect
var arrowW = 40; // width of char
var arrowH = 15; // height of char
var arrowD = 60; // depth of char
var startScreen = true; // var to manage game state
var startCanvas; // var for p2d start screen canvas
var bgr = 255; // red of bg change based on score
var bgg = 255; // green of bg change based on score
var bgb = 255; // blue of bg change based on score
var deathScreen = false; // var for death screen state
var deathCanvas; // canvas for death screen
var pauseScreen = false;
var pauseCanvas;
var yy = 200;
//var grid;
/*
function preload() {
  grid = loadImage("new-grid.jpg");
}
*/
function setup() {
  createCanvas(400, 400, WEBGL); // for 3d rendering
  startCanvas = createGraphics(400, 400); // start screen canvas
  deathCanvas = createGraphics(400, 400); // death screen canvas
  pauseCanvas = createGraphics(400, 400);
  scoreCanvas = createGraphics(400, 100); // score display canvas
}

showMobileControls(1, 1, 1, 1);

generateWorld(camZ - 1500, camZ + 200); // generates world with the first blocks
function draw() {
  if (startScreen) {
    showStartScreen();
    if (keyWentDown("space")) startScreen = false;
  } else {
    // Update bg and block colors based on score
    updateColors();
    background(bgr, bgg, bgb);
    ambientLight(20);
    normalMaterial();
    camZ -= speed; // always go forwards

    // MOVEMENT
    if (keyDown("d") || keyDown("right")) {
      camX += 9;
      turnSpeed = constrain(turnSpeed, .005, .025);
      camAngle += turnSpeed;
      speed = constrain(speed + accel, 10, maxSpeed);
    } else if (keyDown("a") || keyDown("left")) {
      camX -= 9;
      turnSpeed = constrain(turnSpeed, -.025, -.005);
      camAngle += turnSpeed;
    } else {
      turnSpeed = lerp(turnSpeed, 0, turnInc); // smooth reset turnSpeed
      camAngle = lerp(camAngle, 0, turnInc); // smooth reset camera angle
    }
    turnSpeed = constrain(turnSpeed, -.05, .05);
    camAngle = constrain(camAngle, -.05, .05);
    if (keyDown("w") || keyDown("up")) {
      speed = constrain(speed + accel, 10, maxSpeed);
    } else {
      speed = lerp(speed, speedchange, accel);
    }
    if (keyWentUp("p")) {
      if (World.frameRate < 1) {
        World.frameRate = 50;
        pauseScreen = false;
        pauseScreen.clear();
      } else if (World.frameRate > 1) {
        pauseScreen = true;
        World.frameRate = .25;
      }
    }

    score = Math.round(camZ / -3.5 + 200);

    // Generate new blocks as camera moves forward
    if (camZ < blockMax) {
      generateWorld(camZ - viewDistance, camZ); // Generate blocks in front of the camera
      blockMax -= viewDistance; // Update blockMax based on new upd view dist
    }

    // cam pos + rot for updating
    push();
    translate(-camX, -camY, -camZ);
    rotateZ(camAngle);
    renderWorld();
    renderArrowhead(camX, gl, camZ + arrowOffs);
    pop();
    checkColl(camX, gl, camZ + arrowOffs);

    // rmv old blocks
    spliceBehind();

    // Increment score and update speed dynamically
    score = Math.round(camZ / -3.5 + 200);
    if (score >= 0) { showScore(); }
    console.log("score: " + score);
    speed += .005;
    maxSpeed += .005;
    speedchange += .005;

    if (deathScreen) {
      showDeathScreen();
      speed = 0;
      yy = lerp(yy, 0, .1); // lerp death screen position
      if (abs(yy) < 1) {
        playSound("wompwomp.mp3");
        noLoop();
      }
    } else if (pauseScreen) {
      showPauseScreen();
      if (keyWentDown("p")) {
        pauseScreen = false;
        pauseCanvas.clear();
      }
    }
  }
}

function renderWorld() {
  push();
  translate(0, gl + 38, 0); // ground positioning
  fill(rgb(0, 0, 0, .82));
  box(1e4, 5, 1e5);
  pop();
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (block.z < camZ + viewDistance && block.z > camZ - viewDistance) {
      renderBlock(block.x, block.y, block.z, block.opacity, block.r, block.g, block.b);
    }
  }
  for (var d = 0; d < moveblocks.length; d++) {
    var moveblock = moveblocks[d];
    if (moveblock.z < camZ + viewDistance && moveblock.z > camZ - viewDistance) {
      moveblock.x -= 4; // speed that moving blocks go at
      renderMoveBlock(moveblock.x, moveblock.y, moveblock.z, moveblock.opacity, moveblock.r, moveblock.g, moveblock.b);
    }
  }
}

// collision check #1
function checkColl(x, y, z) {
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (dist(x, y, z, block.x, block.y, block.z) < 200) {
      if (checkCollision(x, y, z, arrowW, arrowH, arrowD, block.x, block.y, block.z)) {
        die();
      }
    }
  }
  for (var d = 0; d < moveblocks.length; d++) {
    var moveblock = moveblocks[d];
    if (dist(x, y, z, moveblock.x, moveblock.y, moveblock.z) < 200) {
      if (checkCollision(x, y, z, arrowW, arrowH, arrowD, moveblock.x, moveblock.y, moveblock.z)) {
        die();
      }
    }
  }
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    for (var d = 0; d < moveblocks.length; d++) {
      var moveblock = moveblocks[d];
      if (dist(block.x, block.y, block.z, moveblock.x, moveblock.y, moveblock.z) < 200) {
        if (checkCollision(block.x, block.y, block.z, 25, 25, 25, moveblock.x, moveblock.y, moveblock.z)) {
          blocks.splice(i, 1);
        }
      }
    }
  }
}
function spliceBehind() {
  for (var i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].z > camZ + 650) {
      blocks.splice(i, 1);
    } else {
      blocks[i].opacity = constrain(blocks[i].opacity + fadeSpeed, 0, 255);
    }
  }
  for (var d = moveblocks.length - 1; d >= 0; d--) {
    if (moveblocks[d].z > camZ + 650) {
      moveblocks.splice(d, 1);
    } else {
      moveblocks[d].opacity = constrain(moveblocks[d].opacity + fadeSpeed, 0, 255);
    }
  }
}

function generateWorld(startZ, endZ) {
  for (var z = startZ; z < endZ; z += 55) { // Z = frequnecy of blocks  less value = more blocsk
    blocks.push({ x: random(camX - 500, camX + 500), y: 0, z: z, opacity: 0, r: 20, g: 20, b: 20 });
  }
  generateMoveBlocks(startZ, endZ);
}



// upd colors dynamically based on score
function updateColors() {
  if (score >= 1 && score < 1000) {
    // Light green background
    bgr = 204;
    bgg = 255;
    bgb = 204;
    // Red blocks
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].r = 230;
      blocks[i].g = 20;
      blocks[i].b = 20;
    }
    for (var i = 0; i < moveblocks.length; i++) {
      moveblocks[i].r = 230;
      moveblocks[i].g = 20;
      moveblocks[i].b = 20;
    }
  } else if (score >= 1001 && score < 2500) {
    // Light blue background
    bgr = 173;
    bgg = 216;
    bgb = 230;
    // Gold blocks
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].r = 255;
      blocks[i].g = 215;
      blocks[i].b = 0;
    }
    for (var i = 0; i < moveblocks.length; i++) {
      moveblocks[i].r = 255;
      moveblocks[i].g = 215;
      moveblocks[i].b = 0;
    }
  } else if (score >= 2501 && score < 5000) {
    // Light red background
    bgr = 255;
    bgg = 131;
    bgb = 131;
    // Green blocks
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].r = 20;
      blocks[i].g = 230;
      blocks[i].b = 20;
    }
    for (var i = 0; i < moveblocks.length; i++) {
      moveblocks[i].r = 20;
      moveblocks[i].g = 230;
      moveblocks[i].b = 20;
    }
  } else {
    // bg and block colors when start screen is active
    bgr = 255;
    bgg = 255;
    bgb = 255;
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].r = 235;
      blocks[i].g = 20;
      blocks[i].b = 20;
    }
    for (var i = 0; i < moveblocks.length; i++) {
      moveblocks[i].r = 235;
      moveblocks[i].g = 20;
      moveblocks[i].b = 20;
    }
  }
}

function renderBlock(x, y, z, opacity, r, g, b) {
  push();
  translate(x, y, z);
  fill(r, g, b, opacity);
  strokeWeight(5);
  stroke("black");
  box(25, 25, 25);
  pop();
}

function renderMoveBlock(x, y, z, opacity, r, g, b) {
  push();
  translate(x, y, z);
  fill(r, g, b, opacity);
  strokeWeight(5);
  stroke("black");
  box(75, 75, 25);
  pop();
}

function updateMoveBlocks() {
  for (var d = 0; d < moveblocks.length; d++) {
    var moveblock = moveblocks[d];
    if (moveblock.z < camZ + viewDistance && moveblock.z > camZ - viewDistance) {
      moveblock.x -= 2;
      renderMoveBlock(moveblock.x + 200, moveblock.y, moveblock.z, moveblock.opacity, moveblock.r, moveblock.g, moveblock.b);
    }
  }
}

function generateMoveBlocks(startZ, endZ) {
  if (score >= 1000) {
    for (var z = startZ; z < endZ; z += 400) { //less freq moveblocks
      moveblocks.push({ x: camX + 50, y: 0, z: z + 100, opacity: 0, r: 20, g: 20, b: 20, moveLeft: true });
    }
  }
}

function renderArrowhead(x, y, z) {
  push();
  translate(x, y + 30, z);
  pointLight(255, 255, 255, x, y, z);
  ambientLight(255, 255, 255);
  normalMaterial();
  //specularMaterial(255);
  fill(0, 255, 0); // green
  stroke("lime");
  strokeWeight(5);
  beginShape();
  // Front point
  vertex(0, -20, 20);
  // Back left
  vertex(-20, 0, -20);
  // Back right
  vertex(20, 0, -20);
  vertex(0, 0, -20);
  vertex(-20, 0, -20);
  vertex(20, 0, -20);
  endShape(CLOSE);
  pop();
}

function showScore() {
  scoreCanvas.clear();
  scoreCanvas.background(0, 100);
  scoreCanvas.fill(0);
  scoreCanvas.textAlign(LEFT, TOP); // text to the top-left corner
  scoreCanvas.textSize(32);
  // Display the score
  scoreCanvas.text("FPS: " + Math.round(World.frameRate), 10, 50)
  scoreCanvas.text("Score: " + score, 10, 10);
  // Render score canvas as overlay
  resetMatrix();
  translate(-width / 2, -height / 2 - 50, 1); // score is drawn on top in the top-left corner
  texture(scoreCanvas);
  plane(400, 100);
}

function checkCollision(ax, ay, az, aw, ah, ad, bx, by, bz) {
  // aabb collision detection
  return (ax - aw / 2 < bx +1/ 2 &&
          ax + aw / 2 > bx -1/ 2 &&
          ay - ah / 2 < by +1/ 2 &&
          ay + ah / 2 > by -1/ 2 &&
          az - ad / 2 < bz +1/ 2 &&
          az + ad / 2 > bz -1/ 2);
}

function showStartScreen() {
  startCanvas.background(0);
  startCanvas.textAlign(CENTER);
  startCanvas.fill(255);
  startCanvas.textSize(32);
  startCanvas.text("Cubefield 3D", startCanvas.width / 2, startCanvas.height / 2 - 110);
  startCanvas.textSize(20);
  startCanvas.text("Press SPACE to Start", startCanvas.width / 2, startCanvas.height / 2 - 55);
  startCanvas.textSize(20);
  startCanvas.text("Movement: ", startCanvas.width / 2, startCanvas.height / 2 - 15);
  startCanvas.text("W/UP - accelerate\nA/LEFT - left turn\nD/RIGHT - right turn\nP - pause", startCanvas.width / 2, startCanvas.height / 2 + 25);
  startCanvas.textSize(22);
  startCanvas.text("Dodge the blocks\nand get the highest score!\nGood Luck!", startCanvas.width / 2, startCanvas.height / 2 + 125);
  texture(startCanvas);
  plane(800, 800);
}

function showPauseScreen() {
  pauseCanvas.clear();
  pauseCanvas.background(0, 150);
  pauseCanvas.textAlign(CENTER);
  pauseCanvas.fill(255);
  pauseCanvas.textSize(32);
  pauseCanvas.text("GAME PAUSED", pauseCanvas.width / 2, pauseCanvas.height / 2 - 20);
  pauseCanvas.textSize(25);
  pauseCanvas.text("Press P key to resume", pauseCanvas.width / 2, pauseCanvas.height / 2 + 30);
  resetMatrix();
  translate(0, 0, 1);
  texture(pauseCanvas);
  plane(800, 800);
}
 
function showDeathScreen() {
  deathCanvas.clear();
  deathCanvas.background(0, 100);
  deathCanvas.textAlign(CENTER);
  deathCanvas.fill(255);
  deathCanvas.textSize(32);
  deathCanvas.text("u ded bruh", deathCanvas.width / 2, deathCanvas.height / 2 - 20);
  deathCanvas.textSize(20);
  deathCanvas.text("Final Score: " + score, deathCanvas.width / 2, deathCanvas.height / 2 + 20);
  deathCanvas.text("Refresh the page to restart", deathCanvas.width / 2, deathCanvas.height / 2 + 50);


  //death canvas as overlay
  resetMatrix();
  translate(0, yy, 25); //centered
  texture(deathCanvas);
  plane(800, 800);
}

function die() {
  deathScreen = true;
  console.log("DEATH");
}
