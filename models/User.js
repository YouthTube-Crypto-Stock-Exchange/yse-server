const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    address: String,
    id:String,
    numYouthTokens: Number,
    name:String,
    isInfluencer: {
        type: Boolean,
        default: false
    },
    influencer: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Influncer'
    },
});

module.exports = mongoose.model('User', userSchema);