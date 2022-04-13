require('dotenv').config();
const express = require('express');
const Order = require('../../models/Order');
const buyRoutes = require('./buy');
const sellRoutes = require('./sell');
const cancelRoutes = require('./cancel');

const router = express.Router();

router.use(buyRoutes);
router.use(sellRoutes);
router.use(cancelRoutes);

/* 
route purpose : to get a specific order details with order id (:id)
*/
router.get('/orders/:id',(req,res)=>{
    const userId = decodeURI(req.params.id);
	// console.log("userId : ",userId);
    Order.find({address: userId}).exec(async(err, orders) =>{
        if(err)return res.status(503).json({msg:'Incorrect User ID'});
        return res.status(200).json({orders:orders});
    })
})

module.exports = router;