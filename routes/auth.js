var express = require('express'),
    router = express.Router(),
    authCtrl = require('../controllers/authcontroller'),
    crypto=require('crypto'),
    passport=require('passport');

router.post('/steam', passport.authenticate('openid'));

router.get('/openid/return', passport.authenticate('openid'), function(req,res) {
    authCtrl.returnredirect(req, res);
});

router.get('/reddit', function(req, res, next){
    req.session.state = crypto.randomBytes(32).toString('hex');
    passport.authenticate('reddit', {
        state: req.session.state,
        duration: 'permanent'
    })(req, res, next);
});

router.get('/reddit/return', function(req, res,next){
    // Check for origin via state token

    if (req.query.state == req.session.state){

        passport.authenticate('reddit',{
            successRedirect:'/'
        })(req,res,next);

    } else {
        return res.status(500).send('oops');
    }
});


router.post('/logout',function(req,res){
    authCtrl.logout(req,res);
});

module.exports = router;
