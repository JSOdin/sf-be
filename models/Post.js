var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PostSchema = new Schema({
    submittedOn:{
        type: Date
    },
    author: {
       type:String
    },
    steamid: {
        type: String
    },
    apps:[{
        appid:{
            type:Number
        },
        name: {
            type:String
        },
        fields:{
            type:Object,
            default:{}
        }
    }],
    communications:{
       type:Array
    },
    reddit:{
        type:String
    },
    email:{
        type:String
    },
    text:{
        type:String
    },
    language:{
        type:String
    },
    region:{
        type:String
    },
    country:{
      type:String
    },
    birthdate:{
        type:Date
    },
    gender :{
        type:String
    },
    memberPost:{ /* decide on the server */
        type:Boolean
    },
    passcode:{  /* generate on the server */
        type:String
    },
    uniqueKey:{
        type:String
    }
});

module.exports = mongoose.model('Post',PostSchema);