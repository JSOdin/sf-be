var express = require('express');
var router = express.Router();
var Post = require('../models/Post');
var postCtrl = require('../controllers/postcontroller');
router.get('/fetchposts',function(req,res){
    postCtrl.fetchposts(Post,req,res);
});

router.get('/getsinglepost/:id',function(req,res){
    postCtrl.getsinglepost(Post,req,res);
});

router.post('/checkpasscodebump',function(req,res){
    postCtrl.checkpasscodebump(Post,req,res);
});

router.post('/memberbump/:id',function(req,res){
    postCtrl.memberbump(Post,req,res);
});

router.post('/membereditandbump/:id',function(req,res){
    postCtrl.membereditandbump(Post,req,res);
});

router.post('/filterposts/',function(req,res){
    postCtrl.filterposts(Post,req,res);
});

router.post('/filterposts/:pagination',function(req,res){
    postCtrl.filterposts(Post,req,res);
});

router.post('/sendreddit',function(req,res){
    postCtrl.sendreddit(req,res);
});

router.get('/checktoken',function(req,res){
    postCtrl.checktoken(req,res);
});

module.exports = router;

