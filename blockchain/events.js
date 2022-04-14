require('dotenv').config();
const Order = require('../models/Order');
const Share = require('../models/Share');
const Influencer = require('../models/Influencer');
const User = require('../models/User');
const {youthContract,web3} = require('./abi');
const {addShares} = require('./tx');

const initEvents = async () => {
    const BLOCK_NUMBER = await web3.eth.getBlockNumber();
    youthContract.events.ITORelease({
        fromBlock: BLOCK_NUMBER
    }, async function(err, event){ 
        let res = event.returnValues;
        console.log(res);
        Share.create({
            ownerAddress:res.id,
            influencerId:res.id,
            numShares:res.numShares,
            priceAtWhichBought:res.curPrice,
        },(err,share)=>{
            Order.create({
                address: res.id,
                price: res.curPrice,
                quantity: res.numShares,
                influencerId:res.id,
                influencerName:res.name,
                status:'Pending',
                type:'Sell'
            },(err,order)=>{
                User.findOne({id:res.id},(err,user)=>{
                    if(user==null){
                        console.log("No user found");
                        return;
                    }
                    Influencer.create({
                        numShares:res.numShares,
                        curPrice:res.curPrice,
                        averagePrice:res.curPrice,
                        name:res.name,
                        id:res.id,
                        sellOrderBook:[order],
                        sharePriceHistory: [{price: res.curPrice, atDateTime: new Date(Date.now()).toISOString()}]
                    },async(err,inf)=>{
                        user.isInfluencer = true;
                        user.influencer = inf;
                        user.save();
                        await addShares(res.id,res.id,res.numShares,user.numYouthTokens); 
                    })
                })
            })
        })
    })
    
    youthContract.events.UserCreation({
        fromBlock: BLOCK_NUMBER
    }, function(error, event){ 
        let res = event.returnValues;
        console.log(res);
        User.create({
            address: res.owner,
            id:res.id,
            name:res.name,
            numYouthTokens: res.numYouthTokens,
        },(err,user)=>{
            //console.log(user);
        })
    })
    
    youthContract.events.BuyTokens({
        fromBlock: BLOCK_NUMBER
    },(err,event)=>{
        let res = event.returnValues;
        const userId = res.to;
        User.findOne({id:userId},(err,user)=>{
            user.numYouthTokens += Number(res.value);
            user.save();
        })
    })
    
    youthContract.events.SellTokens({
        fromBlock: BLOCK_NUMBER
    },(err,event)=>{
        let res = event.returnValues;
        const userId = res.from;
        User.findOne({id:userId},(err,user)=>{
            user.numYouthTokens -= Number(res.value);
            user.save();
        })
    })
    
    youthContract.events.TransferInternal({
        fromBlock: BLOCK_NUMBER
    },(err,event)=>{
        let res = event.returnValues;
        const sender = res.sender;
        const receiver = res.receiver;
        User.findOne({id:sender},(err,senderUser)=>{
            senderUser.numYouthTokens -= Number(res.value);
            senderUser.save();
            User.findOne({id:receiver},(err,receiverUser)=>{
                receiverUser.numYouthTokens += Number(res.value);
                receiverUser.save();
            })
        })
    })
};

module.exports = {
    initEvents
}