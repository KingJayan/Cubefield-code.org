/*
  ____ _   _ ____  _____ _____ ___ _____ _     ____  
 / ___| | | | __ )| ____|  ___|_ _| ____| |   |  _ \ 
| |   | | | |  _ \|  _| | |_   | ||  _| | |   | | | |   by jayan
| |___| |_| | |_) | |___|  _|  | || |___| |___| |_| |
 \____|\___/|____/|_____|_|   |___|_____|_____|____/ 
                                                      */

// See how i did (shaders, shadows, etc for detail dont render properly in gamelab, so i decided not to include them)
// Model game: https://cubefield.stackblitz.io 
//code.org fork of p5.js: https://github.com/code-dot-org/p5.play


// sprites = boxes, sprite interactins: char -- block --> die, char -- moving block --> die, block -- moving block --> die.

World.frameRate = 50;

// inital pos of camera
var cameraX = 0;
var cameraY = -40; 
var cameraZ = 1000;
var cameraAngle = 0; // camera angle for turning
var turnSpeed = 0;
var blocks = []; // array that stores all the blocks
var moveblocks = [];
var viewDistance = 900; // distance that the camera can see
var blockMax = 700; // max distance block renders
var score = 0;
var scoreCanvas; // p2d canvas for score rendering [cannot render 2d on 3d, need to make new canvas]
var arrowOffset = 100; // arrow ahead of camera
var groundLevel = 0; // ground level for grey area
var gameSpeed = 10; // speed
var maxGameSpeed = 25; // max speed for accel
var baseSpeed = 10; 
var turnIncrement = 0.1; // increment of turning
var acceleration = 1; // speed of acceleration
var fadeSpeed = 5; // speed of fade-in effect
var arrowWidth = 30; // width of char
var arrowHeight = 40; // height of char
var arrowDepth = 40; // depth of char
var startScreen = true; // var to manage game state
var startCanvas; // var for p2d start screen canvas
var backgroundR = 255; // red of bg change based on score
var backgroundG = 255; // green of bg change based on score
var backgroundB = 255; // blue of bg change based on score
var blockColorR = 235, blockColorG = 20, blockColorB = 20;
var deathScreen = false; // var for death screen state
var deathCanvas; // canvas for death screen
var pauseScreen = false;
var pauseCanvas;
var deathScreenY = 200;
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
  scoreCanvas = createGraphics(300, 50); // score display canvas
}

showMobileControls(1, 1, 1, 1);

generateWorld(cameraZ - 2000, cameraZ - 500); 

function draw() {
  if (startScreen) {
    showStartScreen();
    if (keyWentDown("space")) startScreen = false;
  } else {
    updateColors();
    background(backgroundR, backgroundG, backgroundB);
    
    ambientLight(150);
    directionalLight(255, 255, 255, 0.5, 1, -0.5);
    
    if (!deathScreen && !pauseScreen) {
      cameraZ -= gameSpeed; 

      // MOVEMENT
      if (keyDown("d") || keyDown("right")) {
        turnSpeed = lerp(turnSpeed, 9, 0.1);
        cameraAngle = lerp(cameraAngle, 0.08, 0.1);
      } else if (keyDown("a") || keyDown("left")) {
        turnSpeed = lerp(turnSpeed, -9, 0.1);
        cameraAngle = lerp(cameraAngle, -0.08, 0.1);
      } else {
        turnSpeed = lerp(turnSpeed, 0, 0.15);
        cameraAngle = lerp(cameraAngle, 0, 0.15);
      }
      
      cameraX += turnSpeed;

      if (keyDown("w") || keyDown("up")) {
        gameSpeed = constrain(gameSpeed + 0.2, 10, maxGameSpeed);
      } else {
        gameSpeed = lerp(gameSpeed, baseSpeed, 0.05);
      }

      if (keyWentDown("p")) {
        pauseScreen = true;
      }

      score = Math.floor(abs(cameraZ - 1000) / 10);

      if (cameraZ < blockMax) {
        generateWorld(cameraZ - viewDistance - 400, cameraZ - viewDistance); 
        blockMax -= 400; 
      }

      gameSpeed += 0.002;
      maxGameSpeed += 0.002;
      baseSpeed += 0.002;
    }

    push();
    rotateX(0.2); 
    translate(-cameraX, -cameraY, -cameraZ);
    rotateZ(cameraAngle); 
    
    renderWorld();
    
    renderArrowhead(cameraX, groundLevel, cameraZ - arrowOffset);
    pop();

    if (!deathScreen) {
      checkColl(cameraX, groundLevel, cameraZ - arrowOffset);
    }

    spliceBehind();

    if (score >= 0) { showScore(); }

    if (deathScreen) {
      showDeathScreen();
      gameSpeed = 0;
      deathScreenY = lerp(deathScreenY, 0, 0.1);
      if (abs(deathScreenY) < 1 && World.frameRate > 0) {
        World.frameRate = 0;
      }
    } else if (pauseScreen) {
      showPauseScreen();
      if (keyWentDown("p")) {
        pauseScreen = false;
      }
    }
  }
}

function renderWorld() {
  push();
  translate(cameraX, groundLevel + 40, cameraZ - 500); 
  fill(0, 0, 0, 40);
  noStroke();
  plane(5000, 5000);
  pop();

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    renderBlock(block.x, block.y, block.z, block.opacity, blockColorR, blockColorG, blockColorB);
  }
  
  for (var d = 0; d < moveblocks.length; d++) {
    var movingBlock = moveblocks[d];
    if (!pauseScreen && !deathScreen) movingBlock.x -= 5; 
    renderMoveBlock(movingBlock.x, movingBlock.y, movingBlock.z, movingBlock.opacity, blockColorR, blockColorG, blockColorB);
  }
}

function checkColl(x, y, z) {
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (abs(z - block.z) < 100 && abs(x - block.x) < 60) {
      if (checkCollision(x, y, z, 20, arrowHeight, 60, block.x, block.y, block.z, 25, 25, 25)) {
        die();
      }
    }
  }
  for (var d = 0; d < moveblocks.length; d++) {
    var movingBlock = moveblocks[d];
    if (abs(z - movingBlock.z) < 100 && abs(x - movingBlock.x) < 90) {
      if (checkCollision(x, y, z, 20, arrowHeight, 60, movingBlock.x, movingBlock.y, movingBlock.z, 75, 75, 25)) {
        die();
      }
    }
  }
}

function spliceBehind() {
  for (var i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].z > cameraZ + 400) {
      blocks.splice(i, 1);
    } else {
      blocks[i].opacity = constrain(blocks[i].opacity + fadeSpeed, 0, 255);
    }
  }
  for (var d = moveblocks.length - 1; d >= 0; d--) {
    if (moveblocks[d].z > cameraZ + 400) {
      moveblocks.splice(d, 1);
    } else {
      moveblocks[d].opacity = constrain(moveblocks[d].opacity + fadeSpeed, 0, 255);
    }
  }
}

function generateWorld(startZ, endZ) {
  for (var z = startZ; z < endZ; z += 65) { 
    blocks.push({ x: random(cameraX - 800, cameraX + 800), y: 0, z: z, opacity: 0 });
  }
  generateMoveBlocks(startZ, endZ);
}

function updateColors() {
  if (score < 1000) {
    backgroundR = 210; backgroundG = 255; backgroundB = 210;
    blockColorR = 230; blockColorG = 40; blockColorB = 40;
  } else if (score < 2500) {
    backgroundR = 180; backgroundG = 220; backgroundB = 255;
    blockColorR = 255; blockColorG = 210; blockColorB = 0;
  } else if (score < 5000) {
    backgroundR = 255; backgroundG = 150; backgroundB = 150;
    blockColorR = 40; blockColorG = 230; blockColorB = 40;
  } else {
    backgroundR = 30; backgroundG = 30; backgroundB = 30;
    blockColorR = 255; blockColorG = 255; blockColorB = 255;
  }
}

function renderBlock(x, y, z, opacity, r, g, b) {
  push();
  translate(x, y + 15, z);
  fill(r, g, b, opacity);
  stroke(0, opacity);
  strokeWeight(1);
  box(25, 35, 25);
  pop();
}

function renderMoveBlock(x, y, z, opacity, r, g, b) {
  push();
  translate(x, y + 10, z);
  fill(r, g, b, opacity);
  stroke(0, opacity);
  strokeWeight(1);
  box(75, 45, 25);
  pop();
}

function generateMoveBlocks(startZ, endZ) {
  if (score >= 1000) {
    if (random() > 0.8) {
      moveblocks.push({ x: cameraX + 500, y: 0, z: startZ, opacity: 0 });
    }
  }
}

function renderArrowhead(x, y, z) {
  push();
  translate(x, y + 30, z);
  
  rotateX(PI/2); 
  fill(0, 255, 0); 
  noStroke();
  
  triangle(0, -20, -15, 20, 15, 20);
  pop();
}

function showScore() {
  scoreCanvas.clear();
  
  scoreCanvas.stroke(0, 255, 0); 
  scoreCanvas.strokeWeight(2);
  scoreCanvas.fill(0, 0, 0, 150);
  scoreCanvas.rect(0, 0, 298, 48);
  
  scoreCanvas.noStroke();
  scoreCanvas.fill(0, 255, 0);
  scoreCanvas.textFont("Courier New");
  scoreCanvas.textStyle(BOLD);
  scoreCanvas.textAlign(LEFT, CENTER); 
  scoreCanvas.textSize(20);
  scoreCanvas.text("SCORE: " + score, 20, 25);
  
  resetMatrix();
  translate(-width / 2 + 150, -height / 2 + 25, 0);
  texture(scoreCanvas);
  noStroke();
  plane(300, 50);
}

function checkCollision(ax, ay, az, aw, ah, ad, bx, by, bz, bw, bh, bd) {
  return (abs(ax - bx) * 2 < (aw + bw) &&
          abs(ay - by) * 2 < (ah + bh) &&
          abs(az - bz) * 2 < (ad + bd));
}

function showStartScreen() {
  startCanvas.clear();
  startCanvas.background(0, 220);
  
  startCanvas.stroke(0, 255, 0);
  startCanvas.strokeWeight(4);
  startCanvas.noFill();
  startCanvas.rect(20, 20, 360, 360);

  startCanvas.noStroke();
  startCanvas.textAlign(CENTER);
  startCanvas.textFont("Courier New");
  startCanvas.fill(0, 255, 0);
  startCanvas.textSize(40);
  startCanvas.textStyle(BOLD);
  startCanvas.text("CUBEFIELD 3D", 200, 120);
  startCanvas.fill(255);
  startCanvas.textSize(18);
  startCanvas.textStyle(NORMAL);
  startCanvas.text("- SYSTEM READY -", 200, 160);
  startCanvas.fill(0, 255, 0);
  startCanvas.textSize(22);
  startCanvas.text("PRESS [SPACE] TO LAUNCH", 200, 240);
  
  startCanvas.fill(200);
  startCanvas.textSize(16);
  startCanvas.text("W: BOOST | A/D: STEER | P: PAUSE", 200, 320);
  
  resetMatrix();
  texture(startCanvas);
  noStroke();
  plane(800, 800);
}

function showPauseScreen() {
  pauseCanvas.clear();
  pauseCanvas.background(0, 200);
  
  pauseCanvas.stroke(0, 255, 0);
  pauseCanvas.strokeWeight(4);
  pauseCanvas.noFill();
  pauseCanvas.rect(50, 100, 300, 200);

  pauseCanvas.noStroke();
  pauseCanvas.textAlign(CENTER);
  pauseCanvas.textFont("Courier New");
  
  pauseCanvas.fill(0, 255, 0);
  pauseCanvas.textSize(40);
  pauseCanvas.textStyle(BOLD);
  pauseCanvas.text("PAUSED", 200, 180);
  
  pauseCanvas.fill(255);
  pauseCanvas.textSize(20);
  pauseCanvas.textStyle(NORMAL);
  pauseCanvas.text("PRESS [P] TO RESUME", 200, 230);
  
  resetMatrix();
  texture(pauseCanvas);
  noStroke();
  plane(800, 800);
}
 
function showDeathScreen() {
  deathCanvas.clear();
  deathCanvas.background(0, 220);
  
  deathCanvas.stroke(255, 0, 0);
  deathCanvas.strokeWeight(4);
  deathCanvas.noFill();
  deathCanvas.rect(20, 20, 360, 360);

  deathCanvas.noStroke();
  deathCanvas.textAlign(CENTER);
  deathCanvas.textFont("Courier New");
  
  deathCanvas.fill(255, 0, 0);
  deathCanvas.textSize(50);
  deathCanvas.textStyle(BOLD);
  deathCanvas.text("CRITICAL ERROR", 200, 150);
  
  deathCanvas.fill(255);
  deathCanvas.textSize(30);
  deathCanvas.text("SCORE: " + score, 200, 220);
  
  deathCanvas.textSize(16);
  deathCanvas.text("Refresh page to reboot system", 200, 300);

  resetMatrix();
  translate(0, deathScreenY, 0); 
  texture(deathCanvas);
  noStroke();
  plane(800, 800);
}

function die() {
  deathScreen = true;
}
