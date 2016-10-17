var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ContactSchema = new Schema({
    subject:{
        type:String
    },
    body:{
        type:String
    }
});

module.exports = mongoose.model('ContactMsg',ContactSchema);