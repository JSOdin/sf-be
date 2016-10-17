var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Counter = new Schema({
    counter:{
        type:Number
    }
});

Counter.methods.increment = function(){
   return this.counter++;
};

module.exports = mongoose.model('Counter',Counter);