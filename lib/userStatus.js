
/**
 *  This is experimental work, testing socket.io.  Not currently used or in prod.
 */

var io              = require('socket.io')(http), // use against express server
    validateToken 	= require('./validateToken.js'),
    when            = require("promised-io/promise").when;

io.set('origins', '*:*');

exports.userStatus = function(data) {

io.on('connection', function(socket){
    //console.log('a user connected...', socket.id);

    // client shall respond with username
    socket.on('user connect', function(user) {
        if (!user) {
            var user = 'anonymous-'+anonymousCount;
            anonymousCount++;
        }

        // keep track of sockets by socket id
        sockets[socket.id] = {user: user};

        // keep track of clients by username
        if (user in userClients)
            userClients[user].push(socket.id);
        else
            userClients[user] = [socket.id];

        //console.log('user known as "'+user+'".', 'Socket: '+socket.id+' \n');

        io.of('/user-status').emit('update meta', socketMeta() );
    })

    // on this event the server emits an 'logout' event to all the user's clients
    socket.on('user logout', function (user) {
        //console.log('logging out user: ', user)

        var userSocketIds = userClients[user];

        // emit logout to all sockets
        var i = userSocketIds.length;
        while (i--) {
            //console.log('telling tab to logout', socket.id)
            socket.broadcast.to( userSocketIds[i] ).emit('logout');
        }
    })

    // an event that returns jobs
    //socket.on('jobs', function(token, cb) {
        //sendJobs(token, cb);
    //})

    // event for when a user disconnects from their client
    socket.on('disconnect', function () {
        var user = sockets[socket.id].user;
        //console.log('user "'+user+'" disconnected; deleting socket',socket.id, '\n');

        var userSocketIds = userClients[user];
        for (var i=0; i<userSocketIds.length; i++) {
            if (userSocketIds[i] == socket.id) {
                userSocketIds.splice(i, 1);
                break;
            }
        }

        // if user has no more sockets, remove their key
        if (userSocketIds.length == 0) delete userClients[user];

        // always delete the socket.id
        delete sockets[socket.id];

        // tell the user-status namespace to update
        io.of('/user-status').emit('update meta', socketMeta() );
    })
});

// listening on userRoom requires validation
var userRoom = io.of('/user-status')

userRoom.on('connection', function(socket){
    console.log('a user connected to user-status!', socket.id);

    // initial request for data
    socket.on('request meta', function(cb) {
        cb( socketMeta() );
    })
});


function socketMeta() {
    return {
        nClients: Object.keys(sockets).length,
        nUsers: Object.keys(userClients).length,
        users: getUserSummary()
    }
}

function getUserSummary() {
    var users = [];
    for (var user in userClients) {
        users.push({name: user, nClients: userClients[user].length});
    }
    return users;
}

function sendJobs(token, cb) {
    var postData = {
        version: '1.1',
        method: 'ProbModelSEED.CheckJobs',
        params: {}
    };

    return request.post(MS_URL, {
        form: JSON.stringify(postData),
        headers: {"Authorization": token},
        json: true
    }, function (error, response, body) {
        console.log('jobs', JSON.stringify(body, null, 4))

        request.get('http://p3.theseed.org/services/shock_api/node/413eb449-884e-4392-8130-a16e2d1816f0',
            {headers: {"Authorization": 'OAuth '+token}},
            function(error, response, body) {
                console.log('thing', body)
            })

        cb(body);
    });


    /* test enumerate
    var postData = {
        version: '1.1',
        method: 'AppService.enumerate_tasks',
        params: [0, 25]
    };

    return request.post(APP_URL, {
        form: JSON.stringify(postData),
        headers: {"Authorization": token},
        json: true
    }, function (error, response, body) {
        console.log('jobs', JSON.stringify(body.result, null, 4))
        console.log(body.result.length)
        cb(body);
    });
    */
}

} // end userStatus
