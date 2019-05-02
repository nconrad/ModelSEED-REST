var request = require('request'),
    fs = require('fs');

var url = "http://0.0.0.0:3000/v0/";

var token = fs.readFileSync('dev-user-token', 'utf8');
console.log('\n\x1b[36m'+'using testing token:'+'\x1b[0m', token, '\n')

var get = request.defaults({
    method: "GET",
    headers: {
        'Authorization': token.trim(),
        'Content-type': 'application/json'
    }
})

describe("ModelSEED REST API GET Requests", function() {
    describe("GET /", function() {
        it("returns status code 200", function(done) {
            get({url: url}, function(error, response, body) {
                expect(response.statusCode).toBe(404);
                done();
            });
        });
    });

    describe("GET /list/:path", function() {
        it("requires auth", function(done) {
            request.get({url: url+'list/devuser/home/', json: true}, function(error, response, body) {
                expect(response.statusCode).toBe(401);
                expect('error' in body).toBe(true);
                done();
            });
        });

        it("returns status code 200", function(done) {
            get({url: url+'list/devuser/home/'}, function(error, response, body) {
                expect(response.statusCode).toBe(200);
                done();
            });
        });

        it("has 2 objects", function(done) {
            get(url+'list/devuser/home/', function(error, response, body) {
                expect(JSON.parse(body).length).toBe(2);
                done();
            });
        });
    });

    var testModel = url+'objects/devuser/home/models/1182711.3_model';
    describe("GET /objects/:path", function() {
        it("requires auth", function(done) {
            request.get({url: testModel, json: true}, function(error, response, body) {
                expect(response.statusCode).toBe(401);
                expect('error' in body).toBe(true);
                done();
            });
        });

        it("returns status code 200", function(done) {
            get(testModel, function(error, response, body) {
                expect(response.statusCode).toBe(200);
                done();
            });
        });

        it("returns meta data and data", function(done) {
            get(testModel, function(error, response, body) {
                var obj = JSON.parse(body);
                expect('meta' in obj).toBe(true);
                expect('data' in obj).toBe(true);
                done();
            });
        });

        it("meta has 12 elements", function(done) {
            get(testModel, function(error, response, body) {
                var obj = JSON.parse(body);
                expect(obj.meta.length).toBe(12);
                done();
            });
        });
    });

    describe("GET /publications", function() {
        it("returns status code 200", function(done) {
            request.get(url+'publications', function(error, response, body) {
                expect(response.statusCode).toBe(200);
                done();
            });
        });

        it("returns list of publications", function(done) {
            request.get(url+'publications', function(error, response, body) {
                var obj = JSON.parse(body);
                expect(obj.length).toBe(37);
                done();
            });
        });
    });
});

