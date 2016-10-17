var async = require('async'); 

var signupCtrl = (function(){

    function submitinitial(req,res){
        req.user.settings.admin.generalpersonal = true;   

        req.user.save(function(err){
            if (err) throw err;
            return res.status(200).send('saved user setting');
        })
    } 

    return {
        submitinitial: submitinitial
    }
})();

module.exports = signupCtrl;