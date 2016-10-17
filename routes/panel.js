var express = require('express'),
    router = express.Router(),
    App = require('../models/App');

router.post('/',function(req,res){
   if ((req.body.user == 'aquila') && (req.body.pass == 'matrixhax420')){
       return res.status(200).send({
           verified:true
       });
   } else {
       return res.status(400).send({
          verified:false
       });
   }
});

router.post('/write',function(req,res){
    var writedata= {
    };
    console.log(req.body);
    writedata[req.body.field]=req.body.values;
    console.log(writedata);
   /* App.findOne({appid:Number(req.body.appid)},function(err,doc){
        if (err){
            throw err;
        } else {
            doc.fields = doc.fields || {};
            doc.fields[req.body.field] = req.body.values;
            return doc.save(function(){
                return res.status(200).send('ok');
            })
        }
    });*/

    var obj = {

    };

    obj['fields.'+req.body.field] = req.body.values;

    App.update({appid:+req.body.appid},obj,function(){
       return res.status(200).send('ok');
    });
});

module.exports = router;
