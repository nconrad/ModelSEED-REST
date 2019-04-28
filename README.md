
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


## Start Dev Server

```
node server.js --dev
```

To make our lives easier, running `gulp` starts a development server along with a process to
update ./api-documentation.json.  The dev server will restart automatically on file change (any .js file).  For testing, a token can be placed in the file `./dev-user-token`.

```
gulp
```

## Tests

API tests are ran with `npm test` or `gulp test`.

```
npm test
```


## Building Web Documentation

Docstrings in server.js are parsed into JSON using `./docs/parse-docs.js`.
The resulting JSON structure `./api-documentation.json` is then used to produce
fancy online documentation.  See <a href="http://github.com/modelseed/modelseed-UI">ModelSEED-UI</a>
for the front-end code.

Note: `api-documentation.json` is automatically rebuilt with gulp.
To manually build it, run:

```
gulp docs
```


## Production

The server script `server.js` should be ran with <a href="https://github.com/foreverjs/forever">forever</a>.

```
forever start -l /logs/server.log --pidFile /tmp/a -a server.js
```

## Local testing

In addition to starting the dev server instance as mentioned above in ```## Start Dev Server```, in order for the nodemailer's transporter.sendMail() to succeed, a local Postfix mail system needs to be started by running:

```
sudo postfix start

###If Postfix is already running, you will get 'postfix/postfix-script: fatal: the Postfix mail system is already running' error.
```

Then you can test if the Postfix mail system is running with these commands:

```
echo hello | sendmail user@domain

mailq
```

The `mailq` command will show the mail queue content.

When modelseed-ui is running in localhost:8089 and a user comment is sent, the server.js
screen will have something like the following:

```
POST /v0/comments
request string:
 {"comment":{"user":{"username":"qzhang"},"rowId":"cpd00002","comments":["bad formula","bad structure"]}}
comment data:
 { user: { username: 'qzhang' },
  rowId: 'cpd00002',
  comments: [ 'bad formula', 'bad structure' ] }
mail content:
 { from: 'help@modelseed.org',
  to: 'qzhang@anl.gov',
  subject: 'MODELSEED-113',
  text: '',
  html: 'Message: [\n    "bad formula",\n    "bad structure"\n]<br><br>Id: cpd00002<br><br>User: <br><pre>{\n    "username": "qzhang"\n}</pre><br><br>' }
Comments sent: 250 2.0.0 Ok: queued as 73752191F0A2
```

And in my email inbox I'd have received the above `mail content`.

If the email recipient is `help@modelseed.org`, then anyone on the list will receive the email AND the Jira ticket at
https://jira.cels.anl.gov/browse/MODELSEED-113
will record the email content as a comment.


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
