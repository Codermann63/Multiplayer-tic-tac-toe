'use strict';
const express = require('express');
const app = express();
const http = require('http');
const DB = require('./db.js');
const sql = DB.sql;
const COOKIE = require('cookie');


const port = process.env.PORT || 80;
console.log("enviroment port: " + process.env.PORT)
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
let roomCount = 1;

// global vars
let waitingRoom = [];
let games = {}; // {board:[[],[],[]], x: socketid, o: socketid, xname, oname, turn: string ('x'/'o')}
let socketsingame = {};


app.use(express.static(__dirname + '/static/img'));
app.use(express.static(__dirname + '/scripts'));

app.post('/sql', (req, res) =>{
    console.log(req.get('lol'))
    sql.query(req.get('sql'), (err, result)=>{
        if(!err){
            console.log(result.rowCount);
            res.send({foo: result.rows});
        }
        else{console.log(err);
            res.send({foo: 'error'})}
    });
    
    console.log('done')
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html', {});
})

async function login(req, res, cookie, id, password){
    let loginattempt = await DB.auth(id, password, cookie).catch((err) => console.log(err));
    let name = 'anon-user'
    let success = false
    if (loginattempt){
        console.log("succesfull login");
        res.cookie('accesshash', loginattempt.newaccesshash)
        res.cookie('publicid', loginattempt.publicid)
        // can also send loginattempt.publicID
        name = loginattempt.name;
        success = true;
    }
    else{
        console.log('unsuccessfull login :: clear cookies')
        res.clearCookie('accesshash');
        res.clearCookie('publicid');
    }
    console.log("send back " + name)
    res.send({name: name, 'success?':success})
}

app.post('/auth', (req, res) =>{
    login(req, res ,req.cookies, req.body.publicid, req.body.password)
});

app.post('/createuser', (req, res) =>{
    DB.createUser(req.body.publicid, req.body.password).then((result)=>{

        res.cookie('accesshash', result.accesshash)
        res.cookie('publicid', result.publicid)
        res.send({name:result.name, 'success?':true})

    }).catch((err) =>res.send({'success?':false, 'error': err}));
});

app.post('/changeusername', (req, res) =>{
    DB.changeUsername(req.body.name, req.cookies).then((result) =>{
        if (result) res.send({'success?':true, name:req.body.name})
        else res.send({'success?':false})
    });
});

//middleware
const myLogger = function (req, res, next) {
    console.log('hellothere')
    next()
}

app.use(myLogger)

io.on('connection', (socket) =>{
    console.log('user has connected');

    console.log(socket.request.headers.cookie)

    let cookie = COOKIE.parse(socket.request.headers.cookie);
    cookie = cookie ? cookie : {publicid : 0}

    console.log(cookie);

    DB.getUsername(COOKIE.parse(socket.request.headers.cookie)).then((name)=>{
        io.of('/').sockets.get(socket.id).name = name;

        joinGame(socket.id);

        socket.onAny((eventName, ...args) => {
            console.log(`LOG: ${eventName}, ${args}`);
        }); //TODO REMOVES
        
        socket.on('disconnect', (reason) =>{
            console.log('user has disconnected: ' + reason); //TODO REMOVE
            //if (reason == 'client namespace disconnect')
            closeGame(socket.id , -1)
        })


        socket.on('move', (i, j) =>{
            let gameid = socketsingame[socket.id];
            let game = games[gameid];
            let xo = getxo(gameid, socket.id)
            if (xo == game.turn && !game.board[i][j]){
                game.board[i][j] = xo;
                
                
                io.to(game[opposite(xo)]).emit('oppMove', game.board, 0, 0);
                game.turn = opposite(xo);
                if (checkWin(game.board)){closeGame(socket.id, 1)}
                else if (checkFull(game.board)){closeGame(socket.id, 0);console.log("TIETIETIETIE")}
                else{}
                
            }
        });
    });
});

server.listen(port, () =>{
    console.log('Listening on port: ' + port)
});
//helper functions

// obj {sid:string, win: bol, lose: bol}
// disconnects socket with sid, removed it from every que/ game its in and remove the game if its empty.
// if in game also send win/lose message to opponent
function closeGame(sid, winlosetie){
    
    if (socketsingame[sid]){
        let gameid = socketsingame[sid];
        delete socketsingame[sid];
        if(games[gameid]){
            let xid = games[gameid].x;
            let oid = games[gameid].o;
            delete games[gameid]

            if (!(xid == sid)){closeGame(xid, -1*winlosetie);}
            else {closeGame(oid, -1*winlosetie);}
        }
    }

    if (io.of('/').sockets.has(sid)){
        io.to(sid).emit('endGame', winlosetie)
        io.of('/').sockets.get(sid).disconnect(true);
    }
}


// void -> gameid
// creates a game if none available -> add it to waitingRoom
// returns a game if there is one available -> remove it from waitingRoom

function findGame(){
    if (!waitingRoom[0]){
        let id = roomCount++;
        games[id] = {board:[new Array(3),new Array(3),new Array(3)],
                     x: undefined,
                     o: undefined,
                     xname:undefined,
                     oname:undefined,
                    turn: 'x'}
        waitingRoom.push(id);
        return id;
    }
    else {
        return waitingRoom.shift();
    }
}

// socketid -> void
// finds a game (or creates it), makes socketid join and sends message to socket with info.
function joinGame(sid){
    let roomid = findGame();
    if (!games[roomid]){return joinGame(sid);}

    let xo;
    if(!games[roomid].x){
        games[roomid].x = sid;
        games[roomid].xname = io.of('/').sockets.get(sid).name
        xo = 'x';
    }
    else if(!games[roomid].o){
        games[roomid].o = sid;
        games[roomid].oname = io.of('/').sockets.get(sid).name
        xo = 'o';
    }
    else {return joinGame(sid);}

    
    if (xo == 'o'){
        if (io.of('/').sockets.has(sid) && io.of('/').sockets.has(games[roomid].x))
        {
            io.to(games[roomid].x).emit('startGame', games[roomid].oname); // TODO CHANGE o-oppname
            io.to(sid).emit('startGame', games[roomid].xname); // TODO CHANGE x-oppname
        }
        else if (!io.of('/').sockets.has(sid))
        {
            closeGame(sid)
        }
        else {return joinGame(sid);}
    }

    socketsingame[sid] = roomid;
    io.to(sid).emit("joinGame", xo, roomid);
}

// gameid, socketid -> boolean
// true if socketid is in game with gameid
function validateGame(gid, sid){
    return games[gid].x == sid || games[gid].o == sid;
}

// gameid, socketid -> string
// return 'x' or 'o'according to which socketid is assigned to game of gameid. 
// if socketid is not assigned to game, return undefined.
function getxo(gid, sid){
    switch (sid){
        case (games[gid].x):
            return 'x'
        case (games[gid]).o:
            return 'o'
        default:
            return
    }
}


// gameid, socketid -> socketid
// returns the socketid of the opponent to original socketid. If original is not in game return undefined 
function getopp(gid, sid){
    switch (sid){
        case (games[gid].x):
            return games[gid].o;
        case (games[gid]).o:
            return games[gid].x;
        default:
            return
    }
}

//string -> string
// returns the opposite x/o... default case x
function opposite(xo){
    if(xo == 'x'){return 'o'}
    else{return 'x'}
}

//board -> boolean, 
// checks if there is a win on the board
function checkWin(board){
    console.log('horizontal');
    //horizontal
    for (let i = 0; i<3; i++){
        let start = board[i][0];
        if (start){
            horizontal:{
                for (let j = 1; j <3; j++){
                    if (!(start == board[i][j])){
                        break horizontal
                    }
                }
                return true
            }
        }
    }
    console.log('vertical');
    //vertical
    for (let j = 0; j<3; j++){
        let start = board[0][j];
        if (start){
            vertical:{
                for (let i = 1; i <3; i++){
                    if (!(start == board[i][j])){
                        break vertical
                    }
                }
                return true
            }
        }
    }

    //diagonal
    if (board[1][1]){console.log('diagonal');
        return board[0][0] == board[1][1] && board[1][1] == board[2][2] || board[0][2] == board [1][1] && board[1][1] == board[2][0]}
    
    return false;
}

function checkFull(board){
    return board.every((arr) =>!(arr.includes(undefined)));
}


DB.connect();