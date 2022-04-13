const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
    id: String,
    name: String,
    numShares: Number,
    curPrice: Number,
    buyOrderBook:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Order'
        }
    ],
    sellOrderBook:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Order'
        }
    ],
    sharePriceHistory: [
        {
            price: Number,
            atDateTime: Date
        }
    ],
    averagePrice: Number
});

module.exports = mongoose.model('Influencer', influencerSchema);