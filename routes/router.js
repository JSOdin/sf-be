var routes = require('./main');
var user = require('./user');
var post = require('./post');
var auth = require('./auth');
var dataimports = require('./dataimports');
var reroute = require('./rerouter');
var panel = require('./panel');
module.exports = function(app){
    app.use('/', routes);
    app.use('/panel',panel);
    app.use('/posts',post);
    app.use('/imports',dataimports);
    app.use('/users', user);                                         // TODO: change all paths on the client end
    app.use('/auth', auth);
    app.use('/privatesettings',reroute);                            // for unauthenticated access
    app.use('/initialsetup',reroute);                               // for unauthenticated access
    app.all('/*',function(req,res){                                 // catchall route that solves removal of the pound sign in client

        /*     if (req.url === '/favicon.ico') {
         res.writeHead(200, {'Content-Type': 'image/x-icon'} );
         res.end();
         console.log('favicon requested');
         return;
         }*/

        var payload ={};
        if (req.user){                                              // first check if req.user is populated (either reddit or steamid or both
            if (req.user.steamid){                                  // check if steam logged or both
                payload.user = req.user;
                payload.loggedin=true;
            } else {                                                // check if reddit only. if it is, show that we don't want the "steam logged in state on home page (logout button)
                payload.user = undefined;
                payload.loggedin = false;
            }
        } else {                                                    // else is just the default state.
            payload.user = undefined;
            payload.loggedin = false;
        }
        return res.render('index',payload);
    });
    /// catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });
    /// error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function(err, req, res, next) {

            res.status(err.status || 500);
            console.log(err);
            res.send(err);
            /*     res.render('error', {
             message: err.message,
             error: err
             });*/
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {

        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
};