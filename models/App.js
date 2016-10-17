var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AppSchema = new Schema({
    pageID:{
      type: Number,
      index:{
          unique:true
      }
    },
    appid :{
        type: Number,
        required:true,
        index:{
            unique:true,
            sparse:true
        }
    },
    name: {
        type:String,
        index:true
    },
    currentPlayers:{
        type: Number
    },
    fields: {
        type:Object
    }
});

module.exports = mongoose.model('App',AppSchema);