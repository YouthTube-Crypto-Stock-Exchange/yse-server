require('dotenv').config();
const express = require('express');
const Share = require('../../models/Share');
const Influencer = require('../../models/Influencer');
const User = require('../../models/User');
const influencerRoutes = require('./influencer');

const router = express.Router();

router.use(influencerRoutes);

/* 
route purpose : to get a specific user details with id specified in params
*/
router.get('/getUserDetails/:id',(req,res)=>{

    const userId = decodeURI(req.params.id);
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

/* 
route purpose : to get the dashboard details of the specific user with id specified in params
*/
router.get('/dashboard/:id',(req,res)=>{
    const userId = decodeURI(req.params.id);
    console.log(userId);
    User.findOne({id:userId},(err,gUser)=>{
        console.log(err,gUser);
        if(err){
            return res.status(400).json({msg:'User Id Incorrect'});
        } else if(!gUser) {
            return res.status(200).json({msg: `User doesn't exist so creating a new one`});
        }
        else{
            Share.find({ownerAddress: gUser.id}).exec(async(err, shares) =>{
                const portfolio = [];
                await Promise.all(shares.map(async(share)=>{
                    const item = {
                        id: share.influencerId,
                        numShares: share.numShares,
                        priceAtWhichBought: share.priceAtWhichBought
                    };
                    try {
                        const influencer = await Influencer.findOne({id: share.influencerId});
                        item["name"] = influencer.name;
                        item["curPrice"] = influencer.curPrice;
                        portfolio.push(item);
                    } catch(err) {
                        console.log("Influencer share not in stock exchange anymore");
                    }
                }));
                return res.status(200).json({portfolio:portfolio, numYouthTokens: gUser.numYouthTokens});
            });
        }
    });
})

/* 
route purpose : to provide holdings of user with id specified in the params
*/
router.get('/holdings/:id',(req,res)=>{

    const userId = decodeURI(req.params.id);
    User.findOne({id:userId},(err,gUser)=>{
        if(err){
            return res.status(400).json({msg:'User Id Incorrect'});
        }
        else{
            Share.find({ownerAddress: gUser.id}).exec(async(err, shares) =>{
                const portfolio = [];
                await Promise.all(shares.map(async(share)=>{
                    let item = {
                        id: share.influencerId,
                        numShares: share.numShares,
                        priceAtWhichBought: share.priceAtWhichBought
                    };
                    try {
                        const influencer = await Influencer.findOne({id: share.influencerId});
                        item["curPrice"] = influencer.curPrice;
                        item["name"] = influencer.name;
                        item["averagePrice"] = influencer.averagePrice;
                        portfolio.push(item);
                    } catch(err) {
                        console.log("Influencer share not in stock exchange anymore");
                    }
                }));
                return res.status(200).json({portfolio:portfolio,numYouthTokens:gUser.numYouthTokens});
            });
        }
    });
});

module.exports = router;