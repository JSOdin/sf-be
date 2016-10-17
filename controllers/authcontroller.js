var passport = require('passport'),
    steamapi = require('../config/steamapi'),
    request = require('request'),
    async= require('async');
var authCtrl = (function(){

    function returnredirect(req,res){
        if (req.user){                                              // req.user fills up when returning from steam open ID so if req.user = undefined, login fails

            recentGamesAPI(req.user,req,res);                       //asynchronously get recently played games.

            if (!req.user.settings.admin.generalpersonal){
                return res.redirect('/privatesettings');
            }

            return res.redirect('/games');




        } else {
            return res.redirect('/');
        }
    }

    function logout(req,res){
        req.logout();   // clear session and delete session cookie on next response
        return res.redirect('/');
    }

    function recentGamesAPI(dbuser,req,res){                                     // second step in the chain. same process as new or existing user b/c we
        // need to update recentgames often
        var options = {
            url: 'http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key='+steamapi.key+'&steamid='+dbuser.steamid+'&format=json',
            json:true
        };
        request(options,function(err,response,body){
            if (!err && body.response.games) {

                dbuser.recentlyPlayed = [];                                       // empty the recentPlayed array each time login (makes sense to do that)

                async.each(body.response.games,function(game,callback){
                        var iconurl = game.img_icon_url ? 'http://media.steampowered.com/steamcommunity/public/images/apps/'+game.appid+'/'+game.img_icon_url+'.jpg':undefined;
                        var logourl = game.img_logo_url ? 'http://media.steampowered.com/steamcommunity/public/images/apps/'+game.appid+'/'+game.img_logo_url+'.jpg':undefined;

                        var recentgame = {
                            appid: game.appid,
                            name: game.name,
                            playtime_2weeks: game.playtime_2weeks,
                            playtime_forever: game.playtime_forever,
                            img_icon_url: iconurl ,
                            img_logo_url : logourl                               			};
                        dbuser.recentlyPlayed.push(recentgame)
                        return callback();                                               // must be called for each iteration to pass to the next
                    },
                    function(err){
                        if (err){
                            throw err;
                        }

                        return dbuser.save(function(){
                                console.log(dbuser.recentlyPlayed);
                        })
                    }
                )
            }
        })
    }

    return {
        returnredirect: returnredirect,
        logout: logout
    }
})();

module.exports = authCtrl;