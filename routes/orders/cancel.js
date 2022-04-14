require('dotenv').config();
const express = require('express');
const Order = require('../../models/Order');
const Influencer = require('../../models/Influencer');

const router = express.Router();

/* 
route purpose : to cancel a buy order
expects : {order id}
*/
router.post('/cancel-buy-order',(req,res)=>{
    const id = req.body.id;
    Order.findById(id).exec((err,order)=>{
        if(err)return res.status(503).json({msg:'Incorrect Order ID'});
        Influencer.findOne({id:order.influencerId}).populate({path:'buyOrderBook',model:'Order'}).exec((err,inf)=>{
            console.log(inf,order);
            if(inf.buyOrderBook.length==0)return res.status(404).json({msg:'No such order'});
            for(let i=0;i<inf.buyOrderBook.length;i++){
                if(inf.buyOrderBook[i]._id.equals(order._id)){
                    inf.buyOrderBook.splice(i,1);
                    inf.save();
                    order.status = 'Cancelled';
                    order.save();
                    return res.status(200).json({msg:'Buy Order Cancelled'});
                }else if(i==inf.buyOrderBook.length-1)return res.status(404).json({msg:'No such order'});
            }
        })
    }) 
})

/* 
route purpose : to cancel a sell order
expects : {order id}
*/
router.post('/cancel-sell-order',(req,res)=>{
    const id = req.body.id;
    Order.findById(id).exec((err,order)=>{
        Influencer.findOne({id:order.influencerId}).populate({path:'sellOrderBook',model:'Order'}).exec((err,inf)=>{
            if(inf.sellOrderBook.length==0)return res.status(404).json({msg:'No such order'});
            for(let i=0;i<inf.sellOrderBook.length;i++){
                if(inf.sellOrderBook[i]._id.equals(order._id)){
                    inf.sellOrderBook.splice(i,1);
                    inf.save();
                    order.status = 'Cancelled';
                    order.save();
                    return res.status(200).json({msg:'Sell Order Cancelled'});
                }
                if(i==inf.sellOrderBook.length-1)return res.status(404).json({msg:'No such order'});
            }
        })
    }) 
  })

  module.exports = router;