const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
    ownerAddress: String,
    influencerAddress: String,
    numShares: Number,
    priceAtWhichBought: Number,
});

module.exports = mongoose.model('Share', shareSchema);