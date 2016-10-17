var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GameSuggestionSchema = new Schema({
    name:{
        type:String
    },
    details:{
        type:String
    }
});

module.exports = mongoose.model('GameSuggestion',GameSuggestionSchema);