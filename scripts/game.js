'use strict';
// setup app
let app = new PIXI.Application({ resizeTo: window, backgroundColor: 0x888888 });
document.body.appendChild(app.view); 
PIXI.settings.SCALE_MODE = PIXI.settings.SCALE_MODE.NEAREST;


// consts
const heightCells = 7
const widthCells = 5
const BOARDRATIO = heightCells/widthCells;
const ACTIVEAREA = activeArea();
const SPRITESIDE = ACTIVEAREA.width < ACTIVEAREA.height? ACTIVEAREA.width/widthCells: ACTIVEAREA.height/heightCells;
const ORIGIN = calcOrigin();
const textStyle = new PIXI.TextStyle({fontSize: SPRITESIDE/2+'px'});
//const URL = "http://localhost:8080"; //TODO CHANGE TO REAL IP???
const socket = io({ autoConnect: false })//URL, { autoConnect: false });

socket.onAny((eventName, ...args) => {
    console.log(`${eventName}, ${args}`);
});// TODO REMOVE

// global vars
let sheet;    //TODO CHANGE TO LOCAL BINDING INSIDE CODE
let totalArea = new PIXI.Container(); // TODO CHANGE TO LOCAL BINDING INSIDE CODE (Maybe)
let tiles = [[],[],[]]; // TODO CHANGE TO LOCAL BINDING INSIDE CODE
let test; //TODO REMOVE!!
totalArea.x = ORIGIN.x;
totalArea.y = ORIGIN.y;
totalArea.width = ACTIVEAREA.width;
totalArea.height = ACTIVEAREA.height; 
app.stage.addChild(totalArea);

// helper functions
function prepareSprite(file, x, y){
    let sprite = new PIXI.Sprite(sheet.textures[file]);
    sprite.x = x;
    sprite.y = y;
    sprite.width = SPRITESIDE;
    sprite.height = SPRITESIDE;
    return sprite;
    }

//calculates the largest area of the screen with the height/width ratio is BOARDRATIO
function activeArea(){
    return app.screen.width*BOARDRATIO < app.screen.height ? {width: app.screen.width, height: app.screen.width*BOARDRATIO} : {width: app.screen.height/BOARDRATIO, height: app.screen.height};
}
//Finds the top left cornor of the active Area.
function calcOrigin(){
    return {x: app.screen.width/2 - ACTIVEAREA.width/2, y: app.screen.height/2 - ACTIVEAREA.height/2 };
}


// main screen
function main()
{
    totalArea.removeChildren(0, totalArea.children.length);
    // text
        // TIC TAC TOE
        // Hello {user}
        // change username
        // finde game
    let title = new PIXI.Text('TIC-TAC-TOE', {fontSize: SPRITESIDE});
    title.x = (widthCells/2)*SPRITESIDE;
    title.y = 1*SPRITESIDE;
    title.anchor.x = 0.5

    let usertext = new PIXI.Text('Hello {user}', textStyle);
    usertext.x = (widthCells/2)*SPRITESIDE;
    usertext.y = 3*SPRITESIDE;
    usertext.anchor.x = 0.5 

    let changeUsername = new PIXI.Text('change username', textStyle);
    changeUsername.x = (widthCells/2)*SPRITESIDE;
    changeUsername.y = 4*SPRITESIDE;
    changeUsername.anchor.x = 0.5 
    changeUsername.interactive = true
    changeUsername.on('pointerdown', (event) => { 
        changeUsername.text ='not avail right now';});


    let findGame = new PIXI.Text('Find game', textStyle);
    findGame.x = (widthCells/2)*SPRITESIDE;
    findGame.y = 5*SPRITESIDE;
    findGame.anchor.x = 0.5 
    findGame.interactive = true
    findGame.on('pointerdown', (event) => { 
        game();});


    totalArea.addChild(title);
    totalArea.addChild(usertext);
    totalArea.addChild(changeUsername);
    totalArea.addChild(findGame);
}

//game screen 
function game() 
{
    totalArea.removeChildren(0, totalArea.children.length);
    let gid;
    let xo;
    
    // exit
    let exit = prepareSprite("x.png", 0, 0);
    exit.interactive = true;
    exit.on('pointerdown', (event) =>{
        socket.disconnect()
        main();
    });
    totalArea.addChild(exit);

    // text
        // opponent: {name}
        // {xo} {name}' turn / your turn {xo}
    let toptxt = new PIXI.Text('', textStyle);
    toptxt.x = (widthCells/2)*SPRITESIDE;
    toptxt.y = 1*SPRITESIDE;
    toptxt.anchor.x = 0.5 


    let bottomtxt = new PIXI.Text('Finding opponent...', textStyle);
    bottomtxt.x = (widthCells/2)*SPRITESIDE;
    bottomtxt.y = 2*SPRITESIDE;
    bottomtxt.anchor.x = 0.5 
    
    // Shadow behind xo board
    let shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000);
    shadow.drawRect(1*SPRITESIDE,3*SPRITESIDE,3*SPRITESIDE,3*SPRITESIDE);
    const filter = new PIXI.filters.BlurFilter(10,1,1,5);
    const shadowcont = new PIXI.Container();
    shadowcont.filters= [filter];
    

    // xo board
    shadowcont.addChild(shadow)
    let board = new PIXI.Container();
    tiles = [[],[],[]] //TODO CHANGE TO LOCAL
    let startj = 3
    let starti = 1
    for(let i = starti; i<(starti+3); i++){
        for (let j=startj; j<(startj+3); j++){
            let spritex = prepareSprite('x'+'.png' , SPRITESIDE*i, SPRITESIDE*j)
            let spriteo = prepareSprite('o'+'.png', SPRITESIDE*i, SPRITESIDE*j)
            spritex.visible = false;
            spriteo.visible = false;

            let tile = prepareSprite('tile.png' , SPRITESIDE*i, SPRITESIDE*j)
            
            
            tile.on('pointerdown', (event) => { 
                tiles[i-starti][j-startj][xo].visible = true
                setInteractive(false);
                socket.emit('move', i-starti, j-startj);
            });
            board.addChild(tile);
            board.addChild(spritex);
            board.addChild(spriteo);
            tiles[i-starti][j-startj] = {'tile': tile,'x': spritex, 'o': spriteo};
        }
        
    }

    
    totalArea.addChild(shadowcont);
    totalArea.addChild(board);
    totalArea.addChild(toptxt);
    totalArea.addChild(bottomtxt);


    // Socket events
    socket.on('joinGame', (xoro, gameid) => {
        gid = gameid;
        xo = xoro
    })

    socket.on('startGame', (oppname) =>{
        bottomtxt.text = 'playing against ' + oppname;
        if (xo == 'x'){setInteractive(true);}
    })

    socket.on('oppMove', (board)=>{
        setBoard(board);
        setInteractive(true);
    });

    //winlosetie is one of: -1, 0 or 1. which is lose, tie or win.
    socket.on('endGame', (winlosetie)=>{
        socket.disconnect()
        let endtxt;
        switch(winlosetie){
            case -1:
                endtxt = 'YOU LOSE :´('
                break
            case 0:
                endtxt = 'It\'s a tie :/'
                break
            case 1:
                endtxt = 'YOU WIN!!!!'
                break
        }
        toptxt.text = endtxt;
    });
    
    socket.on('error', (msg, ...args) =>{
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // TODO HANDLE ERROR MESSAGES PRESSING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    });
    

    socket.connect();
    console.log('connect');
    //helper functions

    // bool => void
    //set the interactivity of the tiles.
    function setInteractive(bol){
        tiles.forEach((list) =>   {list.forEach((obj) =>{obj.tile.interactive = obj.x.visible || obj.o.visible ? false : bol})});
    }

    // sets visibility of x and o to false
    function resetBoard(){
        tiles.forEach((list) =>   {list.forEach((obj) =>{obj.x.visible = false});});
        tiles.forEach((list) =>   {list.forEach((obj) =>{obj.o.visible = false});});
    }

    // 3x3 array -> void 
    // resets board then
    // sets the visiblity of 'x' or 'o' to true where 'x' or 'o' is in input.
    // starting at top left
    function setBoard(brd){
        resetBoard();
        for (let i = 0; i < 3; i++){
            for (let j = 0; j < 3; j++){
                if (tiles[i][j][brd[i][j]]){
                    tiles[i][j][brd[i][j]].visible = true
                }
            }
        }
    }

    //void => array
    // outputs boardstate as an 2d array[i][j] with:
    //  - 0 as empty
    //  - 'x'/'o' as either x or o
    // i is row and j is coloumn
    function readBoard(){
        let output = [[],[],[]];
        for (let i =0; i<3; i++){
            for (let j=0; j<3; j++){
                if (empty(i,h)){
                    output[i][j] =0
                }
                else if (tiles[i][j].x.visible){
                    output[i][j] = 'x'
                }
                else{
                    output[i][j] ='o'
                }
            }
        }
        return output;
    }

    // int, int => bool
    // checks if i, j cell is empty
    function empty(i, j){
        return !(tiles[i][j].x.visible || tiles[i][j].o.visible);
    }

    setInterval(()=>{console.log(socket.id)}, 500);
}





PIXI.Loader.shared.add('spritesheet.json').load(() =>{sheet = PIXI.Loader.shared.resources['spritesheet.json'].spritesheet;  });
PIXI.Loader.shared.onComplete.add(() => {main()}, {once:true})

