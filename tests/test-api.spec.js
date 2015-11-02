var request = require('request'),
    fs = require('fs')

var baseUrl = "http://0.0.0.0:3000/v0/";

var token = fs.readFileSync('dev-user-token', 'utf8')
var headers = {"Authorization": token.trim()}
console.log('\n\x1b[36m'+'using development token:'+'\x1b[0m', token, '\n')


describe("ModelSEED REST API", function() {
    describe("GET /", function() {
        it("returns status code 200", function(done) {
            request.get(baseUrl, function(error, response, body) {
                expect(response.statusCode).toBe(404);
                done();
            });
        });
    });

    describe("GET /list/:path - ", function() {
        it("returns status code 200", function(done) {
            request.get(baseUrl+'list/nconrad/home/', function(error, response, body) {
                expect(response.statusCode).toBe(200);
                done();
            });
        });

        it("has 2 objects", function(done) {
            request.get(baseUrl+'list/nconrad/home/', function(error, response, body) {
                expect(JSON.parse(body).length).toBe(2);
                done();
            });
        });
    });


    var testModel = '/nconrad/home/models/1520703.3_model';
    describe("GET /objects/:path", function() {
        it("returns status code 200", function(done) {
            request.get(baseUrl+'objects'+testModel, function(error, response, body) {
                expect(response.statusCode).toBe(200);
                done();
            });
        });

        it("returns meta data and data", function(done) {
            request.get(baseUrl+'objects'+testModel, function(error, response, body) {
                var obj = JSON.parse(body);
                expect('meta' in obj).toBe(true);
                expect('data' in obj).toBe(true);
                expect('somethingelse' in obj).toBe(false);
                done();
            });
        });

        it("meta has 12 elements", function(done) {
            request.get(baseUrl+'objects'+testModel, function(error, response, body) {
                var obj = JSON.parse(body);
                expect(obj.meta.length).toBe(13);
                done();
            });
        });
    });
});
