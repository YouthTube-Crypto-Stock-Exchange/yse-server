const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    address: String,
    influencerId:String,
    influencerName:String,
    price: Number,
    quantity: Number,
    status: String,
    type: String,
});

module.exports = mongoose.model('Order', orderSchema);