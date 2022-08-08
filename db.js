'use strict'
const {Client} = require('pg')
const bcrypt = require('bcrypt');
const saltRounds = 5;

const production = true;
let sql;

if (production){
    sql = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {rejectUnauthorized: false}
    });
}
else{
sql = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "1234",
    database: "postgres"
});}

/* BD SETUP
id: UNIQUE, AUTO, INCREMENT   -- internal id

publicID -- usercreated, UNIQUE, used to login 
name -- public name of user (non-unique)
accessInt -- login from last cookie
passHash: ??? -- used to auth
.
*/

async function getUsername(cookie){
    return await sql.query(`SELECT * FROM users WHERE publicid = $1`,[cookie.publicid]).then((result) => {
        if (result.rowCount == 1){
            console.log('found user')}
        else return 'anon-user';
        return result.rows[0].name;
    });
}

// string, JSON -> Boolean
// tries to update name with logincredintials in cookie. If successfull return name.
async function changeUsername(name, cookie){
    console.log('username request recieved '+name )
    if (!cookie){ return false; }
    let publicid = cookie.publicid;
    let accesshash = cookie.accesshash;
    return await sql.query(`SELECT * FROM users WHERE publicid = $1 AND accesshash = $2 `,[publicid , accesshash]).then((result) => {
        if (result.rowCount == 1){
            console.log('found user')}
        else return false;
        sql.query('UPDATE users SET name = $1 WHERE publicid = $2', [name, publicid]);
        return true;
    });

}

async function createUser(publicid, password){
    console.log('creating user: '+publicid+'  password: '+password);
    let checkAvail = await sql.query('SELECT * FROM users WHERE publicid = $1', [publicid])
    if (checkAvail.rowCount != 0) return false;
    console.log(1)
    let name = 'newUser';
    let passhash = await bcrypt.hash(password, saltRounds);
    console.log(2)
    let accesshash = generateAccessHash();
    console.log(3)

    return await sql.query('INSERT INTO users(name, publicid, passhash, accesshash) VALUES($1, $2, $3, $4)',[name, publicid, passhash, accesshash]).then((result) =>{
        console.log(4)
        return {name:name, accesshash:accesshash, publicid:publicid};
    });
    
}//TODO 



// publicID, passhash, loginCookie -> {publicid, newaccesshash, name}/false
// authorizes user in database with entered credentials. otherwise returns false.
async function auth(publicid, password, loginCookie){
    console.log('authorizing attempt')
    let loginDetails;
    if (password != undefined && publicid != undefined){
        console.log('with id & password' ); 
        loginDetails = ['password', password];
    }
    else if (loginCookie){
        console.log('with cookie');     
        publicid = loginCookie.publicid;
        loginDetails = ['accesshash', loginCookie.accesshash]
    }
    else {return false}


    return await sql.query(`SELECT * FROM users WHERE publicid = $1 `,[publicid]).then(async (result) => {
        if (result.rowCount == 1){
            console.log('found user')
            let user = result.rows[0]
            let attempt;
            console.log('hey ' + loginDetails[0])
            console.log(user['passhash'])
            if (loginDetails[0] == 'accesshash') {attempt = user[loginDetails[0]] == loginDetails[1];}
            else if (loginDetails[0] == 'password') {attempt = await bcrypt.compare(loginDetails[1], user['passhash']);}
            console.log('hey2S')
            console.log(user['passhash'])
            console.log(attempt)
            if (attempt){
                if (loginDetails[1] == 0 && loginDetails[0] == 'accesshash'){
                    console.log('tried accessing accesshash 0 ')
                    return false;
                }

                // succesful login 
                console.log('succesfull auth')
                let newaccesshash = generateAccessHash();
                //let newaccesshash = loginDetails[1] // TODO REMOVE
                sql.query('UPDATE users SET accesshash = $1 WHERE publicid = $2', [newaccesshash, publicid])
                return {publicid:publicid, newaccesshash:newaccesshash, name : result.rows[0].name}
            }

            if (loginDetails[0] == 'accesshash'){
                console.log('Wrong accesshash')
                sql.query('UPDATE users SET accesshash = $1 WHERE publicid = $2', ['123', publicid])
            }
            else {console.log('wrong password')}
            return false;
            
        }
        else{return false;}
    }).catch((err) => {console.log(err); return false;});
}

function generateAccessHash(){
    const letters = 'QWERTYUIOPASDFGHJKLKZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890'
    const letters_length = letters.length
    const hash_length = 32

    let newhash = ''
    for (let i = 0; i < hash_length; i++){
        newhash += letters[Math.floor(Math.random()*letters_length)]
    }
    return newhash;
}

function connect(){
    return sql.connect();
}

async function hash(pw){
    return await bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(pw, salt, function(err, hash) {
            return {hash:hash};
        });
    });
}

module.exports = {sql:sql,
auth:auth,
changeUsername:changeUsername,
connect:connect,
createUser:createUser,
getUsername:getUsername}