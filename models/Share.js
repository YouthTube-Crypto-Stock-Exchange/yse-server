const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
    ownerAddress: String,
    influencerId: String,
    numShares: Number,
    priceAtWhichBought: Number,
});

module.exports = mongoose.model('Share', shareSchema);