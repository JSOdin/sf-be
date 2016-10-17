
var friendCtrl = (function(){
    function Friend(user){
        this.steamid= user.steamid;
        this.profileurl= user.profileurl;
        this.personaname= user.personaname;
        this.userPageID = user.userPageID;
        this.avatar= user.avatar;
        this.avatarmedium= user.avatarmedium;
        this.avatarfull= user.avatarfull;
        this.personal= {
            language: user.personal.language || null,
            age: user.personal.age || null,
            gender: user.personal.gender || null,
            country: user.personal.country || null,
            voip: user.personal.voip || null
        };
        this.settings = user.settings;
        this.dota = user.dota;
        this.csgo = user.csgo;
    }

    function addfriend(Model, req , res, Constructor){           // implement some blocking functionality on the client to prevent duplicate friend adds
        var incomingFriend = new Constructor(req.user);
        var notification = {
            noticetype:'friendadd',
            time: new Date(),
            /*user: req.user,*/
            user:{
                personaname: req.user.personaname
            }
        };
        Model.findOneAndUpdate({steamid:req.params.steamid,'social.friends.pending.received.steamid':{$ne:req.user.steamid}},{$push:{'social.friends.pending.received':incomingFriend,'notifications':notification}},{new:true},function(err,friend){
            if (err){               
                return res.status(400).send('couldn\'t find user');
            }
            if (friend) {
                /*friend.save(function () {*/                   // we already saved in findOneAndUpdate
                var newfriend = new Constructor(friend);

// $ne ensures unique values added only.  doing the $addToSet doesnt work because we cant be sure objects with the same steamid's will always be the same. the query means, 1) look for documents with THAT steamid, and docs that don't contain the newfriend.steamid in its 'social.friends.list' array (meaning it will not select the doc if $ne: newfriend.steamid condition is not met.

                Model.findOneAndUpdate({
                    steamid: req.user.steamid,
                    'social.friends.pending.sent.steamid': {$ne: newfriend.steamid}
                }, {$push: {'social.friends.pending.sent': newfriend}}, {}, function (err, doc) {
                    if (err) {
                        return res.status(400).send('Friend already added:' + err);
                    }
                    res.status(200);
                    return res.json(newfriend);
                });
                /*})*/
            } else {
                return res.status(500).send('something went wrong.');
            }

        })
    }

    function canceladdfriend(Model,req,res){
        // '$pull' is an array operation. from the field 'social.friends.pending.sent' remove docs whose steamid is equal to req.params.steamid.

        Model.findOneAndUpdate({steamid:req.user.steamid},{$pull:{'social.friends.pending.sent':{steamid:req.params.steamid}}},{},function(err,numAffected){
            if (err){

                return res.status(400).send('error in operation');
            } else {
                Model.findOneAndUpdate({steamid: req.params.steamid}, {$pull: {'social.friends.pending.received': {steamid: req.user.steamid}}}, {}, function (err, numAffected) {
                    if (err) {
                        return res.status(400).send('error in operation');
                    }
                    return res.status(200).send('successful')
                })
            }
        })
    }

    function acceptfriend(Model, req, res, async){
        Model.findOne({steamid:req.params.steamid},function(err,friend){
            if (err) {
                return res.status(400).send('user not found');
            }
            async.parallel([
                    function loggedinUserAcceptFriend(callback){
                        Model.findOneAndUpdate({steamid:req.user.steamid},{$pull:{'social.friends.pending.received':{steamid:req.params.steamid}}, $push:{'social.friends.list':new Friend(friend)}},function(err,numaffected){
                            if (err){                               
                                return callback(err);
                            } else {
                                return callback(null);
                            }
                        })
                    },
                    function requestSenderAcceptFriend(callback){
                        Model.findOneAndUpdate({steamid:friend.steamid},{$pull:{'social.friends.pending.sent':{steamid:req.user.steamid}},$push:{'social.friends.list':new Friend(req.user)}},function(){
                            if (err){
                                return callback(err);
                            } else {
                                return callback(null);
                            }
                        });
                    }
                ],
                function(err,results){
                    if (err){
                        return res.status(400).send('something went wrong');
                    } else {
                        return res.status(200).send('friendlist saved');
                    }
                }
            );
        })
    }

    function removefriend(Model, req, res, async){
        async.parallel([
            function loggedinUserRemoveFriend(callback){
                Model.findOneAndUpdate({steamid:req.user.steamid},{$pull:{'social.friends.list':{steamid:req.params.steamid}}},{new:true},function(err,doc){
                    if (err){
                        return callback(err);
                    } else {                   
                        doc.social.friends.groups.list.forEach(function(ea,i){
                            ea.list.forEach(function(item,j){
                                if (item.steamid == req.params.steamid){
                                    doc.social.friends.groups.list[i].list.splice(j,1);

                                }
                            })
                        });
                        doc.save(function(){
                            return callback(null);
                        });
                    }
                })
            },
            function removedFriendUpdate(callback){
                Model.findOneAndUpdate({steamid:req.params.steamid},{$pull:{'social.friends.list':{steamid:req.user.steamid}}},{new:true},function(err,doc){
                    if (err){
                        return callback(err);
                    } else {
                        doc.social.friends.groups.list.forEach(function(ea,i){
                            ea.list.forEach(function(item,j){
                                if (item.steamid == req.user.steamid){
                                    doc.social.friends.groups.list[i].list.splice(j,1);

                                }
                            })
                        });
                        doc.save(function(){
                            return callback(null);
                        })

                    }
                })
            }
        ],function(err,results){
            if (err){
                return res.status(400).send('something went wrong');
            } else {
                return res.status(200).send('friendlist saved');
            }
        })
    }

    function refuserequest(Model,req,res,async){
        async.parallel([
            function removeFromReceived(callback){
                Model.findOneAndUpdate({steamid: req.user.steamid},{$pull:{'social.friends.pending.received':{steamid:req.params.steamid}}},function(err){
                    if (err){
                        return callback(err);
                    } else {
                        return callback(null);
                    }
                })
            },
            function removeFromSent(callback){
                Model.findOneAndUpdate({steamid: req.params.steamid},{$pull:{'social.friends.pending.sent':{steamid:req.user.steamid}}},function(err){
                    if (err){
                        return callback(err);
                    } else {
                        return callback(null);
                    }
                })
            }
        ],function(err,results){
            if (err){
                return res.status(400).send('something went wrong');
            } else {
                return res.status(200).send('friendlist saved');
            }
        })
    }

    function addfriendgroup(Model,req,res,async){
        Model.findOne({steamid:req.params.steamid},function(err,doc){
            if (err) {           
                return res.status(400).send('nothing found');
            }

            doc.social.friends.groups.list.push(req.body);
            return doc.save(function(){
                return res.send('group saved');
            })
        })
    }

    function addtogroup(Model,req,res){

        Model.findOne({steamid:req.user.steamid},function(err,doc){
            if (err) {            
                return res.status(400).send('nothing found');
            }

            return doc.social.friends.groups.list.some(function(ea,i){
                if (ea.name == req.body.groupname){
                    doc.social.friends.groups.list[i].list.push(req.body.friend);

                    doc.save(function(){
                        return res.send('friend saved');
                    })
                }
            })
        })
    }

    function deletefromgroup(Model,req,res){
        Model.findOne({steamid:req.user.steamid},function(err,doc){
            if (err) {             
                return res.status(400).send('nothing found');
            }

            return doc.social.friends.groups.list.forEach(function(ea,i){
                if (ea.name == req.body.groupname){
                    return ea.list.forEach(function(val,j){
                        if (val.steamid == req.body.friend.steamid){
                            doc.social.friends.groups.list[i].list.splice(j,1);
                            return doc.save(function(){
                                return res.send('delete succesful');
                            })
                        }
                    })
                }
            })
        })
    }

    function deletegroup(Model,req,res){
        Model.findOne({steamid:req.user.steamid},function(err,doc){
            if (err) {               
                return res.status(400).send('nothing found');
            }

            return doc.social.friends.groups.list.some(function(ea,i){
                if (req.body.groupname == ea.name){
                    doc.social.friends.groups.list.splice(i,1);
                    return doc.save(function(){
                        return res.send('delete successful');
                    })
                }

            })
        })
    }

    return {
        Friend: Friend,
        addfriend: addfriend,
        canceladdfriend: canceladdfriend,
        acceptfriend: acceptfriend,
        removefriend: removefriend,
        refuserequest: refuserequest,
        addfriendgroup:addfriendgroup,
        addtogroup:addtogroup,
        deletefromgroup:deletefromgroup,
        deletegroup: deletegroup
    }
})();

module.exports = friendCtrl;