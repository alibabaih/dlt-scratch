var express = require('express')
const cron = require('node-cron');
const bodyParser = require('body-parser')
var app = express()
const Ledger = require('./ledger');
const Oracle = require('./oracle');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const swaggerDocs = require("./utils/swagger");

const port = process.argv[2];

const nodeAddress = uuid().split('-').join('');

const ledger = new Ledger();

const oracle = new Oracle();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// creates the cronjob instance with startScheduler 
//each 1 minute
const task = cron.schedule('*/1 * * * *', () =>  {

    console.log('test cronjob running every 10secs');

    const notEvaluatedTransactions = ledger.getTransactions();
    console.log('notEvaluatedTransactions: ' + notEvaluatedTransactions);
    if(typeof notEvaluatedTransactions !== 'undefined' && notEvaluatedTransactions.length > 0) {
        notEvaluatedTransactions.forEach(transaction => {

            console.log('transactionId: ' + transaction.transactionId);
            if(true) { //oracleConditions.condition

                const insuranceCompensation = ledger.insuranceCompensation(transaction.amount);
                const insurant = transaction.sender;
                const insurer = "insurance-mutual-fund"
                const newTransaction = ledger.createNewTransaction(insuranceCompensation, insurer, insurant, null, null);
                ledger.addToEvaluatedTransactions(transaction.transactionId);

                let requestPromises = [];
                ledger.networkNodes.forEach(networkNodeUrl => {
                    const requestOptions = {
                        uri: networkNodeUrl + '/transaction',
                        method: 'POST',
                        body: newTransaction,
                        json: true
                    };

                    requestPromises.push(rp(requestOptions)); 
                });

                Promise.all(requestPromises).then(() => {
                }).catch(err => { console.log(err) });
            } else {
                console.log('Oracle responded that insurance accident did not happened');
            }
        });
    }
}, {
    scheduled: true
});

/**
 * @openapi
 * /:
 *  get:
 *     tags:
 *     - Index
 *     description: Responds if the app is up and running
 *     responses:
 *       200:
 *         description: App is up and running
 */
app.get('/', function(req, res) {
    res.send('Hi! This is DLT POC. Please, investigate endpoints in doc`s.')
});

/**
 * @openapi
 * '/blockchain':
 *  get:
 *     tags:
 *     - Blockchain
 *     summary: Get a full blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/blockchain', function(req, res) {
   res.send(ledger);
});

app.post('/transaction', function(req, res) {
    const newTransaction = req.body;
    const blockIndex = ledger.addTransactionToPendingTransactions(newTransaction);
    res.json({note: `transaction will be added in ${blockIndex}`});
});

/**
 * @openapi
 * '/transaction/broadcast':
 *  post:
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              amount:
 *                type: integer
 *                format: int64
 *              sender:
 *                type: string
 *              recipient:
 *                type: string
 *            example:
 *              amount: 100000
 *              sender: insurance-liquidity-provider
 *              recipient: insurance-mutual-fund
 *    responses:
 *      200:
 *        description: Success
 *    tags:
 *    - Blockchain
 *    summary: Create new rtansactions (new insurance contract) and place it it pending
 */
app.post('/transaction/broadcast', function(req, res) {
    // const newTransaction = ledger.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient,
    //                        req.body.evaluationDate, req.body.oracle);
    // ledger.addTransactionToPendingTransactions(newTransaction);
    date = Date.parse(req.body.evaluationDate); //Date.parse("2022-05-03 13:21:34")
    const newTransaction = ledger.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient,
        date, req.body.oracle);
    ledger.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];
    ledger.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };

        requestPromises.push(rp(requestOptions)); 
    });

    Promise.all(requestPromises).then(() => {
        res.json({note: 'transaction created and braodcust successful'});
    });
});

/**
 * @openapi
 * '/mine':
 *  get:
 *     tags:
 *     - Blockchain
 *     summary: Get "mine" a new block in blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/mine', function(req, res) {
    const lastBlock = ledger.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: ledger.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = ledger.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = ledger.hashBlock(previousBlockHash, currentBlockData, nonce);
    const newBlock = ledger.createNewBlock(nonce, previousBlockHash, blockHash);
    
    const requestPromises = [];
    ledger.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: {newBlock: newBlock},
            json: true
        };

        requestPromises.push(rp(requestOptions)); 
    });

    // send some reword to the miner
    Promise.all(requestPromises).then(data => {
        const requestOptions = {
            uri: ledger.currentNodeUrl + '/transaction/broadcast',
            method: 'POST',
            body: {
                amount: 1,
                sender: "users-pool",
                recipient: nodeAddress
            },
            json: true
        };

        return rp(requestOptions); 
    }).then(data => {
        res.json({
            note: "new block mined successfully",
            block: newBlock
        });
    });
});

app.post('/receive-new-block', function(req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = ledger.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];
    if (correctHash && correctIndex ) {
        ledger.chain.push(newBlock);
        ledger.pendingTransactions = [];
        res.json({
            note: 'new block received and accepted',
            newBlock: newBlock
        })
    } else {
        res.json({
            note: 'the block is rejected',
            newBlock: newBlock
        })
    }
});

/**
 * @openapi
 * '/register-and-broadcast-node':
 *  post:
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              allNetworkNodes:
 *                type: string
 *            example:
 *              newNodeUrl: http://localhost:3004
 *    responses:
 *      200:
 *        description: Success
 *    tags:
 *    - Blockchain
 *    summary: Register a new node and broadcast it the network blockchain
 */
app.post('/register-and-broadcast-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if(ledger.networkNodes.indexOf(newNodeUrl) == -1) {
        ledger.networkNodes.push(newNodeUrl);
    }

    const regNodesPromises = [];
    ledger.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {newNodeUrl: newNodeUrl},
            json: true
        };

        regNodesPromises.push(rp(requestOptions)); 
    });

    Promise.all(regNodesPromises).then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: {allNetworkNodes: [ ...ledger.networkNodes, ledger.currentNodeUrl ]},
            json: true
        };

        return rp(bulkRegisterOptions);
    }).then(data => {
        res.json({note: 'New node registered with network successfully'})
    }); 
});

/**
 * @openapi
 * '/register-node':
 *  post:
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              allNetworkNodes:
 *                type: string
 *            example:
 *              newNodeUrl: http://localhost:3004
 *    responses:
 *      200:
 *        description: Success
 *    tags:
 *    - Blockchain
 *    summary: Register a node with the network blockchain
 */
app.post('/register-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;

    const nodeNotAlreadyPresent = ledger.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = ledger.currentNodeUrl !== newNodeUrl;
    if(nodeNotAlreadyPresent && notCurrentNode) {
        ledger.networkNodes.push(newNodeUrl);
    }

    res.json({note: 'New node registered'});
});

/**
 * @openapi
 * '/register-nodes-bulk':
 *  post:
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              allNetworkNodes:
 *                type: array
 *            example:
 *              allNetworkNodes: ["http://localhost:3001", "http://localhost:3002", "http://localhost:3002", "http://localhost:3002"]
 *    responses:
 *      200:
 *        description: Success
 *    tags:
 *    - Blockchain
 *    summary: Register all nodes at ones in blockchain
 */
app.post('/register-nodes-bulk', function(req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = ledger.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = ledger.currentNodeUrl !== networkNodeUrl;
        if(nodeNotAlreadyPresent && notCurrentNode) {
            ledger.networkNodes.push(networkNodeUrl);
        }
    });
    res.json({note: 'Bulk registration successful'});
});

/**
 * @openapi
 * '/consensus':
 *  get:
 *     tags:
 *     - Blockchain
 *     summary: Synchronize nodes in blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/consensus', function(req, res) {
    const requestPromises = [];
    ledger.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            join: true
        };

        requestPromises.push(rp(requestOptions)); 
    });
     
    Promise.all(requestPromises).then(blockchains => {
        const currentChainLength = ledger.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;

        // blockchains.forEach(blockchain => {
        //     if(blockchain.chain.length >= maxChainLength) {
        //         maxChainLength = blockchain.chain.length;
        //         newLongestChain = blockchain.chain;
        //         newPendingTransactions = blockchain.pendingTransactions;
        //     }
        // });

        // if(!newLongestChain || (newLongestChain && !ledger.chainIsValid(newLongestChain))){
        //     res.json({
        //         note: 'current chain has not been replaced',
        //         chain: ledger.chain
        //     })
        // } else if(newLongestChain && ledger.chainIsValid(newLongestChain)) {
        //     ledger.chain = newLongestChain;
        //     ledger.pendingTransactions = newPendingTransactions;
        //     res.json({
        //         note: 'this chain has been replaced',
        //         chain: ledger.chain
        //     })
        // } else {
        //     res.json({
        //         note: 'current chain has not been replaced',
        //         chain: ledger.chain
        //     })
        // }

    });
});

/**
 * @openapi
 * '/block/:blockHash':
 *  get:
 *     parameters:
 *     - in: path
 *       name: blockHash
 *       required: true
 *       schema:
 *         type: number
 *         description: The block hash
 *     tags:
 *     - Blockchain
 *     summary: Get a block in blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/block/:blockHash', function(req, res) {
    const blockHash = req.params.blockHash;
    const correctBlock = ledger.getBlock(blockHash);
    res.json({
        block: correctBlock
    });
});

/**
 * @openapi
 * '/transaction/:transactionId':
 *  get:
 *     parameters:
 *     - in: path
 *       name: transactionId
 *       required: true
 *       schema:
 *         type: number
 *         description: The transaction ID
 *     tags:
 *     - Blockchain
 *     summary: Get a transaction in blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/transaction/:transactionId', function(req, res) {
    const transactionId = req.params.transactionId;
    const transactionData = ledger.getTransaction(transactionId);
    res.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    });
});

/**
 * @openapi
 * '/address/:address':
 *  get:
 *     parameters:
 *     - in: path
 *       name: address
 *       required: true
 *       schema:
 *         type: number
 *         description: The address ID
 *     tags:
 *     - Blockchain
 *     summary: Get an address of sender or recipient in blockchain
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/address/:address', function(req, res) {
    const address = req.params.address;
    const addressData = ledger.getAddressData(address);
    res.json({
        addressData: addressData
    });
});

/**
 * @openapi
 * '/block-exporer':
 *  get:
 *     tags:
 *     - Blockchain
 *     summary: Frontend block explorer
 *     responses:
 *       304:
 *         description: Success
 */
app.get('/block-exporer', function(req, res) {
    res.sendFile('./block-explorer/index.html', {root: __dirname});
});

/**
 * @openapi
 * '/check-contracts':
 *  get:
 *     tags:
 *     - Blockchain
 *     summary: Start schedule for ther oracule
 *     responses:
 *       200:
 *         description: Success
 */
app.get('/check-contracts', function(req, res) {
    task.start();
    console.log('test cronjob running every 10secs');
    res.json({
        message: 'Scheduler started!'
    });
});

app.post('/evaluate-transactions', function(req, res) {

    const transactionId = req.body.transactionId;
    const evaluatedTransactions = ledger.addToEvaluatedTransactions(transactionId);
    res.json({
        note: "Transaction evaluated",
        transactionId: transactionId,
        evaluatedTransactions: evaluatedTransactions,
        requestBody: req.body
    });
});

app.listen(port, function() {
     console.log(`listening on port ${port}`);

     swaggerDocs(app, port);
});
