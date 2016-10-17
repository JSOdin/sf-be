var request = require('request');
var querystring = require('querystring');
var App = require('../models/App');

var postCtrl = (function(){
    function fetchposts(Model, req,res){                            // default get front page posts
        var query;

        var allQuery = Model.find().sort({submittedOn:-1}).lean();

        allQuery.count().exec().then(function(count){
            query = Model.find({}).sort({submittedOn:-1}).lean().limit(30);

            return query.exec(function (err, posts) {
                if (posts.length > 0){
                    posts.push(count);
                    return res.send(posts);
                } else {
                    return res.status(400).send('posts not found')
                }
            });
        });

    }

    function getsinglepost(Model,req,res){
        var queryPost = Model.findOne({steamid: req.params.id}).lean().sort({submittedOn:-1}),
            postApps,
            queryApp,
            obj;
        return queryPost.exec(function(err,doc){
            if (doc){
                postApps = doc.apps.map(function(ea){
                    return ea.appid;
                });
                queryApp = App.find({appid:{$in:postApps}}).lean().limit(3);
                queryApp.exec(function(err,apps){
                    if (!apps){         /** app-less post **/
                        return res.json(doc);
                    }

                    doc.apps.forEach(function(a,i){

                        apps.forEach(function(b,j){
                            if (a.appid == b.appid){
                               doc.apps[i].fieldoptions = b.fields;
                            }
                        })
                    });

                    return res.json(doc);
                })
            } else {
                res.status(400).send('not found');
            }
        });
    }

    function checkpasscodebump(Model,req,res){
        return Model.findOne({uniqueKey: req.body.uniqueKey},function(err,doc){
                if (!doc){
                    return res.status(300).send('Invalid input');
                }
                doc.submittedOn = new Date();
                var payload={
                    verified:true
                };
                return doc.save(function(){
                    return res.status(200).send(payload);
                });
        })
    }

    function memberbump (Model,req,res){
        var query = Model.findOne({steamid:req.params.id}).sort({submittedOn:-1})

        return query.exec(function(err,doc){
            if (doc){
                doc.submittedOn = new Date();
                var payload={
                    verified:true
                };
                doc.save(function(){
                    return res.status(200).send(payload);
                });

            } else {
                return res.status(300).send('Post was not found!');
            }
        })
    }

    function membereditandbump(Model,req,res){
        var query = Model.findOne({steamid:req.params.id}).sort({submittedOn:-1})

        return query.exec(function(err,doc){
            if (doc) {
                doc.submittedOn = req.body.submittedOn;
                doc.apps = req.body.apps;
                doc.reddit = req.body.reddit;
                doc.email = req.body.email;
                doc.text = req.body.text;
                doc.language = req.body.language;
                doc.region = req.body.region;
                doc.country = req.body.country;
                doc.birthdate = req.body.birthdate;
                doc.gender = req.body.gender;
                doc.communications = req.body.communications;

                req.user.personal.language = req.body.language;
                req.user.general.region = req.body.region;
                req.user.personal.country = req.body.country;
                req.user.personal.gender = req.body.gender;
                req.user.personal.birthdate = req.body.birthdate;
                req.user.settings.haspost = true;
                return doc.save(function(){
                    return req.user.save(function(){
                        return res.status(200).send('Post updated and bumped, and user profile saved');
                    })
                })
            } else {
                var newPost = new Model(req.body);

                req.user.personal.language = req.body.language;
                req.user.general.region = req.body.region;
                req.user.personal.country = req.body.country;
                req.user.personal.gender = req.body.gender;
                req.user.personal.birthdate = req.body.birthdate;
                req.user.settings.haspost = true;
                return newPost.save(function(err){
                    if (err){
                        return res.status(400).send('Something weird happened.');
                    }
                    return req.user.save(function(err){
                        if (err){
                            return res.status(400).send('Something weird happened.');
                        }
                        return res.status(200).send('Post updated and bumped, and user profile saved');
                    });
                });
            }

        });
    }

    function filterposts(Model,req,res){
        var query, filter={};

        Object.keys(req.body).forEach(function(ea){

            if (ea=='apps' || ea=='fields'){
                if (ea=='fields'){
                    return;
                }
                var obj,
                    object;
                var appids = req.body[ea].map(function(ea){
                   return ea.appid;
                });

                filter={
                    '$or':[]
                };

                return appids.forEach(function(b) {
                    obj={};

                    obj['$and']=[];
                    obj['$and'].push({
                       'apps.appid':b
                    });

                    if (req.body.fields && req.body.fields[b]) {                                        /** run only if custom game fields are present **/
                        Object.keys(req.body.fields[b]).forEach(function (a) {
                            object = {};
                            object['apps.fields.' + a] = {
                                '$in': req.body.fields[b][a]
                            };

                            obj['$and'].push(object);
                        });
                    }

                    filter['$or'].push(obj);
                });

                /** sample query: we want to find posts with apps of appid 271590 or 440. appid440 must have the Type of play: "Normal Game Modes". All posts must be english.**/
                /** explanation: '$or'

                /*

                 {
                    '$or':
                        [
                            {'$and':
                                [
                                    {'apps.appid':271590}
                                ]
                            },
                            {'$and':
                                [
                                    {
                                        'apps.appid':440
                                    },
                                    {
                                        'apps.fields.Type of Play': {'$in':["Normal Game Modes"]}
                                    }
                                ]
                            }
                        ]
                    'language':
                        {
                            '$in':
                                [
                                    'Englsh'
                                ]
                        }
                 }

                 */

            }

            if (ea=='agerange'){
                return filter['birthdate']={
                    '$gt':req.body[ea][1],
                    '$lte':req.body[ea][0]
                }
            }



            if (ea=='region' && req.body[ea] == 'EU (ALL)'){
                return filter.region = new RegExp('^eu','i');
            }

            filter[ea]={
                '$in':req.body[ea]
            };
        });


        var skip;
        if (req.params && req.params.pagination){
            skip = (req.params.pagination.split("-")[0]-1) * 30;
        } else {
            skip = 0;
        }
        var allQuery = Model.find(filter).sort({submittedOn:-1}).lean();

        allQuery.count().exec().then(function(count){
            query = Model.find(filter).sort({submittedOn:-1}).lean().skip(skip).limit(30);

            return query.exec(function (err, posts) {
                if (posts.length > 0){
                    posts.push(count);
                    return res.send(posts);
                } else {
                    return res.status(400).send('posts not found')
                }
            });
        });
    }

    function sendreddit(req,res){
        var body = {
            'api_type':'json',
            'subject':req.body.subject+' - (sent via Steamfriends.net)',
            'text': req.body.message,
            'to':req.body.username
        };

        var options = {
            uri:'https://oauth.reddit.com/api/compose?'+querystring.stringify(body),
            headers :{
                'Authorization': 'bearer '+req.session.tokens.accessToken,
                'User-Agent':'desktop:steamfriends-z:v1.0 (by /u/Thorshammerdin)'
            },
            body:querystring.stringify(body),// only a few endpoints expect JSON, so we must stringify. specifically PATCH /api/v1/me/prefs and PUT /api/v1/me/friends/{username} http://stackoverflow.com/questions/23946950/understanding-the-reddit-api-url-vs-headers-vs-body
            method:'POST'
        };

        request(options,function(err,httpResponse,body){
            if (err) throw err;        
            return res.status(200).send('ok!');
        })
    }

    function checktoken(req,res){
        if (req.session && req.session.tokens && (+req.session.tokens.expire > +new Date().getTime()) ){
            return res.status(200).send({
               access:true
            });
        } else {
            return res.status(404).send({
                access:false
            })
        }
    }



    return {
        fetchposts:fetchposts,
        getsinglepost:getsinglepost,
        checkpasscodebump: checkpasscodebump,
        memberbump: memberbump,
        membereditandbump: membereditandbump,
        filterposts: filterposts,
        sendreddit:sendreddit,
        checktoken:checktoken
    }
})();

module.exports = postCtrl;