var express= require('express'),
    path = require('path'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    MongoDBStore = require('connect-mongodb-session')(session),
    event = require('events'),
    http = require('http'),
    store = new MongoDBStore({
        uri: 'mongodb://localhost:50000/sessions',
        collection: 'mySessions'
    });

module.exports = function(app) {

    event.EventEmitter.defaultMaxListeners = Infinity;
    http.globalAgent.maxSockets = 100000;
    app.set('views', path.join(__dirname, '../views'));
    app.set('view engine', 'ejs');
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '../../public'))); 
    app.use(session({
        secret:'mysecret',
        maxAge: {
          maxAge: 1000*60*60*24*7
        },
        resave:false,                                                   // required if you want to manually call req.session.save()
        saveUninitialized: false,                                       // dont force an unitialized session to be saved to store   https://github.com/expressjs/session
        store: store
    }))
};