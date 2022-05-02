const sha256 = require('sha256');
const uuid = require('uuid/v1');
const currentNodeUrl = process.argv[3];

const INSURANCE_COMPENSATION_FACTOR = 100;

class Ledger {

    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.currentNodeUrl = currentNodeUrl;
        this.networkNodes = [];
        this.evaluatedTransactions = [];

        this.createNewBlock(0, '0', '0'); //create genesis block
    }
    
}

/**
 * Create new block
 * @example
 * ledger.createNewBlock(00, 'previousBlockHash', 'hash');
 * @returns {Object} Returns the block object.
 */
Ledger.prototype.createNewBlock = function(nonce, previousBlockHash, hash) {

    const newBlock = {
        index: this.chain.length +1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    };

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
};

/**
 * Get last block
 * @example
 * ledger.getLastBlock();
 * @returns {Object} Returns the block object.
 */
Ledger.prototype.getLastBlock = function() {

    return this.chain[this.chain.length -1];
};

/**
 * Creates new transaction
 * @example
 * ledger.createNewTransaction(1000, 'sender', 'recipient');
 * @returns {Object} Returns the transaction object.
 */
Ledger.prototype.createNewTransaction = function(amount, sender, recipient, evaluationDate, oracle) {

    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        evaluationDate: evaluationDate,
        oracle: oracle,
        transactionId: uuid().split('-').join('')
    };

    return newTransaction;
};

/**
 * Add new pending transaction
 * @example
 * ledger.addTransactionToPendingTransactions(transactionObj);
 * @returns {Object} Returns the block object.
 */
Ledger.prototype.addTransactionToPendingTransactions = function(transactionObj) {
    
    this.pendingTransactions.push(transactionObj);

    return this.getLastBlock()['index'] + 1;
};

/**
 * Calculate defined length
 * @example
 * ledger.hashBlock('previousBlockHash', 'currentBlockData', 000);
 * @returns {String} Returns the value of the equation.
 */
Ledger.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {

    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);

    return hash;
};

/**
 * Add new block in ledger
 * 
 * Manipulate with nonce to get leading 4 zeros in hash function by doing increment in nonce.
 * Hash should generate 4 zeros '0000AFBGBSDFGBS'. Uses current block data for the hash, 
 * and also the previousBlockHash, continuously changes nonce value until it finds the correct hash.
 * @example
 * ledger.proofOfWork('previousBlockHash', 'currentBlockData');
 * @returns {Number} Returns the nonce.
 */
Ledger.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {

    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while(hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }

    return nonce;
}

/**
 * Validates the chain
 *
 * Validate by iterating through each block in the blockchain 
 * and check previous block hash is the same as the hash 
 * @example
 * ledger.chainIsValid(blockchain);
 * @returns {Boolean}
 */
Ledger.prototype.chainIsValid = function(blockchain) {

    let validChain = true;

    for(let i = 1; i < blockchain.length; i++) { //do not check genesis block
        const currentBlock = blockchain[i];
        const previousBlock = blockchain[i - 1];

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

/**
 * Get block
 * @example
 * ledger.getBlock('blockHash');
 * @returns {Object}
 */
Ledger.prototype.getBlock = function(blockHash) {

    let correctBlock = null;
    this.chain.forEach(block => {
        if(block.hash === blockHash) {
            correctBlock = block;
        }
    });

    return correctBlock;
};

/**
 * Get transaction
 * @example
 * ledger.getBlock('transactionId');
 * @returns {Object}
 */
Ledger.prototype.getTransaction = function(transactionId) {

    let correctTransaction = null;
    let correctBlock = null;
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if(transaction.transactionId === transactionId) {
                correctTransaction = transaction;
                correctBlock = block;
            }
        });
    }) ;

    return {
        transaction: correctTransaction,
        block: correctBlock
    };
};

/**
 * Get address data
 * @example
 * ledger.getAddressData('address');
 * @returns {Object}
 */
Ledger.prototype.getAddressData = function(address) {
    const addressTransactions = [];
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if(transaction.sender === address || transaction.recipient === address) {
                addressTransactions.push(transaction);
            }
        });
    });

    let balance = 0;
    addressTransactions.forEach(transaction => {
        if(transaction.recipient === address) {
            balance += transaction.amount;
        } else if(transaction.sender === address) {
            balance -= transaction.amount;
        }
    })

    return {
        addressTransactions: addressTransactions,
        addressBalance: balance
    }
};

Ledger.prototype.getTransactions = function() {

    const notEvaluatedTransactions = [];
    currentDate = new Date().valueOf()

    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            
            const isTransactionContainsOracle = !isNaN(transaction.evaluationDate);
            
            if(this.evaluatedTransactions.length === 0) {
                // if(currentDate >= transaction.evaluationDate && isTransactionContainsOracle) {
                if(isTransactionContainsOracle) {
                    notEvaluatedTransactions.push(transaction);
                }
            } else {
                this.evaluatedTransactions.forEach(evaluatedTransaction => {
                    // if(currentDate >= transaction.evaluationDate && isTransactionContainsOracle && 
                    if(isTransactionContainsOracle && !this.evaluatedTransactions.includes(transaction.transactionId) ) {
                        notEvaluatedTransactions.push(transaction);
                    }
                });
            }
            
           
        });
    }) ;

    return notEvaluatedTransactions;
};

Ledger.prototype.insuranceCompensation = function(amount) {
    return amount * INSURANCE_COMPENSATION_FACTOR;
};

Ledger.prototype.addToEvaluatedTransactions = function(transactionId) {
    
    return this.evaluatedTransactions.push(transactionId); 
};

module.exports = Ledger;
