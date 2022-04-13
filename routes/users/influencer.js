require('dotenv').config();
const express = require('express');
const Share = require('../../models/Share');
const Influencer = require('../../models/Influencer');

const router = express.Router();

/* 
route purpose : to get details of all the share holders of an influencer with provided influencer id in params
*/
router.get('/getShareHolders/:id', (req, res)=> {

    const influencerId = decodeURI(req.params.id);
    Influencer.findOne({id: influencerId}, (err, influencer) => {
        if (err) {
            return res.status(404).json({msg:'Id incorrect'});
        }
        else {
            if(influencer==null)return res.status(404).json({msg:'Influencer Not Found'});
            Share.find({influencerId: influencerId}, (err, shares)=>{
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

/* 
route purpose : to get a specific influencer details with the influencer name specified in the params
*/
router.get('/getInfluencerDetails/:name',(req,res)=>{
    const influencerName = decodeURI(req.params.name);
    Influencer.findOne({name: influencerName}, (err, influencer) => {
        if (err) {
            return res.status(404).json({msg:'Incorrect information'});
        }
        else {
            if(influencer==null)return res.status(404).json({msg:'Influencer Not Found'});
            const numShares = influencer.numShares;
            const curPrice = influencer.curPrice;
            const buyOrderBook = influencer.buyOrderBook;
            const sellOrderBook = influencer.sellOrderBook;
            const sharePriceHistory = influencer.sharePriceHistory;
            const averagePrice = influencer.averagePrice;
            const influencerId = influencer.id;
            const influencerObj = {
                id: influencerId,
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


module.exports = router;