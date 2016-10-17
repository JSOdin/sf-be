var express = require('express');
var router = express.Router();
var User = require('../models/User');
var Post = require('../models/Post');
var ContactUs = require('../models/ContactUs');
var async = require('async');
var userCtrl = require('../controllers/usercontroller');
var friendCtrl = require('../controllers/friendcontroller');
var signupCtrl = require('../controllers/signupcontroller');
var msgCtrl = require('../controllers/messagecontroller');
var GameSuggestion = require('../models/GameSuggestion');

router.get('/getrawuser',function(req,res){
    userCtrl.getrawuser(req,res);
});

router.get('/fetchusers/:term',function(req,res){
    userCtrl.fetchusers(User,req,res)

});

router.get('/fetchusers',function(req,res){

    userCtrl.fetchusers(User,req,res);

});

router.post('/searchbyform',function(req,res){
    userCtrl.searchbyform(User, req,res);

});

router.post('/searchbyform/:action',function(req,res){
    userCtrl.searchbyformnextbatch(User,req,res);
})

router.get('/fetchuser/:pageid',function(req,res){
    userCtrl.fetchuser(User,req,res);
});

router.get('/fetchconvos/:steamid',function(req,res){
    msgCtrl.fetchconvos(User,req,res);
});

router.get('/fetchconvo/:id',function(req,res){
    msgCtrl.fetchconvo(User,req,res);
});


router.post('/sendcomment/:steamid',function(req,res){
    msgCtrl.sendcomment(User,req,res);
});

router.post('/sendmessage/:steamid',function(req,res){

    msgCtrl.sendmessage(User,req,res);
});

router.post('/replytoconvo/:id',function(req,res){
    msgCtrl.replytoconvo(User,req,res);
});

router.post('/deleteconvo/:id',function(req,res){
    msgCtrl.deleteconvo(User,req,res);
})

router.post('/refuserequest/:steamid', function(req,res){
   friendCtrl.refuserequest(User,req,res,async);
});
/*
router.get('/getownedgames/:steamid',function(req,res){
    signupCtrl.getownedgames(User,req,res);
})*/

router.post('/submitinitial',function(req,res){
    signupCtrl.submitinitial(req,res);
});

router.post('/submitgameprofile',function(req,res){
    signupCtrl.submitgameprofile(req,res);
});

router.post('/addfriend/:steamid',function(req,res){
    friendCtrl.addfriend(User,req,res,friendCtrl.Friend);
});

router.get('/canceladdfriend/:steamid',function(req,res){
    friendCtrl.canceladdfriend(User,req,res);
});

router.post('/acceptfriend/:steamid',function(req,res){
    friendCtrl.acceptfriend(User,req,res,async);
});

router.post('/removefriend/:steamid',function(req,res){
    friendCtrl.removefriend(User,req,res,async);
});

router.post('/addfriendgroup/:steamid',function(req,res){
    friendCtrl.addfriendgroup(User,req,res,async);
});

router.post('/addtogroup',function(req,res){
    friendCtrl.addtogroup(User,req,res,async);
});

router.post('/deletefromgroup',function(req,res){
    friendCtrl.deletefromgroup(User,req,res,async);
});

router.post('/deletegroup',function(req,res){
    friendCtrl.deletegroup(User,req,res);
});

router.post('/updatesettings/:steamid',function(req,res){
    userCtrl.updatesettings(User,req,res);
});

router.post('/deleteallconvos/:steamid',function(req,res){
    msgCtrl.deleteallconvos(User,req,res);
});

router.post('/sendgamesuggestion/',function(req,res){
    userCtrl.sendgamesuggestion(GameSuggestion, req,res);
})

router.post('/blockuser/:steamid',function(req,res){
    userCtrl.blockuser(User,req,res);
});

router.post('/unblockuser/:steamid',function(req,res){
    userCtrl.unblockuser(User,req,res);
});

router.get('/getnotices/:steamid',function(req,res){
    userCtrl.getnotices(User,req,res);
});

router.post('/contactus',function(req,res){
   msgCtrl.contactus(ContactUs,req,res);
});

router.post('/triggersetting',function(req,res){
    userCtrl.triggersetting(User,req,res);
});

router.get('/quickmatch/:game',function(req,res){
    userCtrl.getquickmatches(User,req,res);
});

router.post('/submitpost/:id',function(req,res){
    userCtrl.submitpost(Post,req,res);
});

module.exports = router;

