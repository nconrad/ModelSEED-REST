#!/usr/bin/env node
var app         = require('express')(),
    http        = require('http').Server(app),
    cors        = require('cors'),
    bodyParser  = require('body-parser');

var request         = require('request'),
    nodemailer      = require("nodemailer"),
    extend          = require('util')._extend,
    cliOptions 	    = require('commander'),
    fs              = require('fs'),
    modelParser     = require('./parsers/model.js'),
    fbaParser       = require('./parsers/fba.js');

cliOptions.version('0.0.1')
           .option('-d, --dev', 'Developer mode; this option attempts to use a token in the file: dev-user-token')
           .parse(process.argv);


var WS_URL  = 'http://p3.theseed.org/services/Workspace',
    MS_URL  = 'https://p3.theseed.org/services/ProbModelSEED',
    APP_URL = 'http://p3.theseed.org/services/app_service';

// default RPC request data structure
var postData = {
    version: "1.1",
    method: null,
    params: null
};

// user's sockets
var userClients = {},
    sockets = {},
    anonymousCount = 0;


// if --dev option is used, set token to token in file "dev-user-token"
// otherwise, pass on token, if there is one
if (cliOptions.dev) {
    var token = fs.readFileSync('dev-user-token', 'utf8').trim();
    console.log('\n\x1b[36m'+'using development token:'+'\x1b[0m', token, '\n')

    app.all('/', function(req, res, next) {
        req.header = {"Authorization": token};
        next();
    }).use(function(req, res, next) {
        req.header = {"Authorization": token};
        next();
    })
}

// Configure CORs and body parser.
app.use( cors() )
   .use( bodyParser.urlencoded({extended: false, limit: '50mb'}) )


// Configure Logging
app.use(function(req, res, next) {
    console.log('%s %s', req.method, req.url);
    next();
});


/**
 * @api {get} /list/:path list objects in a folder
 * @apiName list
 *
 * @apiParam {string} path path of workspace folder
 * @apiParam {string} ?filter=(folders|objects) only fetch folders or objects
 *
 * @apiSampleRequest /list/nconrad/home/models/
 *
 * @apiSuccess {json} meta metadata for listed objects
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *          "name": "my things",
 *          "type": "folder",
 *          "path": "/nconrad/home/things",
 *          "modDate": "2015-10-19T03:40:29",
 *          "id": "245FFF5C-7613-11E5-8FA2-41B4682E0674",
 *          "owner": "nconrad",
 *          "size": 648464,
 *          "userMeta": { },
 *          "autoMeta": { },
 *          "userPermission": "r",
 *          "globalPermission": "n",
 *          "shockUrl": ""
 *        },
 *       {
 *       	"name": "1520703.3_model",
 *          "type": "model",
 *          "path": "/nconrad/home/1520703.3_model",
 *          "modDate": "2015-10-19T03:40:29",
 *          "id": "245FFF5C-7613-11E5-8FA2-41B4682E0674",
 *          "owner": "nconrad",
 *          "size": 648464,
 *          "userMeta": { },
 *          "autoMeta": { },
 *          "userPermission": "r",
 *          "globalPermission": "n",
 *          "shockUrl": ""
 *        }
 *      ]
 */
app.get('/v0/list/*', AuthRequired, function(req, res) {
    var path = '/'+req.params[0];

    var post = extend(postData, {
        method: 'Workspace.ls',
        params: {paths: [ path ] }
    })

    if ('filter' in req.query && req.query.filter === 'folders')
        post.params.excludeObjects = true;
    else if ('filter' in req.query && req.query.filter === 'objects')
        post.params.excludeDirectories = true;

    if ('recursive' in req.query)
        post.params.recursive = true;

    post.params = [post.params]
    request.post(WS_URL, {form: JSON.stringify(post), headers: req.header },
        function (error, response, body) {
            //console.log('error',  response)
            var data = JSON.parse(body)

            if (!('result' in data)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var items = data.result[0][path];

            var contents = [];
            for (var i=0; i<items.length; i++ ) {
                contents.push( sanitizeMeta(items[i]) );
            }

            res.send( contents );
        });
})

/**
 * @api {get} /meta/:path Get meta data on worksapce obj
 * @apiName getMeta
 *
 * @apiParam {string} path  path to workspace object
 *
 * @apiSampleRequest /list/nconrad/home/models/1520703.3_model
 *
 * @apiSuccess {json} meta metadata for given object
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *     	  "name": "1520703.3_model",
 *        "type": "model",
 *        "path": "/nconrad/home/models/1520703.3_model",
 *        "modDate": "2015-10-19T03:40:29",
 *        "id": "245FFF5C-7613-11E5-8FA2-41B4682E0674",
 *        "owner": "nconrad",
 *        "size": 648464,
 *        "userMeta": { },
 *        "autoMeta": {  },
 *        "userPermission": "r",
 *        "globalPermission": "n",
 *        "shockUrl": ""
 *      }
 */
.get('/v0/meta/*', AuthRequired, function(req, res) {
    var path = '/'+req.params[0];

    var post = extend(postData, {
        method: 'Workspace.get',
        params: [ {objects: [ path ], metadata_only: true} ]
    })

    request.post(WS_URL, {form: JSON.stringify(post), headers: req.header},
        function (error, response, body) {
            var data = JSON.parse(body)

            if (!('result' in data)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var d = data.result[0][0];
            res.send( sanitizeMeta(d[0]) );
        });
})

/**
 * @api {get} /objects/:path get object data from workspace
 * @apiName getModel
 *
 * @apiParam {string} path Path to workspace object
 *
 * @apiSuccess {json} data the metadata [meta] and object data [data] for the given object
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "meta": {},
 *       "data": {}
 *     }
 */
.get('/v0/objects/*', AuthRequired, function (req, res) {
    var path = '/'+req.params[0];

    var post = extend(postData, {
        method: 'Workspace.get',
        params: [ {objects: [ path ]} ]
    })

    request.post(WS_URL, {form: JSON.stringify(post), headers: req.header},
        function (error, response, body) {
            var data = JSON.parse(body);

            if (!('result' in data)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var d = data.result[0][0];

            // content may or may not be json :(
            try {
                var obj = JSON.parse(d[1]);
            } catch (e) {
                obj = d[1]
            }

            res.send( {meta: d[0], data: obj } );
        });
})

/**
 * @api {get} /model/:path Request model detail information
 * @apiName getModel
 *
 * @apiParam {string} path Path to workspace object
 *
 * @apiSuccess {Model Object} A parsed and sanitized model object.  Great for model tables.
 */
.get('/v0/model/*', AuthRequired, (req, res) => {
    var path = '/'+req.params[0];

    var post = extend(postData, {
        method: 'Workspace.get',
        params: [ {objects: [ path ]} ]
    })

    request.post(WS_URL, {json: post, headers: req.header},
        (error, response, body) => {
            if (!('result' in body)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var meta = body.result[0][0][0],
                data = body.result[0][0][1];

            var meta = sanitizeMeta(meta);

            // if data is stored in shock, fetch;
            // otherwise, error
            if (meta.shockUrl.length > 0) {
                getShockData(meta.shockUrl, req.header.Authorization,
                    (d) => {
                        res.send({
                            meta: meta,
                            data: modelParser.parse(JSON.parse(d))
                        });
                    })
            } else {
                res.status(520).send( {msg: 'No node was found for shock data.'} );
                return;
            }
        });
})

/**
 * @api {get} /fba/:path Request model detail information
 * @apiName getModel
 *
 * @apiParam {string} path Path to workspace object
 *
 * @apiSuccess {fba object} A parsed and sanitized fba object
 *
 */
.get('/v0/fba/*', function (req, res) {
    var path = '/'+req.params[0];

    var post = extend(postData, {
        method: 'Workspace.get',
        params: [ {objects: [ path ]} ]
    })

    request.post(WS_URL, {form: JSON.stringify(post), headers: req.header},
        function (error, response, body) {
            var d = JSON.parse(body).result[0][0];
            if (!error && response.statusCode == 200) {
                res.send( {meta: d[0], data: modelParser.parse(JSON.parse(d[1])) } );
            }
        });
})

/**
 * @api {get} /my-models/:path List user's models.  If no path is given,
 * the directory /<username>/home/models/ is used (the default).
 *
 * @apiName getModel
 *
 * @apiParam {string} path Path to workspace object
 *
 * @apiSuccess { object} Metadata on user's models
 *
 */
.get('/v0/my-models/*', AuthRequired, function (req, res) {
    var path = '/'+req.params[0];
    // do something
})


/**
 * @api {get} /publications/ List select publications related to ModelSEED. List has no particular order.
 * @apiName publications
 *
 *
 * @apiSampleRequest /publications/
 *
 * @apiSuccess {json} meta List of publication objects.  All values are strings, except 'authors',
 *  which is a an array of strings and year, which is an int.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *   [{ "authors":
 *        [ "Henry, Christopher S",
 *          "DeJongh, Matthew",
 *          "Best, Aaron A",
 *          "Frybarger, Paul M",
 *          "Linsay, Ben",
 *          "Stevens, Rick L"],
 *       "title": "High-throughput generation, optimization and analysis of genome-scale metabolic models",
 *       "publication": "Nature biotechnology",
 *       "volumn": "28",
 *       "number": "9",
 *       "pages": "977-982",
 *       "year": "2010",
 *       "publisher": "Nature Publishing Group"
 *    }]
 */
.get('/v0/publications', function (req, res) {
    fs.readFile('./data/publications.json', 'utf8', function (err, data) {
        res.send( data );
    });
})

/**
 * @api {post} /feedback/ post user feedback
 * @apiName feedback
 */
.post('/v0/feedback', function (req, res) {
    var fb = JSON.parse(req.body.feedback);

    var transporter = nodemailer.createTransport({
        port: 25,
        direct: false,
        secure: false,
        ignoreTLS: true
    });

    var mailOptions = {
        from: 'help@modelseed.org',
        to: 'qzhang@anl.gov',         // list of receivers
        subject: 'MODELSEED-78',
        text: '',
        html: 'Message: '+fb.note+'<br><br>'+
              'URL: '+fb.url+'<br><br>'+
              'Browser: '+'<br>'+
                '<pre>'+JSON.stringify(fb.browser, null, 4)+'</pre><br><br>'+
              '<img src="'+fb.img+'"><br>'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            res.status(500).send({'msg': 'Was not able to send feedback.'});
            return console.log(error);
        }
        console.log('Feedback sent: ' + info.response);

        res.status(200).send({'msg': 'Your feedback was sent. Thank you!'});
    });
})

/**
 * @api {post} /comments/ post user comments
 * @apiName comments
 */
.post('/v0/comments', function (req, res) {
    console.log('request string:\n', Object.keys(req.body)[0]);
    var cm = JSON.parse(Object.keys(req.body)[0]);
    console.log('comment data:\n', cm.comment)
    var transporter = nodemailer.createTransport({
        port: 25,
        direct: false,
        secure: false,
        ignoreTLS: true
    });

    var mailOptions = {
        from: 'help@modelseed.org',
        to: 'qzhang@anl.gov',         // list of receivers
        subject: 'MODELSEED-113',
        text: '',
        html: 'Message: '+ JSON.stringify(cm.comment.comments, null, 4)+'<br><br>'+
              'Id: '+cm.comment.rowId+'<br><br>'+
              'User: '+'<br>'+
                '<pre>'+JSON.stringify(cm.comment.user, null, 4)+'</pre><br><br>'
    };
    console.log('mail content: \n', mailOptions);

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            res.status(500).send({'msg': 'Was not able to send comments.'});
            console.log(error);
            return console.log(error);
        }
        console.log('Comments sent: ' + info.response);

        res.status(200).send({'msg': 'Your comments was sent. Thank you!'});
    });
})

/**
 * @api {get} /test-service/  Way to test simple, unauthenticated GET request.
 * @apiName test-service
 *
 * @apiSampleRequest /test-server/
 *
 * @apiSuccess {json} string Should return code 200 with string "This is just a test. This is only a test."
 *
 */
.get('/test-service', function (req, res) {
    res.status(200).send( 'This is just a test. This is only a test.' );
})


// sanitize error messages from services
function sanitizeError(data) {
    if ('error' in data.error) {
        var error = data.error.error.split('_ERROR_');
        var msg = error[1],
            debug = error[2].trim();
    } else {
        var msg = data.error.message,
            debug = '';
    }

    return {msg: msg, debug: debug};
}

function AuthRequired(req, res, next) {
    if ('authorization' in req.headers) {
        req.header = {"Authorization": req.headers.authorization};
        next();
    } else {
        res.status(401).send( {error: 'Auth is required!'} );
    }
}

// sanitize workspace meta data list into dictionary
function sanitizeMeta(l) {
    return {
        name: l[0],
        type: l[1],
        path: l[2]+l[0],
        modDate: l[3],
        id: l[4],
        owner: l[5],
        size: l[6],
        userMeta: l[7],
        autoMeta: l[8],
        userPermission: l[9],
        globalPermission: l[10],
        shockUrl: l[11]
    };
}

function getShockData(node, token, cb) {
    var url = node+'?download',
        header = {headers: {Authorization: 'OAuth '+token}};

    request(url, header, (error, response, body) => { cb(body); })
}

var server = http.listen(3000, () => {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
