require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Web3 = require('web3');
const EthTx = require('ethereumjs-tx').Transaction;
const Order = require('./models/Order');
const Share = require('./models/Share');
const Influencer = require('./models/Influencer');
const User = require('./models/User');
const {youthContract,web3} = require('./abi');

const PUBLIC_ADDRESS = process.env.PUBLIC_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BLOCK_NUMBER = process.env.BLOCK_NUMBER;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const MONGO_STRING = process.env.MONGO_URL;

mongoose.connect(MONGO_STRING);

const blockchainTransactionsQueue = [];

youthContract.events.ITORelease({
    fromBlock: BLOCK_NUMBER
}, async function(error, event){ 
    let res = event.returnValues;
    Share.create({
        ownerAddress:res.id,
        influencerAddress:res.id,
        numShares:res.numShares,
        priceAtWhichBought:res.curPrice,
    },(err,share)=>{
        Order.create({
            address: res.id,
            price: res.curPrice,
            quantity: res.numShares,
            influencerAddress:res.id,
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
                    name:user.name,
                    address:res.id,
                    sellOrderBook:[order],
                    sharePriceHistory: [{price: res.curPrice, atDateTime: new Date(Date.now()).toISOString()}]
                },async(err,inf)=>{
                    user.isInfluencer = true;
                    user.influencer = inf;
                    user.save();
                    await addShares(res.id,res.id,res.numShares,user.numYouthTokens); 
                    console.log("inf",inf);
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
        console.log(user);
    })
})

youthContract.events.BuyTokens({
    fromBlock: BLOCK_NUMBER
},(err,event)=>{
    let res = event.returnValues;
    const userId = res.to;
    console.log(event);
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

function sendSignedTx(transactionObject, cb) {
    let transaction = new EthTx(transactionObject);
    const privateKey = new Buffer.from(PRIVATE_KEY, "hex");
    transaction.sign(privateKey); // sign a transaction
    const serializedEthTx = transaction.serialize().toString("hex"); // serialize the transaction
    web3.eth.sendSignedTransaction(`0x${serializedEthTx}`, cb);
}

const performTx = (data) => web3.eth.getTransactionCount(PUBLIC_ADDRESS,"pending").then(async (transactionNonce) => {
    console.log("transaction count====",transactionNonce);
    const transactionObject = {
        networkId: 5777,
        chainId:5777,
        nonce: transactionNonce,
        gasLimit: 6721975,
        gasPrice: 20000000000,
        value: 0,
        from: PUBLIC_ADDRESS,
        to: process.env.CONTRACT_ADDRESS,
        data: data
    };
    console.log("here===",transactionNonce,transactionObject);
    sendSignedTx(transactionObject, (err, ret) => {
        if (err) {
            console.log("An error occurred", err)
            return
        }
        console.log("The txHash is: ", ret)
    });
});

setInterval(()=>{
    if(blockchainTransactionsQueue.length > 0){
        performTx(blockchainTransactionsQueue.shift());
    }
},1000);

async function decreaseShares(inf,owner,numShares,numYouthTokens){
    console.log(inf,owner,numShares,numYouthTokens);
    /*if(blockchainTransactionsQueue.length==0)await performTx(youthContract.methods.decreaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
    else*/
    blockchainTransactionsQueue.push(youthContract.methods.decreaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function increaseShares(inf,owner,numShares,numYouthTokens){
    console.log(inf,owner,numShares,numYouthTokens);
    /*if(blockchainTransactionsQueue.length==0)await performTx(youthContract.methods.increaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
    else*/
    blockchainTransactionsQueue.push(youthContract.methods.increaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function addShares(inf,owner,numShares,numYouthTokens){
    console.log(inf,owner,numShares,numYouthTokens);
    /*if(blockchainTransactionsQueue.length==0)await performTx(youthContract.methods.addShares(inf,owner,numShares,numYouthTokens).encodeABI());
    else*/
    blockchainTransactionsQueue.push(youthContract.methods.addShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function deleteShares(inf,owner,numShares,numYouthTokens){
    console.log(inf,owner,numShares,numYouthTokens);
    /*if(blockchainTransactionsQueue.length==0)await performTx(youthContract.methods.deleteShares(inf,owner,numShares,numYouthTokens).encodeABI());
    else*/
    blockchainTransactionsQueue.push(youthContract.methods.deleteShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


/* 
=========== TESTING PURPOSE ONLY============
app.post('/createUser',(req,res)=>{
    console.log(req.body);
    Share.create({
        ownerAddress:req.body.name,
        influencerAddress:req.body.name,
        numShares:100,
        priceAtWhichBought:10
    },(err,share)=>{
        Order.create({
            address: req.body.name,
            price: 10,
            quantity: 100,
        },(err,order)=>{
            Influencer.create({
                numShares:100,
                curPrice:10,
                address:req.body.name,
                sellOrderBook:[order]
            },(err,inf)=>{
                User.create({
                    id:req.body.id,
                    numTokens:1000,
                    isInfluencer:true,
                    influencer:inf
                },(err,user)=>res.status(200).json({msg:'user created successfully'}));
            })
        })
    })
})

app.get('/orderBook/:name',(req,res)=>{
    console.log(req.params.name);
    Influencer.findOne({address:req.params.name},(err,inf)=>{return res.status(200).json({inf:inf})})
})
============TESTING PURPOSE ONLY============
*/

app.get('/getUserDetails/:id',(req,res)=>{

    const userId = req.params.id;
    console.log(userId);
    User.findOne({id: userId},(err, gUser)=>{
        if(err){
            return res.status(400).json({msg:'User Id Incorrect'});
        }
        else{
            const id = userId;
            const numYouthTokens = gUser.numYouthTokens;
            const isInfluencer = gUser.isInfluencer;

            var userObject = {
                id : id,
                numYouthTokens: numYouthTokens,
                isInfluencer: isInfluencer
            };

            return res.status(200).json({user:userObject});
        }
    })
});

app.get('/getShareHolders/:id', (req, res)=> {

    const influencerAddress = req.params.id;
    Influencer.findOne({address: influencerAddress}, (err, influencer) => {
        if (err) {
            return res.status(404).json({msg:'Id incorrect'});
        }
        else {
            if(influencer==null)return res.status(404).json({msg:'Influencer Not Found'});
            Share.find({influencerAddress: influencerAddress}, (err, shares)=>{
                if (err) {
                    console.log("Shares not found");
                }
                else {
                    return res.status(200).json({shareHolders: shares});
                }
            });
        }
    });
});

app.get('/dashboard/:id',(req,res)=>{
    const userId = req.params.id;
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(400).json({msg:'User Id Incorrect'});
        } else if(!gUser) {
            return res.status(200).json({msg: `User doesn't exist so creating a new one`});
        }
        else{
            Share.find({ownerAddress: gUser.id}).exec(async(err, shares) =>{
                const portfolio = [];
                await Promise.all(shares.map(async(share)=>{
                    var item = {
                        id: share.influencerAddress,
                        numShares: share.numShares,
                        priceAtWhichBought: share.priceAtWhichBought
                    };
                    Influencer.findOne({influencerAddress: share.influencerAddress}, (err, influencer) => {
                        if (err) {
                            console.log("Influencer share not in stock exchange anymore");
                        }
                        else {
                            item["name"] = influencer.name;
                        }
                    });
                    portfolio.push(item);
                }));
                return res.status(200).json({portfolio:portfolio, numYouthTokens: gUser.numYouthTokens});
            });
        }
    });
})

app.get('/holdings/:id',(req,res)=>{

    const userId = req.params.id;
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(400).json({msg:'User Id Incorrect'});
        }
        else{
            Share.find({ownerAddress: gUser.id}).exec(async(err, shares) =>{
                const portfolio = [];
                await Promise.all(shares.map(async(share)=>{
                    var item = {
                        id: share.influencerAddress,
                        numShares: share.numShares,
                        priceAtWhichBought: share.priceAtWhichBought
                    };
                    Influencer.findOne({influencerAddress: share.influencerAddress}, (err, influencer) => {
                        if (err) {
                            console.log("Influencer share not in stock exchange anymore");
                        }
                        else {
                            item["curPrice"] = influencer.curPrice;
                            item["name"] = influencer.name;
                            item["averagePrice"] = influencer.averagePrice;
                        }
                    });
                    portfolio.push(item);
                }));
                return res.status(200).json({portfolio:portfolio,numYouthTokens:gUser.numYouthTokens});
            });
        }
    });
});

app.get('/orders/:id',(req,res)=>{
    const userId = req.params.id;
	console.log("userId : ",userId);
    Order.find({address: userId}).exec(async(err, orders) =>{
        if(err)return res.status(503).json({msg:'Incorrect User ID'});
        return res.status(200).json({orders:orders});
    })
})

app.get('/getInfluencerDetails/:id',(req,res)=>{
    const influencerName = req.params.id;
    Influencer.findOne({name: influencerName}, (err, influencer) => {
        if (err) {
            return res.status(404).json({msg:'Id incorrect'});
        }
        else {
            if(influencer==null)return res.status(404).json({msg:'Influencer Not Found'});
            const numShares = influencer.numShares;
            const curPrice = influencer.curPrice;
            const buyOrderBook = influencer.buyOrderBook;
            const sellOrderBook = influencer.sellOrderBook;
            const sharePriceHistory = influencer.sharePriceHistory;
            const averagePrice = influencer.averagePrice;
            const influencerAddress = influencer.address;
            const influencerObj = {
                address: influencerAddress,
                numShares: numShares,
                curPrice: curPrice,
                buyOrderBook: buyOrderBook,
                sellOrderBook: sellOrderBook,
                sharePriceHistory: sharePriceHistory,
                name: influencerName,
                averagePrice: averagePrice
            };
            return res.status(200).json({influencer:influencerObj});
        }
    });
});


app.post('/cancelBuyOrder',(req,res)=>{
  const id = req.body.id;
  Order.findById(id).exec((err,order)=>{
      if(err)return res.status(503).json({msg:'Incorrect Order ID'});
      Influencer.findOne({address:order.influencerAddress}).populate({path:'buyOrderBook',model:'Order'}).exec((err,inf)=>{
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

app.post('/cancelSellOrder',(req,res)=>{
    const id = req.body.id;
    Order.findById(id).exec((err,order)=>{
        Influencer.findOne({address:order.influencerAddress}).populate({path:'sellOrderBook',model:'Order'}).exec((err,inf)=>{
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

app.post('/buyShares',async(req,res)=>{
    const data = req.body;
    const influencerAddress = data.influencerAddress;
    const influencerName = data.influencerName;
    let maxBuyPrice = data.maxBuyPrice;
    const numShares = data.numShares;
    const userId = data.userId;
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(404);
        }else{
            if(gUser.numTokens >= numShares*maxBuyPrice){
                return res.status(204).json({msg:'Not enough tokens available.'});
            }else{
                Influencer.findOne({address:influencerAddress}).populate('sellOrderBook').populate('buyOrderBook').exec((err,influencer)=>{
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
                                influencerAddress:influencerAddress,
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
                                Share.findOne({ownerAddress:influencer.sellOrderBook[i].address,influencerAddress:influencerAddress},(err,share)=>{
                                    User.findOne({id:influencer.sellOrderBook[i].address},async(err,user)=>{
                                        let amountOfSharesSold = curAmount + influencer.sellOrderBook[i].quantity > numShares ? numShares - curAmount : influencer.sellOrderBook[i].quantity;
                                        curAmount += amountOfSharesSold;
                                        share.numShares -= amountOfSharesSold;
                                        totalYouthTokens += amountOfSharesSold*influencer.sellOrderBook[i].price;
                                        console.log("=======>",totalYouthTokens);
                                        share.save();
                                        user.numYouthTokens += amountOfSharesSold*influencer.sellOrderBook[i].price;
                                        user.save();
                                        if(share.numShares==0){
                                            share.remove();
                                            await deleteShares(influencerAddress,influencer.sellOrderBook[i].address,0,user.numYouthTokens)
                                        }else{
                                            await decreaseShares(influencerAddress,influencer.sellOrderBook[i].address,share.numShares,user.numYouthTokens);
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
                                            Share.findOne({ownerAddress: userId,influencerAddress: influencerAddress},async(err,existingShare)=>{
                                                Order.create({
                                                    address: userId,
                                                    influencerAddress:influencerAddress,
                                                    influencerName: influencerName,
                                                    price: maxBuyPrice,
                                                    quantity: numShares,
                                                    status: 'Completed',
                                                    type: 'Buy',
                                                },async(err,curOrder)=>{
                                                    gUser.numYouthTokens -= totalYouthTokens;
                                                    console.log("HERE=========numYT=",totalYouthTokens,gUser.numYouthTokens);
                                                    gUser.save();
                                                    if(existingShare!=null){
                                                        existingShare.numShares += numShares;
                                                        existingShare.save();
                                                        await increaseShares(influencerAddress,userId,existingShare.numShares,gUser.numYouthTokens);
                                                        return res.status(200).json({share:existingShare,msg:'Share updated sucessfully'});
                                                    }else{
                                                        Share.create({
                                                            ownerAddress: userId,
                                                            influencerAddress: influencerAddress,
                                                            numShares: numShares,
                                                            priceAtWhichBought: maxBuyPrice,
                                                        },async(err,share)=>{
                                                            await addShares(influencerAddress,userId,share.numShares,gUser.numYouthTokens)
                                                            return res.status(200).json({share:share,msg:'Share added successfully'});
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

app.post('/sellShares',async(req,res)=>{
    const data = req.body;
    console.log(data);
    const influencerAddress = data.influencerAddress;
    const influencerName = data.influencerName;
    let minSellPrice = data.minSellPrice;
    const numShares = data.numShares;
    const userId = data.userId;
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(404);
        }else{
            if(gUser==null)return res.status(404).json({msg:'No such user found'});
            Influencer.findOne({address:influencerAddress}).populate('buyOrderBook').populate('sellOrderBook').exec((err,influencer)=>{
                if(err)return res.status(404).json({msg:'Influncer Not Found'});
                else{
                    Share.findOne({ownerAddress:userId,influencer:influencerAddress}).exec(async(err,share)=>{
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
                                        influencerAddress:influencerAddress,
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
                                        res.status(200).json({msg:'sell added'});
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
                                            Share.findOne({ownerAddress:influencer.buyOrderBook[i].address,influencerAddress:influencerAddress},async(err,existingShare)=>{
                                                let amountOfSharesBought = curAmount + influencer.buyOrderBook[i].quantity > numShares ? numShares - curAmount : influencer.buyOrderBook[i].quantity;
                                                let amountOfYouthTokensToBeDeducted = amountOfSharesBought*influencer.buyOrderBook[i].price;
                                                user.numYouthTokens -= amountOfYouthTokensToBeDeducted;
                                                totalYouthTokens += amountOfYouthTokensToBeDeducted;
                                                console.log("=======>",totalYouthTokens);
                                                user.save();
                                                if(existingShare!=null){
                                                    existingShare.numShares += amountOfSharesBought;
                                                    existingShare.save();
                                                    await increaseShares(influencerAddress,influencer.buyOrderBook[i].address,influencer.existingShare.numShares,user.numYouthTokens);
                                                }else{
                                                    Share.create({
                                                        ownerAddress: influencer.buyOrderBook[i].address,
                                                        influencerAddress: influencerAddress,
                                                        numShares: amountOfSharesBought,
                                                        priceAtWhichBought: influencer.buyOrderBook[i].price,
                                                    },async(err,share)=>{
                                                        await addShares(influencerAddress,influencer.buyOrderBook[i].address,share.numShares,user.numYouthTokens);
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
                                                        influencerAddress:influencerAddress,
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
                                                            await deleteShares(influencerAddress,userId,share.numShares,gUser.numYouthTokens);
                                                        }else{
                                                            await decreaseShares(influencerAddress,userId,share.numShares,gUser.numYouthTokens);
                                                        }
                                                        return res.status(200).json({share:share,msg:'Share updated sucessfully'});
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

// s

app.listen(8080,()=>{
    console.log("Server is running..");
})

