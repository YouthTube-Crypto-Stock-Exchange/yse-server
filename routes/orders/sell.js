require('dotenv').config();
const express = require('express');
const Order = require('../../models/Order');
const Share = require('../../models/Share');
const Influencer = require('../../models/Influencer');
const User = require('../../models/User');
const {decreaseShares,increaseShares,addShares,deleteShares} = require('../../blockchain/tx');

const router = express.Router();

/* 
route purpose : to propose a sell order
expects : {influencerId,influencerName,minSellPrice,numShares}
*/
router.post('/sellShares',async(req,res)=>{
    const data = req.body;
    console.log(data);
    const influencerId = data.influencerId;
    const influencerName = data.influencerName;
    let minSellPrice = data.minSellPrice;
    const numShares = data.numShares;
    const userId = data.userId;
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(404).json({msg:'Could not retreive user information'});
        }else{
            if(gUser==null)return res.status(404).json({msg:'No such user found'});
            Influencer.findOne({id:influencerId}).populate('buyOrderBook').populate('sellOrderBook').exec((err,influencer)=>{
                if(err)return res.status(404).json({msg:'Influncer Not Found'});
                else{
                    Share.findOne({ownerAddress:userId,influencer:influencerId}).exec(async(err,share)=>{
                        if(err)return res.status(404).json({msg:'No shares of this user wrt that influencer'});
                        else{
                            if(share==null)return res.status(203).json({msg:'not enough shares'});
                            if(share.numShares >= numShares){
                                let curBuyOrderBook = influencer.buyOrderBook;
                                if(curBuyOrderBook.length!=0 && minSellPrice==-1){
                                    minSellPrice = curBuyOrderBook[curBuyOrderBook.length-1].price;
                                }
                                let curAmount = 0;
                                let tillIdx = -1;
                                for(let i=curBuyOrderBook.length-1;i>=0;i--){
                                    if(curBuyOrderBook[i].price < minSellPrice)break;
                                    if(curAmount + curBuyOrderBook[i].quantity >= numShares){
                                        tillIdx=i;
                                        break;
                                    }
                                    curAmount += curBuyOrderBook[i].quantity;
                                }
                                if(tillIdx==-1){
                                    Order.create({
                                        address: userId,
                                        price: minSellPrice,
                                        quantity: numShares,
                                        influencerId:influencerId,
                                        influencerName: influencerName,
                                        type:'Sell',
                                        status:'Pending'
                                    },(err,order)=>{
                                        if(err)return res.status(503).json({msg:'Error Creating an Order'});
                                        if(influencer.sellOrderBook.length==0)influencer.sellOrderBook.push(order);
                                        else{
                                            let flag = true;
                                            for(let i=influencer.sellOrderBook.length-1;i>=0;i--){
                                                if(influencer.sellOrderBook[i].price > minSellPrice){
                                                    influencer.sellOrderBook.splice(i+1,0,order);
                                                    flag = false;
                                                    break;
                                                }
                                            }
                                            if(flag)influencer.sellOrderBook.splice(0,0,order);
                                        }
                                        influencer.save();
                                        res.status(200).json({msg:'done'});
                                    })
                                }else{
                                    curAmount = 0;
                                    var totalYouthTokens = 0;
                                    influencer.averagePrice = (influencer.sharePriceHistory.length*influencer.curPrice+minSellPrice)/(influencer.sharePriceHistory.length+1);
                                    influencer.curPrice = minSellPrice;
                                    influencer.sharePriceHistory.push({price: maxBuyPrice, atDateTime: new Date(Date.now()).toISOString()});
                                    influencer.save();
                                    for(let i=influencer.buyOrderBook.length-1;i>=tillIdx;i--){
                                        User.findOne({id:influencer.buyOrderBook[i].address},(err,user)=>{
                                            Share.findOne({ownerAddress:influencer.buyOrderBook[i].address,influencerId:influencerId},async(err,existingShare)=>{
                                                let amountOfSharesBought = curAmount + influencer.buyOrderBook[i].quantity > numShares ? numShares - curAmount : influencer.buyOrderBook[i].quantity;
                                                let amountOfYouthTokensToBeDeducted = amountOfSharesBought*influencer.buyOrderBook[i].price;
                                                user.numYouthTokens -= amountOfYouthTokensToBeDeducted;
                                                totalYouthTokens += amountOfYouthTokensToBeDeducted;
                                                user.save();
                                                if(existingShare!=null){
                                                    existingShare.numShares += amountOfSharesBought;
                                                    existingShare.save();
                                                    await increaseShares(influencerId,influencer.buyOrderBook[i].address,influencer.existingShare.numShares,user.numYouthTokens);
                                                }else{
                                                    Share.create({
                                                        ownerAddress: influencer.buyOrderBook[i].address,
                                                        influencerId: influencerId,
                                                        numShares: amountOfSharesBought,
                                                        priceAtWhichBought: influencer.buyOrderBook[i].price,
                                                    },async(err,share)=>{
                                                        await addShares(influencerId,influencer.buyOrderBook[i].address,share.numShares,user.numYouthTokens);
                                                    })
                                                }
                                                Order.findOne({_id:influencer.buyOrderBook[i]._id}).exec((err,order)=>{
                                                    order.quantity -= amountOfSharesBought;
                                                    if(order.quantity==0){
                                                        //order.remove();
                                                        order.status = 'Completed';
                                                        order.save();
                                                        influencer.buyOrderBook.pop();
                                                        influencer.save();
                                                    }else{
                                                        order.quantity -= amountOfSharesBought;
                                                        order.status = 'Partially Completed';
                                                        order.save();
                                                    }
                                                });
                                                if(i==tillIdx){
                                                    Order.create({
                                                        address: userId,
                                                        price: minSellPrice,
                                                        quantity: numShares,
                                                        influencerId:influencerId,
                                                        influencerName: influencerName,
                                                        type:'Sell',
                                                        status:'Completed'
                                                    },async(err,curOrder)=>{
                                                        share.numShares -= numShares;
                                                        share.save();
                                                        gUser.numYouthTokens += totalYouthTokens;
                                                        gUser.save();
                                                        if(share.numShares==0){
                                                            share.remove();
                                                            await deleteShares(influencerId,userId,gUser.numYouthTokens);
                                                        }else{
                                                            await decreaseShares(influencerId,userId,share.numShares,gUser.numYouthTokens);
                                                        }
                                                        return res.status(200).json({share:share,msg:'done'});
                                                    })
                                                }
                                            })
                                        })
                                    }
                                }
                            }else res.status(404).json({msg:'Not enough shares'});
                        }
                    })
                }
            })
                
        }
    })
});

module.exports = router;
