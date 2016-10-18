var mongoose = require('mongoose');

module.exports =  function(){
    var options = {server:{poolSize: 3,socketOptions:{keepAlive:120, connectTimeoutMS: 30000}}};
    mongoose.connect('mongodb://localhost:50000/steambuddy',options);
    var db = mongoose.connection;
    // bind 'connection error' message to first arg of console.error(msg). functionally equivalent to:
    // function(err) {
    //      console.error('connection error:',err)
    // }
    // this is called partial application
    db.on('error', console.error.bind(console, 'connection error...'));
    db.once('open', function callback(){
        console.log('steambuddy db opened');
    });
};