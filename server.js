#!/usr/bin/env node
var express = require('express');

var request 	= require('request'),
    cliOptions 	= require('commander'),
    fs  		= require('fs'),
    modelParser = require('./parsers/model.js'),
    fbaParser 	= require('./parsers/fba.js');


cliOptions.version('0.0.1')
           .option('-d, --dev', 'Developer mode; this option attempts to use a token in the file dev-user-token')
           .parse(process.argv);


var app = express();

var WS_URL = 'http://p3.theseed.org/services/Workspace';

// default RPC request data structure
var postData = {
    version: "1.1",
    method: null,
    params: null
};

// set default request header, if "dev" option is given
var headers;
if (cliOptions.dev) {
    fs.readFile('dev-user-token', 'utf8', function (err, token) {
        console.log('\n\x1b[36m'+'using development token:'+'\x1b[0m', token, '\n')
        headers = {"Authorization": token.trim()}
    })
}


app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
}).use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
})

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
.get('/v0/list/*', function (req, res) {
    var path = '/'+req.params[0];

    postData.method = 'Workspace.ls';
    postData.params =  {paths: [ path ] } ;
    if ('filter' in req.query && req.query.filter === 'folders')
        postData.params.excludeObjects = true;
    else if ('filter' in req.query && req.query.filter === 'objects')
        postData.params.excludeDirectories = true;

    if ('recursive' in req.query)
        postData.params.recursive = true;


    postData.params = [postData.params]
    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
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
.get('/v0/meta/*', function (req, res) {
    var path = '/'+req.params[0];

    postData.method = 'Workspace.get';
    postData.params = [ {objects: [ path ], metadata_only: true} ];
    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
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
.get('/v0/objects/*', function (req, res) {
    var path = '/'+req.params[0];

    postData.method = 'Workspace.get';
    postData.params = [ {objects: [ path ]} ];
    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
        function (error, response, body) {
            var data = JSON.parse(body)

            if (!('result' in data)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var d = data.result[0][0];
            res.send( {meta: d[0], data: modelParser.parse(JSON.parse(d[1])) } );
        });
})



/**
 * @api {get} /model/:path Request model detail information
 * @apiName getModel
 *
 * @apiParam {string} path Path to workspace object
 *
 * @apiSuccess {Model Object} A parsed and sanitized model object
 */
.get('/v0/model/*', function (req, res) {
    var path = '/'+req.params[0];

    postData.method = 'Workspace.get';
    postData.params =  [ {objects: [ path ]} ];

    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
        function (error, response, body) {
            var data = JSON.parse(body);

            if (!('result' in data)) {
                var e = sanitizeError(data);
                res.status(520).send( e );
                return;
            }

            var d = data.result[0][0];

            res.send( {meta: sanitizeMeta(d[0]), data: modelParser.parse(JSON.parse(d[1])) } );
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

    postData.method = 'Workspace.get';
    postData.params = [ {objects: [ path ]} ];
    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
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
 * @apiSuccess {fba object} A parsed and sanitized fba object
 *
 */
.get('/v0/my-models/*', function (req, res) {
    var path = '/'+req.params[0];

    postData.method = 'Workspace.get';
    postData.params = [ {objects: [ path ]} ];
    request.post(WS_URL, {form: JSON.stringify(postData), headers: headers},
        function (error, response, body) {
            var d = JSON.parse(body).result[0][0]; // ah, good stuff;
            if (!error && response.statusCode == 200) {
                res.send( {meta: d[0], data: modelParser.parse(JSON.parse(d[1])) } );
            }
        });
})


/**
 * @api {get} /publications/ List select publications related to ModelSEED. List has no particular order.
 * @apiName publications
 *
 *
 * @apiSampleRequest /publications/
 *
 * @apiSuccess {json} meta List of publication objects.  All values are strings, except 'authors',
 *  which is a an array of strings.
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
            var d = data
            res.send( d );
        });
})


.get('/test', function (req, res) {
    res.send( 'hello world' );
})


// sanitize error messages from services
function sanitizeError(data) {
    var error = data.error.error.split('_ERROR_');
    var msg = error[1],
        debug = error[2].trim();

    return {msg: msg, debug: debug};
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

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});
