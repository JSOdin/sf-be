var async = require('async');
var mongoose = require('mongoose');

var msgCtrl = (function(){
    function sendmessage(Model,req,res){
        var id = mongoose.Types.ObjectId();

        async.parallel([
            function saveMyConvo(callback){
                Model.findOne({steamid: req.body.conversation.fromsteamid},function(err,doc){

                    if (err) return callback(err);

                    var myconvo = {
                        with: req.body.conversation.to,
                        withsteamid: req.body.conversation.tosteamid,
                        withpageid: req.body.conversation.touserpageid,
                        subject: req.body.conversation.subject,
                        connectID: id,
                        read:true,
                        messages:[]
                    };

                    myconvo.messages.push({
                        from: req.body.message.from,
                        fromsteamid : req.body.message.fromsteamid,
                        frompageid: req.body.message.frompageid,
                        body: req.body.message.body,
                        submitted: req.body.message.submitted
                    });

                    doc.conversations.push(myconvo);

                    doc.save(function(){
                        return callback()
                    })
                });
            },
            function saveRecipientConvo(callback){
                Model.findOne({steamid: req.params.steamid}, function(err,doc){
                    if (err) return callback(err);
                    var otherconvo = {
                        with: req.user.personaname,
                        withsteamid: req.user.steamid,
                        withpageid: req.user.userPageID,
                        subject: req.body.conversation.subject,
                        connectID: id,
                        messages:[]
                    };

                    otherconvo.messages.push({
                        from: req.body.message.from,
                        fromsteamid : req.body.message.fromsteamid,
                        frompageid: req.body.message.fromuserpageid,
                        body: req.body.message.body,
                        submitted: req.body.message.submitted
                    });

                    doc.conversations.push(otherconvo);
                    doc.save(function(){
                        return callback();
                    })
                })
            }
        ],function(err,results){
            if (err){
                return res.status(400).send('something went wrong');
            } else {
                return res.status(200).send('convo saved');
            }
        });
    }

    function fetchconvos(Model,req,res){
        Model.findOne({steamid:req.params.steamid},function(err,doc){
            if (doc){
                return res.send(doc.conversations);
            }

            return res.status(400).send('user not found');
        });
    }





    function fetchconvo(Model,req,res){
        Model.findById(req.user._id, function(err,doc){
            if (doc){
                var result = doc.conversations.filter(function(ea){
                    return ea._id == req.params.id;
                })[0];

                doc.conversations.id(req.params.id).read = true;
                doc.save(function(){
                    return res.send(result);
                })
            }

        })
    }

    function replytoconvo (Model,req,res){       
        async.parallel([
            function replymyconvo(callback){
                Model.findById(req.user._id, function(err,doc){
                    if (doc){
                        doc.conversations.id(req.params.id).messages.push({
                            from: req.body.from,
                            fromsteamid: req.body.fromsteamid,
                            frompageid: req.body.frompageid,
                            body : req.body.body,
                            submitted: new Date(req.body.submitted)
                        });
                        doc.save(function(){
                            return callback();
                        });
                    } else {
                        return callback(err);
                    }
                });
            },
            function replyrecipientconvo(callback){
                Model.findOne({steamid: req.body.withsteamid},function(err,doc){
                    if (doc){
                        var index ='';
                        doc.conversations.some(function(ea,i,arr){
                            if (arr[i]['connectID'] == req.body.connectID){                              
                                return index =i;

                            }
                        });

                        doc.conversations[index].messages.push({
                            from: req.body.from,
                            fromsteamid: req.body.fromsteamid,
                            frompageid: req.body.frompageid,
                            body : req.body.body,
                            submitted: new Date(req.body.submitted)
                        });
                        doc.conversations[index].read = false;
                        doc.save(function(){
                            return callback();
                        });

                    } else {
                        return callback(err);
                    }
                })
            }
        ],function(err,results){
            if (err){
                return res.status(400).send('something went wrong');
            } else {
                return res.status(200).send('update complete');
            }
        })



    }

    function deleteconvo(Model,req,res){                                                // replace messages array in converation with empty array for only the deleter.
        Model.findOne({_id:req.user._id},function(err,doc){
            if (err){
                return res.status(500).send('oops, somethin went wrong');
            } else {
                doc.conversations.id(req.params.id).messages = [];
                doc.save(function(){
                    return res.send('everything gone ok');
                })
            }
        });

    }

    function sendcomment(Model,req,res){
        Model.findOne({steamid:req.params.steamid},function(err,doc){
            if (err){                
                return res.status(500).send('oops, somethin went wrong');
            } else {
                if (!doc.comments){
                    doc.comments = [];
                }
                var comment = req.body;
                var notification = {
                    noticetype:'comment',
                    time: new Date(),
                    /*user: req.user*/
                    user:{
                        personaname: req.user.personaname
                    }
                };
                comment.blocked = req.user.blocked;
                doc.comments.push(comment);

                doc.notifications = doc.notifications ? doc.notifications : [];
                doc.notifications.push(notification);
                doc.save(function(){                  
                    return res.send('everythins alright');
                })
            }
        })
    }

    function deleteallconvos(Model,req,res){
        Model.findOne({steamid:req.params.steamid},function(err,doc){
            if (err){             
                return res.status(500).send('oops, somethin went wrong');
            } else {
                doc.conversations.forEach(function(ea,i){
                    doc.conversations[i].messages = [];
                });
                doc.save(function(){
                    return res.send('everythins alright');
                });
            }
        })
    }

    function contactus(Model,req,res){
        var contact = new Model(req.body);
        contact.save(function(){
            res.status(200).send('ok');
        })
    }

    return {
        sendmessage: sendmessage,
        fetchconvos:fetchconvos,
        fetchconvo: fetchconvo,
        replytoconvo:replytoconvo,
        deleteconvo: deleteconvo,
        sendcomment: sendcomment,
        deleteallconvos: deleteallconvos,
        contactus: contactus
    }
})();

module.exports = msgCtrl;