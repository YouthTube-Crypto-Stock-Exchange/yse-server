require('dotenv').config();
const express = require('express');
const Order = require('../../models/Order');
const Share = require('../../models/Share');
const Influencer = require('../../models/Influencer');
const User = require('../../models/User');
const {decreaseShares,increaseShares,addShares,deleteShares} = require('../../blockchain/tx');

const router = express.Router();

/* 
route purpose : to propose a buy order
expects : {influencerId,influencerName,maxBuyPrice,numShares}
*/
router.post('/buyShares',async(req,res)=>{
    const influencerId = req.body.influencerId;
    const influencerName = req.body.influencerName;
    let maxBuyPrice = req.body.maxBuyPrice;
    const numShares = req.body.numShares;
    const userId = req.body.userId;
    console.log(userId);
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(404).json({msg:'Could not retreive user information'});
        }else{
            if(gUser.numTokens >= numShares*maxBuyPrice){
                return res.status(204).json({msg:'Not enough tokens available.'});
            }else{
                Influencer.findOne({id:influencerId}).populate('sellOrderBook').populate('buyOrderBook').exec((err,influencer)=>{
                    if(err)return res.status(404).json({msg:'Influncer Not Found'});
                    else{
                        let curSellOrderBook = influencer.sellOrderBook;
                        if(curSellOrderBook.length!=0 && maxBuyPrice==-1){
                            maxBuyPrice = curSellOrderBook[0].price;
                        }
                        console.log(curSellOrderBook,maxBuyPrice,curSellOrderBook.length);
                        let curAmount = 0;
                        let tillIdx = -1;
                        for(let i=curSellOrderBook.length-1;i>=0;i--){
                            if(curSellOrderBook[i].price > maxBuyPrice)break;
                            if(curAmount + curSellOrderBook[i].quantity >= numShares){
                                tillIdx=i;
                                break;
                            }
                            curAmount += curSellOrderBook[i].quantity;
                        }
                        console.log(tillIdx);
                        if(tillIdx==-1){
                            Order.create({
                                address: userId,
                                price: maxBuyPrice,
                                quantity: numShares,
                                influencerId:influencerId,
                                influencerName: influencerName,
                                type:'Buy',
                                status:'Pending'
                            },(err,order)=>{
                                if(err)return res.status(503).json({msg:'Error Creating an Order'});
                                if(influencer.buyOrderBook.length==0)influencer.buyOrderBook.push(order);
                                else{
                                    let flag = true;
                                    for(let i=influencer.buyOrderBook.length-1;i>=0;i--){
                                        if(influencer.buyOrderBook[i].price < maxBuyPrice){
                                            influencer.buyOrderBook.splice(i+1,0,order);
                                            flag = false;
                                            break;
                                        }
                                    }
                                    if(flag)influencer.buyOrderBook.splice(0,0,order);
                                }
                                influencer.save();
                                res.status(200).json({msg:'done'});
                            })
                        }else{
                            let curAmount = 0;
                            var totalYouthTokens = 0;
                            influencer.averagePrice = (influencer.sharePriceHistory.length*influencer.curPrice+maxBuyPrice)/(influencer.sharePriceHistory.length+1);
                            influencer.curPrice = maxBuyPrice;
                            influencer.sharePriceHistory.push({price: maxBuyPrice, atDateTime: new Date(Date.now()).toISOString()});
                            influencer.save();
                            for(let i=influencer.sellOrderBook.length-1;i>=tillIdx;i--){
                                Share.findOne({ownerAddress:influencer.sellOrderBook[i].address,influencerId:influencerId},(err,share)=>{
                                    User.findOne({id:influencer.sellOrderBook[i].address},async(err,user)=>{
                                        let amountOfSharesSold = curAmount + influencer.sellOrderBook[i].quantity > numShares ? numShares - curAmount : influencer.sellOrderBook[i].quantity;
                                        curAmount += amountOfSharesSold;
                                        share.numShares -= amountOfSharesSold;
                                        totalYouthTokens += amountOfSharesSold*influencer.sellOrderBook[i].price;
                                        share.save();
                                        user.numYouthTokens += amountOfSharesSold*influencer.sellOrderBook[i].price;
                                        user.save();
                                        if(share.numShares==0){
                                            share.remove();
                                            await deleteShares(influencerId,influencer.sellOrderBook[i].address,user.numYouthTokens)
                                        }else{
                                            await decreaseShares(influencerId,influencer.sellOrderBook[i].address,share.numShares,user.numYouthTokens);
                                        }
                                        Order.findOne({_id:influencer.sellOrderBook[i]._id}).exec((err,order)=>{
                                            order.quantity -= amountOfSharesSold;
                                            if(order.quantity==0){
                                                order.status = 'Completed';
                                                order.save();
                                                influencer.sellOrderBook.pop();
                                                influencer.save();
                                            }else{
                                                order.status = 'Partially Completed';
                                                order.save();
                                            }
                                        })
                                        if(i==tillIdx){
                                            Share.findOne({ownerAddress: userId,influencerId: influencerId},async(err,existingShare)=>{
                                                Order.create({
                                                    address: userId,
                                                    influencerId:influencerId,
                                                    influencerName: influencerName,
                                                    price: maxBuyPrice,
                                                    quantity: numShares,
                                                    status: 'Completed',
                                                    type: 'Buy',
                                                },async(err,curOrder)=>{
                                                    gUser.numYouthTokens -= totalYouthTokens;
                                                    gUser.save();
                                                    if(existingShare!=null){
                                                        existingShare.numShares += numShares;
                                                        existingShare.save();
                                                        await increaseShares(influencerId,userId,existingShare.numShares,gUser.numYouthTokens);
                                                        return res.status(200).json({share:existingShare,msg:'done'});
                                                    }else{
                                                        Share.create({
                                                            ownerAddress: userId,
                                                            influencerId: influencerId,
                                                            numShares: numShares,
                                                            priceAtWhichBought: maxBuyPrice,
                                                        },async(err,share)=>{
                                                            await addShares(influencerId,userId,share.numShares,gUser.numYouthTokens)
                                                            return res.status(200).json({share:share,msg:'done'});
                                                        })
                                                    }
                                                })
                                            })
                                        }
                                    })
                                })
                            }
                        }
                    }
                })
            }
        }
    })
});

module.exports = router;