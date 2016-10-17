var express = require('express');
var router = express.Router();
var path = require('path');
var User = require('../models/User');

var async = require('async');
var App = require('../models/App');
var request = require('request');

/** pagination stuff **/

router.get('/fetchgames/:searchterm',function(req,res){
    var query,page;
    req.session.rawSearchConditions = {};                                                            // need to set a default for users page or else pagination goes all haywire
    if (req.params.searchterm == "displayall"){                                                          // when new search term from client is empty, and previous was not empty.
        page = req.session.gamePageNum = 1;                                                                  // reset the page number to 1 ( this is like a brand new page without a search term.
        req.session.searchterm = '';
        query= App.find({$and:[{pageID:{$gte:(page-1)*16+1}},{pageID:{$lte:(page*16)}}]},{appid:1,name:1, fields:1}).sort({pageID:1}).lean();
        return query.exec(function(err,docs){
            if (docs) {
                docs[0].gamePageNum = req.session.gamePageNum;
                docs[0].term= req.session.searchterm;                                                   // when you trigger the "pageup" and "pagedown" routes, can continue browsing without a search term.
                res.json(docs);
            }
        });
    }

    if (req.params.searchterm == "pageup" ){                                                            // pageup and pagedown routes are triggered when there is no search term and user just paginates
        req.session.gamePageNum = req.session.gamePageNum ? req.session.gamePageNum+1 : 1;                          // increase session property pagenum by one or set to 1 if non exist.
        page = req.session.gamePageNum;
        query= App.find({$and:[{pageID:{$gte:(page-1)*16+1}},{pageID:{$lte:(page*16)}}]},{appid:1,name:1,pageID:1}).lean();
        return query.exec(function(err,docs){

            if (docs) {
                if (docs.length < 16){
                    docs[0].lastpage = true;
                }

                docs[0].gamePageNum = req.session.gamePageNum;

                res.json(docs);
            }
        })
    }

    if (req.params.searchterm == "pagedown"){
        req.session.gamePageNum = req.session.gamePageNum ? req.session.gamePageNum-1 : 1;
        page = req.session.gamePageNum;
        query= App.find({$and:[{pageID:{$gte:(page-1)*16+1}},{pageID:{$lte:(page*16)}}]},{appid:1,name:1,pageID:1}).lean();
        return query.exec(function(err,docs){
            if (docs) {
                docs[0].gamePageNum = req.session.gamePageNum;

                docs[0].gamePageNum = req.session.gamePageNum;
                res.json(docs);
            }
        })
    }
                                                                                                                                    // here is the part for search with various game names that are not empty.
    req.session.searchterm =  req.params.searchterm;                                                         // search with the term given and set session property
    var reg = new RegExp(req.params.searchterm, 'i');
        query = App.find({name:{$regex:reg}},{appid:1,name:1,fields:1}).lean().limit(200);                                                                        //  "lean" function strips the docs down to plain javascript objects
    return query.exec(function(err,docs){                                                                                                 // that are not Mongoose type objects
       if (err){
           res.status(400).send('nothing found')
       }
        if (docs) {
            if (docs.length > 0){
                                                                // if docs are not stripped down by "lean", they cannot be extended.
                docs[0].term= req.session.searchterm;                                           // send search term to client so client knows if pagination is needed for that specific term
               return  res.json(docs);
            }

            res.status(400).send('nothing found')
        }
    });
});

router.get('/fetchgames',function(req,res){

    req.session.rawSearchConditions = {};                                                            // need to set a default for users page or else pagination goes all haywire
    var page = req.session.gamePageNum = req.session.gamePageNum ? req.session.gamePageNum : 1;
    var query= App.find({pageID:{$gte:(page-1)*16, $lte:page*16}}, {appid:1,name:1, fields:1}).lean();
    query.exec(function(err,docs){
        if (docs) {
            docs[0].gamePageNum = req.session.gamePageNum;
            res.json(docs);
        }
    });
});

/*router.get('/profilesetup',function(req,res){
    /!* flaw: when u dont have eitehr game you're allowed to go to the form when you go to the url in browser address bar *!/
    /!*if (req.user.settings.admin.appcheck.csgo || req.user.settings.admin.appcheck.dota){
        return res.redirect('/');
    }*!/
    /!**new**!/ if ((!req.user.settings.admin.appcheck.csgo && !req.user.settings.admin.appcheck.dota) || req.user.settings.admin.submittedgameprofile){   /!** if you have neither game or have already submitted a game profile, skip to home **!/
           return res.redirect('/');
    } else if (!req.user){
        return res.redirect('/');
    }
    return res.render('index',{user:req.user, loggedin:true});
});*/

router.get('/partials/:one',function(req,res){

  return res.render('partials/'+req.params.one);
})


module.exports = router;
