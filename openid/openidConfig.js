var openIDStrategy = require('passport-openid').Strategy,
    passport = require('passport'),
    request = require('request'),
    User = require('../models/User'),
    Counter = require('../models/Counter'),
    async = require('async'),
    steamapi = require('../config/steamapi');

//// this module is about logging in via OpenID, initiating a new user, appending properties on that user with data from different API calls, and returning the user as req.user
//// we would need to call steam api regardless of user existing on our db or not, because we replace some information like ownedgames/currentlyplayed
////** todo: redirect to /error when request fails,  implementing updating user each time login (call APIS) // update user profile data once redirected back from steam (for the first time login)
var passportModule = function() {
    var SteamStrategy = new openIDStrategy({
            providerURL: 'http://steamcommunity.com/openid',
            stateless: true,        // http by nature is stateless
            returnURL: 'http://localhost:3000/auth/openid/return',
            realm: 'http://localhost:3000/',
            passReqToCallback: true
        },
        function (req,identifier, done) {                                                  // after control is returned back to the server from steam login, call this cb

            var user = {
                identifier: identifier,
                steamId: identifier.match(/\d+$/)[0]
            };
            console.time('start')


            function asyncInitializer(callback){                                           // necessary as there is no otehr way to put in initial arguments for the async waterfall
                console.log('1st step initiate');
                return callback(null,user);
            }

            function getCurrentCounter(user,callback){
                Counter.findOne({},function(err,doc){
                    if (doc){
                        return callback(null,user,doc);
                    }

                    var counter = new Counter({counter:0});

                    return callback(null,user,counter);
                })
            }

            function dbcall(user,counter,callback){                                                // first step in the series; check if user exists. if not, initiate new user
                var query = {
                    steamid: user.steamId
                };
                console.log('second step');

                User.findOne(query,function(err,foundUser){

                    if (err) throw err;
                    var dbuser= {};
                    if (foundUser){                                                        // if we find the user in our db we only need to update a few things
                        dbuser = foundUser;
                        dbuser.personaname = user.payload.personaname;
                        dbuser.avatarmedium = user.payload.avatarmedium;
                        dbuser.avatarfull = user.payload.avatarfull;

                    } else {
                        dbuser = new User;
                        dbuser.steamid = user.payload.steamid;
                        dbuser.profileurl = user.payload.profileurl;
                        dbuser.userPageID = ++counter.counter;
                        dbuser.addfriendurl = 'steam://friends/add/'+user.payload.steamid;
                        dbuser.personaname = user.payload.personaname;
                        dbuser.avatar = user.payload.avatar;
                        dbuser.avatarmedium = user.payload.avatarmedium;
                        dbuser.avatarfull = user.payload.avatarfull;
                        dbuser.settings.admin.existsindb = true;                          // lets you know if account exists. this is useful for later steps when
                                                                                          // we dont want to make duplicate user queries in DB.
                    }

                    counter.save(function(err){
                        if (err){
                            console.log(err);
                        }
                        return callback(null, dbuser);
                    });
                })
            }




            /***********Initialize everything into a chain with this one API call *************/

            var options = {
                url: 'http://api.steampowered.com/iSteamUser/GetPlayerSummaries/v0002/?key='+steamapi.key+'&steamids='+ user.steamId,
                json:true
            };

            var callback = function(err,res,body){

                if (!err && res.statusCode == 200) {
                    user.payload = body.response.players[0];

                    async.waterfall([asyncInitializer,getCurrentCounter,dbcall/*,recentGamesAPI*/],function(err,dbuser){  // async's waterfall allow chaining of several API calls
                        dbuser.save(function(err){
                            if (err){
                                console.log(err)
                            }

                            if (req.user){
                                if (req.user.tokens){
                                    dbuser.tokens = req.user.tokens;
                                }
                            }

                            return done(null, dbuser);      // save dbuser as req.user
                        });
                    })

                }
            };
            request(options,callback);
        }
    );

    // serializeUSer,deserializeUser  http://stackoverflow.com/questions/27637609/understanding-passport-serialize-deserialize

    // serialization is the process of translating data structures or object state into a format that can be stored (for example,
    // in a file or memory buffer, or transmitted across a network connection link) and reconstructed later in the same or another computer environment ...

    // The opposite operation, extracting a data structure from a series of bytes, is deserialization (which is also called unmarshalling).
    
    // serialize ; think storage to session the user id once it comes back from Steam WebAPI.
    // deserialize : think fetching from the session to get the user id, which is then used to look up user in database.
    return {
        steamStrategy: function(){
            passport.use(SteamStrategy);
        },
        config: function(app){
            app.use(passport.initialize());
            app.use(passport.session());
            passport.serializeUser(function(req,user,done){   // saves some data to the session. "user" is what comes back from the OAUTH
                if (user.steamid){
                    req.session.steamid = user.steamid;     // now we can look up the steam user in any case
                    return done(null, user.steamid);        //saving steamid to sessions  as req.session.passport.user
                }

                if (user.tokens){
                    req.session.tokens=user.tokens;         //saving tokens to session  req.session.tokens;
                    return done(null, user.tokens);        //saving tokens to session req.session.passport.user.token (but unnecessary as its written over anyways when steam logging)
                }

                return done(null,user);
            });
            passport.deserializeUser(function(req,data, done){      // usually invoked when you are in a logged in state and you refresh browser or come back after closing the window
                // look up the user using the identifier given by serializeUser in the sessions store at firebase,
                // when a previous visitor comes back.

                if (typeof data == 'object'){
                    if (req.session.steamid){
                        return User.findOne({steamid:req.session.steamid},function(err,user){  // now we are looking up our own database to get the complete user object.
                            if (err) throw err;
                            return done(null, user);                                // populating req.user in the end.
                        });
                    }

                    return done(null,data);
                } else {
                    return User.findOne({steamid:data},function(err,user){  // now we are looking up our own database to get the complete user object.
                        if (err) throw err;
                        return done(null, user);                                // populating req.user in the end.
                    });
                }
            });
        }
    }
};

module.exports = passportModule;

/** whenever you log in with any method (steam, facebook, reddit, etc) passport will immediately delete any existing req.user and replace it with a new req.user upon deserializing so to
 circumvent that we save some crucial data in req.session so we can fetch them to keep the req.user for steam alive regardless of logging onto reddit. **/