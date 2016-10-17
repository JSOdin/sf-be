var RedditStrategy = require('passport-reddit').Strategy;
var passport = require('passport');
var User = require('../models/User');

var redditModule = function(){
    var redditStrategy =new RedditStrategy({
            clientID: 'CHuNVMAgWhZdbA',
            clientSecret: 'q7GmMPAnGxWb_PuYXyAbDD6NQ1c',
            callbackURL: "http://localhost:3000/auth/reddit/return",
            scope:"privatemessages",
            passReqToCallback:true
        },
        function(req,accessToken, refreshToken, profile, done) {
            var tokenobject = {};
            tokenobject.tokens = {
                accessToken:accessToken,
                refreshToken:refreshToken,
                expire: +new Date().getTime()+1000*60*55
            };

            return done(null, tokenobject);   /** profile gets passed onto serialize **/
        }
    );

    return {
        redditStrategy: function(){
            passport.use(redditStrategy);
        }
    }
};

module.exports = redditModule;