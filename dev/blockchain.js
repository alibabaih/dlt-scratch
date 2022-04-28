const sha256 = require('sha256');
const uuid = require('uuid/v1');
const currentNodeUrl = process.argv[3];

// function Blockchain() {
//     this.chain = [];
//     this.pendingTransactions = [];
// }

class Blockchain {

    constructor() {
        this.chain = [];
        this.pendingTransactions = [];

        this.currentNodeUrl = currentNodeUrl;
        this.networkNodes = [];

        //create genesis block
        this.createNewBlock(0, '0', '0');
    }

    
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length +1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce, //PoW
        hash: hash,
        previousBlockHash: previousBlockHash
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
};

Blockchain.prototype.getLastBlock = function() {
    return this.chain[this.chain.length -1];
};

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        transactionId: uuid().split('-').join('')
    };

    // this.pendingTransactions.push(newTransaction);

    // return this.getLastBlock()['index'] + 1;
    return newTransaction;
};

Blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
};

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
    // return defined langth
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
};

Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
    // bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce)
    // we need to manipulate with nonce to get leading 4 zeros in hash function
    //by doing increment in nonce
    // the same idea may be in inshurance contract

    // repeatedly hash block until it finds correct hash => hash should generate 4 zeros '0000AFBGBSDFGBS'
    // uses current block data for the hash, but also the previousBlockHash
    // continuously changes nonce value until it finds the correct hash
    // returns to us the nonce value that creates the correct hash

    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while(hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }

    return nonce;
}

Blockchain.prototype.chainIsValid = function(blockchain) {
    //validate by iterating through each block in the blockchain
    //and check previous block hash is the same as the hash 
    let validChain = true;

    for(let i = 1; i < blockchain.length; i++) { //do not check genesis block
        const currentBlock = blockchain[i];
        const previousBlock = blockchain[i - 1];

        //TODO: delete it as we chach the transactions, that they have leading 0000
        const blockHash = this.hashBlock(
            previousBlock['hash'], 
            {
                transactions: currentBlock['transactions'],
                index: currentBlock['index']
            }, 
            currentBlock['nonce']
        );
        
        if(blockHash.substring(0, 4) !== '0000') {
            validChain = false;
        }

        if(currentBlock['previousBlockHash'] !== previousBlock['hash']) { //chain is not valid
            validChain = false;
        }
    }

    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 0
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0'
    const correctHash = genesisBlock['hash'] === '0'
    const correctTransactions = genesisBlock['transactions'].length === 0;
    if(!correctNonce || !correctPreviousBlockHash || !correctHash || correctTransactions) { //chain is not valid
        validChain = false;
    }

    return validChain;
};

module.exports = Blockchain;