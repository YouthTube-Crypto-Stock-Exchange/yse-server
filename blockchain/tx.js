const EthTx = require('ethereumjs-tx').Transaction;
const {youthContract,web3} = require('../abi');

const blockchainTransactionsQueue = [];

function sendSignedTx(transactionObject, cb) {
    let transaction = new EthTx(transactionObject);
    const privateKey = new Buffer.from(process.env.PRIVATE_KEY, "hex");
    transaction.sign(privateKey); // sign a transaction
    const serializedEthTx = transaction.serialize().toString("hex"); // serialize the transaction
    web3.eth.sendSignedTransaction(`0x${serializedEthTx}`, cb);
}

const performTx = (data) => web3.eth.getTransactionCount(process.env.PUBLIC_ADDRESS,"pending").then(async (transactionNonce) => {
    // console.log("transaction count====",transactionNonce);
    const transactionObject = {
        networkId: 5777,
        chainId:5777,
        nonce: transactionNonce,
        gasLimit: 6721975,
        gasPrice: 20000000000,
        value: 0,
        from: process.env.PUBLIC_ADDRESS,
        to: process.env.CONTRACT_ADDRESS,
        data: data
    };
    // console.log("transaction===",transactionNonce,transactionObject);
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
    blockchainTransactionsQueue.push(youthContract.methods.decreaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function increaseShares(inf,owner,numShares,numYouthTokens){
    blockchainTransactionsQueue.push(youthContract.methods.increaseShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function addShares(inf,owner,numShares,numYouthTokens){
    blockchainTransactionsQueue.push(youthContract.methods.addShares(inf,owner,numShares,numYouthTokens).encodeABI());
}


async function deleteShares(inf,owner,numYouthTokens){
    blockchainTransactionsQueue.push(youthContract.methods.deleteShares(inf,owner,numYouthTokens).encodeABI());
}

module.exports = {
    decreaseShares,
    increaseShares,
    addShares,
    deleteShares
}