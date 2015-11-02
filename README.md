
# ModelSEED REST (under dev)

This repo contains a ModelSEED RESTful API.  The API wraps the ProbModelSEED and Workspace
Services and provides additional methods used in the ModelSEED web app.


## Requirements

node


## Local Installation

```
git clone https://github.com/nconrad/ModelSEED-REST.git
cd ModelSEED-REST
npm install
```

Note: `npm install` installs all node module dependencies


## Start Server

Running `gulp` (or `gulp server`) starts a development server along with a process to
update ./api-documentation.json.  The dev server will restart automatically on file change (any .js file).  For testing, a token can be placed in the file `./dev-user-token`.

```
gulp
```

## Tests

API tests are ran with `gulp test` or `npm test`.

```
gulp test
```


## Building Web Documentation

Docsstrings in server.js are parsed into JSON using `./docs/parse-docs.js`.
The resulting JSON structure `./api-documentation.json` is then used to produce
fancy online documentation.  See <a href="http://github.com/modelseed/modelseed-UI">ModelSEED-UI</a>
for the front-end code.

Note: `api-documentation.json` is automatically rebuilt with gulp.
To manually build `api-documentation.json`, run:

```
gulp docs
```



## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Author(s)

Neal Conrad <nconrad@anl.gov>


## License

Released under [the MIT license](https://github.com/nconrad/modelseed-rest/blob/master/LICENSE).
