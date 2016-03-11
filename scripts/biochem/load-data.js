/**
 * Takes JSON formatted data and loads into elastic search.
*/

var rp  = require('request-promise'),
    fs  = require('fs');

try {
    var file = process.argv[2];
} catch (e) {
    console.log('No file was supplied.  Usage: load-data.js <file_path>');
    return;
}

var endpoint = 'http://localhost:9200/biochem/reactions/';


var objs = JSON.parse( fs.readFileSync(process.argv[2], 'utf8').trim() );

var options = {
    method: 'PUT',
    uri: '',
    body: {},
    json: true
};

// recursively load data
var i = 0;
options.uri = endpoint + objs[i].id;
options.body = objs[i];
console.log('writing:', options.uri)

function loadData(options) {
    console.log('loading', options.uri, '...')

    rp(options)
        .then(function (body) {
            i++;
            options.uri = endpoint + objs[i].id;
            options.body = objs[i];
            loadData(options);
        })
        .catch(function (err) {
            //console.log('PUT failed:', err)
        });
}

loadData(options);

