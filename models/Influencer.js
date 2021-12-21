const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
    address: String,
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
    // shares:{
    //     type:mongoose.Schema.Types.Map,
    //     of:{
    //         type:mongoose.Schema.Types.ObjectId,
    //         ref:'Share'
    //     }
    // },
});

module.exports = mongoose.model('Influencer', influencerSchema);