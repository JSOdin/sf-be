var mongoose = require('mongoose');
var async = require('async');
var steamapi = require('../config/steamapi');
var request = require('request');

var userCtrl = (function(){

    function getrawuser(req,res){
        req.user = req.user || {};
        return res.send(req.user);
    }

    function fetchusers(Model,req, res){
        var page, query, term;
        if (req.params.term) {

            if (req.session.hasOwnProperty('rawSearchConditions')){
                if (Object.keys(req.session.rawSearchConditions).length > 0){
                    return parseAndQuery(Model,{$lte:req.session.lastUserPageID},req,res,'recallLastPage')
                }
            }
            query = Model.find({'recentlyPlayed.name': req.params.term}).sort({userPageID:1}).lean().select('-ownedGames -comments -avatar -avatarfull -conversations -notifications').limit(15);

            return query.exec(function (err, users) {

                req.session.gameQueryTerm = req.params.term;  // comes in handy when paginating
                if (users.length > 0) {
                    req.session.gameQueryTerm= req.params.term;  // comes in handy when paginating
                    req.session.firstUserPageID = users[0].userPageID;      // first ever user
                    req.session.lastUserPageID = users[users.length-1].userPageID; // last of the batch
                    users[0].firstUserPageID = req.session.firstUserPageID;



                    if (users.length < 15){
                        req.session.veryLastUserPageID = users[users.length-1].userPageID;
                        users[0].veryLastUserPageID = req.session.veryLastUserPageID;
                    }

                    req.session.save();
                    return res.send(users);

                } else {
                    req.session.gameQueryTerm = '';
                    req.session.save();
                    return res.status(400).send('users not found');
                }
            })
        }

        if (req.session.hasOwnProperty('rawSearchConditions')){
            if (Object.keys(req.session.rawSearchConditions).length > 0){
                req.session.gameQueryTerm = '';
                return parseAndQuery(Model,{$lte:req.session.lastUserPageID},req,res,'recallLastPage',true)
            }
        }

        if (req.session.lastUserPageID) {
            req.session.gameQueryTerm = '';
            return parseAndQuery(Model,{$lte:req.session.lastUserPageID},req,res);
        }
        /** no term query on website load **/

        query = Model.find().sort({userPageID:1}).lean().select('-ownedGames -comments -avatar -avatarfull -conversations -notifications').limit(15);
        return query.exec(function (err, users) {

            if (users.length > 0) {


                if (users.length < 15){
                    users[0].veryLastUserPageID = users[users.length-1].userPageID;
                }
                req.session.rawSearchConditions = {};                                                                       // need to reset raw search cache b/c if it exists it gets caught in parseAndQuery and errors
                req.session.gameQueryTerm ='';
                req.session.lastUserPageID = users[users.length - 1].userPageID;

                req.session.firstUserPageID = users[0].userPageID;


                users[0].firstUserPageID = req.session.firstUserPageID;            // send off the first ID for disabling pagination btn

                req.session.save();
                return res.send(users);
            }
        });
    }

    /**

    1. fetchusers - first, the users are sent by default upon site load
    2. searchbyformgetbatch - contrary to name this is also the logic that handles no-form pagination
    3. formDataParse - this handles form data and parses it into a format that works with mongoose/mongodb
    4. serchbyform - handles queries via form.

     **/

    function formDataParser(conditions,req,res){
        var i, j, k,
            dbcondition = {
                '$and':[]
            },insertitem;

        if (Object.keys(conditions).length == 0){
            return {};
        }

        if (conditions.general){
            if (conditions.general.region == 'eu (all)'){
                conditions.general.region = new RegExp('^eu','i');
            }
        }

        if (conditions.gameterm){                               // if we are searching for users within a game (with a form)
            req.session.gameQueryTerm= conditions.gameterm;     // we save the term to session before deleting
            var game = {};
            game.term = conditions.gameterm;                    // save by value, not reference
            delete conditions.gameterm;                         // then delete it because it will cause problems later
        }

        for (i in conditions){                                                                              // we need to loop through each of the object levels
            if (conditions.hasOwnProperty(i) && conditions[i] instanceof Object){                    // at each level we check for object or string
                for (j in conditions[i]){
                    if (conditions[i][j] instanceof RegExp){
                        insertitem = {};
                        insertitem[i+'.'+j] = conditions[i][j];
                        dbcondition['$and'].push(insertitem);
                        continue;
                    }

                    if (conditions[i].hasOwnProperty(j) && (conditions[i][j] instanceof Object|| conditions[i][j] instanceof Array)){
                        if (Array.isArray(conditions[i][j])){                                        // stop arrays from being processed. specifically 'personal.agerange'
                            continue;
                        }

                        for (k in conditions[i][j]){
                            insertitem={};
                            insertitem[i+'.'+j+'.'+k] = conditions[i][j][k];
                            dbcondition['$and'].push(insertitem);                                           // insert at the outermost level
                        }
                    } else {
                        insertitem={};
                        insertitem[i+'.'+j] = conditions[i][j];
                        dbcondition['$and'].push(insertitem);                                               // insert at the outermost level
                    }
                }
            } else {
                insertitem={};
                insertitem[i] = conditions[i];
                dbcondition['$and'].push(insertitem);                                                       // insert at the outermost level
            }
        }



        if (game){
            dbcondition['$and'].push({'recentlyPlayed.name':game.term});
        }


        if (/*req.body.personal ||*/ conditions.personal){                                                                         // construct a date query condition. need to separate it from the main because of the array.
            var personal,agerange;

         /*   if (req.body.personal){
                personal = req.body.personal;
                agerange = req.body.personal.agerange;
            }*/

           /* if (conditions.personal){*/
                personal = conditions.personal;
                agerange = conditions.personal.agerange;
           /* }*/

            if (personal.hasOwnProperty('agerange')){
                if (agerange.length == 1){
                    dbcondition['$and'].push({'personal.birthdate':{'$lte':agerange[0]}});            //35 years or older
                } else {
                    dbcondition['$and'].push({'personal.birthdate':{'$lte': agerange[0],'$gt':agerange[1]}});
                }
            }
        }


        if (dbcondition['$and'].length == 1){                                                   // $and operator wont work with only one item.
            dbcondition = dbcondition['$and'][0];
        }
        req.session.save();

        return dbcondition;
    }


    function searchByForm(Model, req,res){
        /** used for both game and game-less queries. getting the first page before any pagination calls **/

        var query,dbcondition;

        req.session.rawSearchConditions = req.body;// save raw formdata to re-display on hthe form on reload and also used for pagination.


        /** below we parse the body into a form that can fit mongoose **/

        dbcondition = formDataParser(req.session.rawSearchConditions,req);

        /** end parsing **/

        query = Model.find(dbcondition).sort({userPageID:1}).lean().select('-ownedGames -comments -avatar -avatarfull -conversations -notifications').limit(15);

        return query.exec(function(err,docs){
            if (err){
                
            }

            if (docs) {
                if (docs.length > 0) {
                    req.session.firstUserPageID = docs[0].userPageID; // first ever for the search

                    req.session.lastUserPageID = docs[docs.length - 1].userPageID;    // for up pagination on server
                    req.session.firstInBatch = docs[0].userPageID;              //for down pagination on server

                    docs[0].firstUserPageID = req.session.firstUserPageID;

                    if (docs.length < 15){
                        docs[0].veryLastUserPageID = docs[docs.length-1].userPageID;
                    }



                    req.session.save();
                    return res.json(docs);
                }
            }
            req.session.rawSearchConditions = {};                       // clean search results cache if nothind found.
            req.session.save();
            return res.status(400).send('users not found');
        })
    }

    function parseAndQuery(Model,IDquery,req,res, direction, startedSession) {

        var query,dbcondition;
        /*if (req.session.lastUserPageID) {*/
            if (Object.keys(req.session.rawSearchConditions).length > 0) {      // when we are paginating a form query

                dbcondition = formDataParser(req.session.rawSearchConditions,req);
                if (dbcondition.hasOwnProperty('$and')){
                    dbcondition['$and'].push({
                        userPageID: IDquery
                    });

                    if (req.session.gameQueryTerm){
                        dbcondition['$and'].push({'recentlyPlayed.name':req.session.gameQueryTerm});
                    }
                } else {                            // here we know theres only one item in the '$and' arr
                    var objcopy = {};

                    objcopy['$and'] = [dbcondition]; //
                    objcopy['$and'].push({
                        userPageID: IDquery
                    });

                    if (req.session.gameQueryTerm){
                        objcopy['$and'].push({'recentlyPlayed.name':req.session.gameQueryTerm});
                    }

                    dbcondition=objcopy;        // we replace the old dbcondition with new
                }


            } else {

                dbcondition = {                     // when we are paginating a blank query (site load)
                    userPageID:  IDquery
                };
                if (req.session.gameQueryTerm && !startedSession){
                    dbcondition = {
                        '$and':[{'recentlyPlayed.name':req.session.gameQueryTerm},{userPageID: IDquery}]
                    }
                }
            }

            if (direction == 'next'){
                query = Model.find(dbcondition).sort({userPageID: 1}).lean().select('-ownedGames -_id -profileurl -comments -avatar -avatarfull -conversations -notifications').limit(15);
            } else if (direction == 'recallLastPage') {
                query = Model.find(dbcondition).sort({userPageID: -1}).lean().select('-ownedGames -_id -comments -avatar -avatarfull -conversations -notifications').limit(15);
            } else {
                    query = Model.find(dbcondition).sort({userPageID: -1}).lean().select('-ownedGames -_id -comments -comments -avatar -avatarfull -conversations -notifications').limit(15);  /** for downwards pagination have to reverse the order of results. ex. if theres docs # 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15  lte: {userPageID: 11} with limit of 5 would give 1,2,3,4,5, and not  7,8,9,10,11. **/

            }

            return query.exec(function (err, docs) {

                if (docs) {

                    if (docs.length > 0) {
                        if (direction == 'next'){

                            req.session.lastUserPageID = docs[docs.length - 1].userPageID;  // last user accessed
                            req.session.firstInBatch = docs[0].userPageID;                 // first user only in that batch

                            docs[0].firstUserPageID = req.session.firstUserPageID;  // first ever user. send on each request to allow for button checking

                            if (docs.length < 15){                                  // less than 15 results means last ever page.
                                req.session.veryLastUserPageID = docs[docs.length-1].userPageID;
                                docs[0].veryLastUserPageID =  req.session.veryLastUserPageID;
                            }


                            req.session.save();
                            return res.json(docs);
                        } else if (direction=='previous') {
                            req.session.lastUserPageID = docs[0].userPageID;  // last user accessed (first element due to reversing)
                            req.session.firstInBatch =  docs[docs.length - 1].userPageID;          // first user only in that batch (last element due to reversing)


                            docs.sort(function(a,b){
                                return a.userPageID - b.userPageID;
                            });

                            docs[0].firstUserPageID = req.session.firstUserPageID;  // first ever user. send on each request to allow for button checking

                            req.session.save();
                            return res.json(docs);
                        } else {
                            docs.sort(function(a,b){
                                return a.userPageID - b.userPageID;
                            });

                            if (req.session.hasOwnProperty('rawSearchConditions')){
                                if (Object.keys(req.session.rawSearchConditions).length > 0){
                                    docs[0].searchFormHistory = req.session.rawSearchConditions;
                                }
                            }

                            docs[0].firstUserPageID = req.session.firstUserPageID;  // first ever user. send on each request to allow for button checking

                            return res.json(docs);

                        }


                    } else {
                        req.session.save();
                        return res.status(400).send('users not found');
                    }
                } else {
                    req.session.save();
                    return res.status(400).send('users not found');
                }
            });

        /*}*/
    }

    function searchByFormGetBatch(Model, req,res){
        if (req.params.action == 'next') {
            parseAndQuery(Model,{$gt: req.session.lastUserPageID},req,res, req.params.action);
        } else if (req.params.action == 'previous'){
            parseAndQuery(Model,{$lt: req.session.firstInBatch},req,res, req.params.action);
        }
    }

    function updatesettings(Model,req,res){

        Model.findOne({steamid:req.params.steamid},function(err,doc){

            doc.personal.language = req.body.personal.language;
            doc.personal.country = req.body.personal.country;
            doc.personal.communication = req.body.personal.communication;
            doc.personal.gender=req.body.personal.gender;
            doc.personal.birthdate = new Date(req.body.personal.birthdate);
            doc.general.region = req.body.general.region;
            doc.general.time = req.body.general.time;
            doc.general.intent = req.body.general.intent;
            doc.general.introduction = req.body.general.introduction;

            doc.dota = req.body.dota;
            doc.csgo = req.body.csgo;

          /*  doc.dota.serverregion = req.body.dota.serverregion;
            doc.dota.position = req.body.dota.position;
            doc.dota.rank.solommr = req.body.dota.rank.solommr;
            doc.dota.rank.partymmr = req.body.dota.rank.partymmr;
            doc.dota.mode = req.body.dota.mode;

            doc.csgo.mode = req.body.csgo.mode;
            doc.csgo.rank = req.body.csgo.rank;
            doc.csgo.role = req.body.csgo.csgorole;
            doc.csgo.team = req.body.csgo.team;
            doc.csgo.howlong = req.body.csgo.howlong;*/

            if (!doc.settings.user){
                doc.settings.user = {};
            }
            doc.settings.user.addSteamSetting = req.body.settings.user.addSteamSetting;
            doc.settings.user.msgOnSiteSetting = req.body.settings.user.msgOnSiteSetting;
            doc.settings.user.profilePrivacy = req.body.settings.user.profilePrivacy;
            doc.settings.user.noDisplayStats = req.body.settings.user.noDisplayStats;
            doc.settings.user.noDisplayLinks = req.body.settings.user.noDisplayLinks;


            doc.save(function(err){
                if (err){
                
                }
                return res.send('doc saved');
            })
        })
    }

    function fetchuser(Model,req,res){
        if (req.params.pageid=='thisuser') {
            return res.json(req.user);
        } else if (req.params.pageid == 'refreshuser') {
            var obj = {};
            if (req.user) {
                obj.steamid=req.user.steamid;
                obj.personaname=req.user.personaname;
                obj.personal = req.user.personal;
                obj.general = req.user.general;
                obj.notifications = req.user.notifications;
                obj.conversations = req.user.conversations;
                obj.settings = req.user.settings;
                obj.social = req.user.social;
                obj.blocked = req.user.blocked;
                obj.comments = req.user.comments;
            }
            return res.json(obj);
        }  else {
            Model.findOne({userPageID: req.params.pageid},function(err,doc){
                if (doc){
                    return res.send(doc);
                } else {
                    return res.status(400).send('User not found');
                }

            });
        }
    }

    function sendGameSuggestion(Model,req,res){
        var suggestion = new Model({
            name: req.body.gamename,
            details: req.body.details
        });
        suggestion.save(function(){
            res.send('suggestion saved');
        })
    }

    function blockuser(Model,req,res){
        Model.update({steamid:req.user.steamid},{$push:{blocked:req.params.steamid}},function(err){
            if (err){
                return res.status(400).send('failed');
            }

            return res.status(200).send('ok')
        });
    }

    function unblockuser(Model,req,res){
        Model.update({steamid:req.user.steamid},{$pull:{blocked:req.params.steamid}},function(err){
            if (err){
                return res.status(400).send('failed');
            }

            return res.status(200).send('ok')
        })
    }

    function getnotices(Model,req,res){
        Model.findOne({steamid:req.params.steamid},function(err,doc){
            if (err){
                return res.status(400).send('failed');
            }

            doc.notifications.forEach(function(ea,i){
                doc.notifications[i].read = true;
            });

            doc.save(function(){
                return res.status(200).json(doc.notifications);
            });
        });
    }

    function triggersetting(Model,req,res){
        Model.findOne({steamid:req.user.steamid},function(err,doc){
            if (err){
                return res.status(400).send('failed');
            }

            doc.settings.admin.generalpersonal = true;
            doc.settings.admin.submittedgameprofile = true;
            doc.save(function(){
                return res.status(200).send('heya boya')
            });
        })
    }

    function getquickmatches(Model,req,res){
        var gameQuery = req.params.game == 'recentlyplayed' ? {'$in':req.user.recentlyPlayed} : req.params.game;

        var bdayhigh = new Date(req.user.personal.birthdate.getTime()-1000*60*60*24*365*5); // find older people
        var bdaylow = new Date(req.user.personal.birthdate.getTime()+1000*60*60*24*365*2);

        var query = Model.find({'recentlyPlayed.name':gameQuery,'personal.birthdate': {'$gte':bdayhigh,'$lte':bdaylow},'personal.language':req.user.personal.language}).lean().select('steamid userPageID settings addfriendurl personal');
        query.exec(function(err,docs){
            if (!docs){
                return res.status(400).send('bad request no docs found');
            }

            if (docs.length > 0){

                var steamids=docs.map(function(ea){
                    return ea.steamid;
                });
                steamids = steamids.join(',');
                var options = {
                    url: 'http://api.steampowered.com/iSteamUser/GetPlayerSummaries/v0002/?key='+steamapi.key+'&steamids='+ steamids,
                    json:true
                };
                request(options,function(err,response,body){

                    if (body.response.players){
                        body.response.players.forEach(function(ea,i){
                            docs.forEach(function(v,j){
                                if (ea.steamid == v.steamid){
                                    body.response.players[i].userPageID = v.userPageID;
                                    body.response.players[i].settings = v.settings;
                                    body.response.players[i].addfriendurl = v.addfriendurl;
                                    body.response.players[i].personal = v.personal;
                                }
                            })
                        })
                    }

                    return res.json(body.response);
                })
            } else {
              return res.status(400).send('bad request no docs found');
            }
        });
    }

    function submitpost(model,req,res){      
        if (req.body.loggedin){                                                                     // logged in users can only make one post
            var query = model.findOne({steamid:req.params.id}).sort({submittedOn:-1});
            query.exec(function(err,doc){
                if (!doc){
                    var post = new model(req.body);
                    if (req.user){
                        req.user.settings.haspost = true;
                        req.user.personal.language = req.body.language;
                        req.user.general.region = req.body.region;
                        req.user.personal.country = req.body.country;
                        req.user.personal.gender = req.body.gender;
                        req.user.personal.birthdate = req.body.birthdate;

                        dateparts = req.body.birthdate ? req.body.birthdate.split("/"):'';
                        req.user.personal.birthdate = dateparts ? new Date(dateparts[2],dateparts[0]-1,dateparts[1]): '';

                        req.user.save(function(){})
                    }

                    return post.save(function(err){
                        return res.status(200).send('post saved');
                    })
                } else {
                    if (req.user){                                                              // if logged in but previously made a post as a guest. latest post will be replaced.
                        req.user.settings.haspost = true;
                        req.user.personal.language = req.body.language;
                        req.user.general.region = req.body.region;
                        req.user.personal.country = req.body.country;
                        req.user.personal.gender = req.body.gender;

                        dateparts = req.body.birthdate ? req.body.birthdate.split("/"):'';
                        req.user.personal.birthdate = dateparts ? new Date(dateparts[2],dateparts[0]-1,dateparts[1]): '';

                        return req.user.save(function(){
                            for (var id in req.body ){
                                doc[id]= req.body[id];
                            }

                            return doc.save(function(err){
                                return res.status(200).send('Post saved. Your old post was replaced.');
                            })
                        })
                    }

                    return res.status(300).send('there\'s an existing post for this steamid');
                }
            })
        } else {

            var post = new model(req.body);                                                     // logged out users can make multiple posts
            return post.save(function(err){
                return res.status(200).send('post saved');
            })
        }
    }


    return {
        fetchuser: fetchuser,
        fetchusers: fetchusers,
        searchbyform: searchByForm,
        searchbyformnextbatch: searchByFormGetBatch,
        updatesettings: updatesettings,
        sendgamesuggestion:sendGameSuggestion,
        blockuser: blockuser,
        unblockuser: unblockuser,
        getnotices: getnotices,
        getrawuser : getrawuser,
        triggersetting: triggersetting,
        getquickmatches: getquickmatches,
        submitpost: submitpost
    }
})();

module.exports = userCtrl;