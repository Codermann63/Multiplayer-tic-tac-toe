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
const socket = io({ autoConnect: false })
let username;
let updateUsername = () => {};
let firstLogin = false
const xml = new XMLHttpRequest();

function sqlquery(query){
    xml.open("POST", "/sql", true, 'user lol', "password lol");
    xml.setRequestHeader("sql",query)
    xml.send()
    return xml.response;
}





socket.onAny((eventName, ...args) => {
    console.log(`${eventName}, ${args}`);
});// TODO REMOVE

// global vars
let sheet;    //TODO CHANGE TO LOCAL BINDING INSIDE CODE
let totalArea = new PIXI.Container(); // TODO CHANGE TO LOCAL BINDING INSIDE CODE (Maybe)
let tiles = [[],[],[]]; // TODO CHANGE TO LOCAL BINDING INSIDE CODE
let test; //TODO REMOVE!!
let credentials;
totalArea.x = ORIGIN.x;
totalArea.y = ORIGIN.y;
totalArea.width = ACTIVEAREA.width;
totalArea.height = ACTIVEAREA.height; 
app.stage.addChild(totalArea);

// user functions
function login(id, password){
    const xhr = new XMLHttpRequest();
    console.log('hey')
    xhr.open("POST", "/auth");
    xhr.onreadystatechange = ()=>{
        if (xhr.readyState === XMLHttpRequest.DONE){
            let response = JSON.parse(xhr.response)
            username = response['name']
            updateUsername()
            if (firstLogin){
                if (response['success?'])setTimeout(() =>{alert('login successfull');}, 3);//alert('login successfull')
                else setTimeout(() =>{alert('login unsuccessfull. Booted to anon user');}, 3);//alert('login unsuccessfull. Booted to anon user')
            }
            else firstLogin = true
        }
    }

    if (id && password){
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        let json = JSON.stringify({password:password, publicid:id}) 
        xhr.send(json)
    }
    else{ xhr.send() }
}

function createUser(id, password){
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/createuser");
    xhr.onreadystatechange = ()=>{
        if (xhr.readyState === XMLHttpRequest.DONE){
            let response = JSON.parse(xhr.response)
            if (response['success?']) {
                username = response['name']
                updateUsername()
                alert('logged in ')
            }
            else alert('userid taken!')
            
        }
    }

    if (id && password){
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        let json = JSON.stringify({password:password, publicid:id}) 
        xhr.send(json)
    }
}

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

    

    let loginbutton = new PIXI.Text('login', textStyle);
    loginbutton.interactive = true;
    loginbutton.on('pointerdown', () =>{
        let id = window.prompt('enter UserID: ');
        let password = window.prompt('enter password');
        login(id, password)
    })

    let createUserButton = new PIXI.Text('Create User', textStyle);
    createUserButton.y = loginbutton.height;
    createUserButton.interactive = true;
    createUserButton.on('pointerdown', ()=>{
        let id = window.prompt('enter UserID: ');
        let password = window.prompt('enter password');
        createUser(id, password)

    });

    

    let title = new PIXI.Text('TIC-TAC-TOE', {fontSize: SPRITESIDE});
    title.x = (widthCells/2)*SPRITESIDE;
    title.y = 1*SPRITESIDE;
    title.anchor.x = 0.5

    let hellousertxt = new PIXI.Text(`Hello ${username}`, textStyle);
    hellousertxt.x = (widthCells/2)*SPRITESIDE;
    hellousertxt.y = 3*SPRITESIDE;
    hellousertxt.anchor.x = 0.5 
    updateUsername = () =>{if (typeof hellousertxt != 'undefined'){hellousertxt.text = `Hello ${username}`;}}

    let changeUsername = new PIXI.Text('change username', textStyle);
    changeUsername.x = (widthCells/2)*SPRITESIDE;
    changeUsername.y = 4*SPRITESIDE;
    changeUsername.anchor.x = 0.5 
    changeUsername.interactive = true
    changeUsername.on('pointerdown', (event) => { 
        let name = window.prompt('change username: ')
        sendUsernameRequest(name)
        /* LEGACY CODE
        const keyObj = keyboard();
        let usertxt = ""
        keyObj.press = (event) => {
            username:{
                const code = event.key.charCodeAt(0)
                console.log(event.key.length, isNumeric(code), isLower(code), isUpper(code));
                if(event.key.length == 1 && (isNumeric(code) || isLower(code) || isUpper(code))) { 
                    usertxt += event.key
                }
                else if (event.key == 'Enter'){
                    // finish entering
                    keyObj.unsubscribe();
                    changeUsername.text = 'Contacting server...';
                    sendUsernameRequest(usertxt)
                    break username;
                }
                else if (event.key == "Delete" || event.key == 'Backspace'){
                    // delete last char
                    if (usertxt.length >0){
                        usertxt = usertxt.substring(0,usertxt.length - 1)
                    }
                }
                changeUsername.text = "new username: " + usertxt
            }
            
        }*/
    });

    function sendUsernameRequest(name){
        console.log('sending username request with '+JSON.stringify({name:name}))
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/changeusername');
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
        let json = JSON.stringify({name:name})
        xhr.onreadystatechange = () =>{
            if (xhr.readyState === XMLHttpRequest.DONE){
                let response = JSON.parse(xhr.response)
                console.log(response)
                if (response['success?']){
                    username = response['name'];
                    updateUsername(response['name']);
                    alert('username changed to ' + name)
                }
                else alert('Username change unsucsessfull')
            }
        }
        xhr.send(json);
    }


    let findGame = new PIXI.Text('Find game', textStyle);
    findGame.x = (widthCells/2)*SPRITESIDE;
    findGame.y = 5*SPRITESIDE;
    findGame.anchor.x = 0.5 
    findGame.interactive = true
    findGame.on('pointerdown', (event) => { 
        game();});

    totalArea.addChild(createUserButton);
    totalArea.addChild(loginbutton);
    totalArea.addChild(title);
    totalArea.addChild(hellousertxt);
    totalArea.addChild(changeUsername);
    totalArea.addChild(findGame);
}

//game screen 
function game() 
{
    totalArea.removeChildren(0, totalArea.children.length);
    let gid;
    let xo;
    const oppturn = ' Opponents turn '
    const yourturn = ' Your turn '
    

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
                toptxt.text = opposite(xo)+oppturn+opposite(xo)
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
        if (xo == 'x'){setInteractive(true);
            toptxt.text = xo+yourturn+xo}
        else{toptxt.text = opposite(xo)+oppturn+opposite(xo)}
    })

    socket.on('oppMove', (board)=>{
        setBoard(board);
        toptxt.text = xo+' Your turn '+xo
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
}


// helper functions
//string -> string
// returns the opposite x/o... default case x
function opposite(xo){
    if(xo == 'x'){return 'o'}
    else{return 'x'}
}

// string -> keyboard object 
// returns a key object that listens for a keypress/release of "value", if undefined, any keypress/release goes.
// event functions is added with key.upHandler(event) or key.downHandler(event).
// key.unsubscribe to delete eventhandlers again.
function keyboard(value) {
    const key = {};
    key.value = value;
    key.press = undefined;
    key.release = undefined;
    //The `downHandler`
    key.downHandler = (event) => {
        if (key.press && (!key.value || event.key === value)) {
          key.press(event);
        }
      };
  
    //The `upHandler`
    key.upHandler = (event) => {
        if (key.release && (!key.value || event.key === value)) {
          key.release(event);
        }
      };
  
    //Attach event listeners
    const downListener = key.downHandler.bind(key);
    const upListener = key.upHandler.bind(key);
    
    window.addEventListener("keydown", downListener, false);
    window.addEventListener("keyup", upListener, false);
    
    // Detach event listeners
    key.unsubscribe = () => {
      window.removeEventListener("keydown", downListener);
      window.removeEventListener("keyup", upListener);
    };

    return key;
  }

// int -> bool
// checks if charcode is in the numeric interval
function isNumeric(code){
    return (code > 47 && code < 58);
}

// int -> bool
// checks if charcode is in the uppercase alphanumeric interval
function isUpper(code){
    return (code > 64 && code < 91);
}

// int -> bool
// checks if charcode is in the lowercase alphanumeric interval
function isLower(code){
    return (code > 96 && code < 123);
}

// load
PIXI.Loader.shared.add('spritesheet.json').load(() =>{sheet = PIXI.Loader.shared.resources['spritesheet.json'].spritesheet;  });
PIXI.Loader.shared.onComplete.add(() => {main()}, {once:true})

login(/*with cookie*/);