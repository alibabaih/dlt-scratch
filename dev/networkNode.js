var express = require('express')
const bodyParser = require('body-parser')
var app = express()
const Ledger = require('./ledger');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const port = process.argv[2];

const nodeAddress = uuid().split('-').join('');

const ledger = new Ledger();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('Hi! This is DLT POC. Please, investigate endpoints in doc`s.')
});

app.get('/blockchain', function(req, res) {
   res.send(ledger);
});

app.post('/transaction', function(req, res) {
    const newTransaction = req.body;
    const blockIndex = ledger.addTransactionToPendingTransactions(newTransaction);
    res.json({note: `transaction will be added in ${blockIndex}`});
});

app.post('/transaction/broadcast', function(req, res) {
    const newTransaction = ledger.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
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

    Promise.all(requestPromises).then((data) => {
        console.log(data)
        res.json({note: 'transaction created and braodcust successful'});
    });
});

app.get('/mine', function(req, res) {
    const lastBlock = ledger.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: ledger.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = ledger.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = ledger.hashBlock(previousBlockHash, currentBlockData, nonce);

    // //send some reword to the miner
    // ledger.createNewTransaction(12.5, "00", nodeAddress);

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

//register a new node and broadcast it the network
app.post('/register-and-broadcast-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if(ledger.networkNodes.indexOf(newNodeUrl) == -1) {
        ledger.networkNodes.push(newNodeUrl);
    }

    const regNodesPromises = [];
    ledger.networkNodes.forEach(networkNodeUrl => {
        //'/register-node'
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {newNodeUrl: newNodeUrl},
            json: true
        };

        regNodesPromises.push(rp(requestOptions)); 
    });

    Promise.all(regNodesPromises).then(data => {
        //use the data
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

//register a node with the network
app.post('/register-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;

    const nodeNotAlreadyPresent = ledger.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = ledger.currentNodeUrl !== newNodeUrl;
    if(nodeNotAlreadyPresent && notCurrentNode) {
        ledger.networkNodes.push(newNodeUrl);
    }

    res.json({note: 'New node registered'});
});

//register multiple nodes at once
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

app.get('/block/:blockHash', function(req, res) {
    const blockHash = req.params.blockHash;
    const correctBlock = ledger.getBlock(blockHash);
    res.json({
        block: correctBlock
    });
});

app.get('/transaction/:transactionId', function(req, res) {
    const transactionId = req.params.transactionId;
    const transactionData = ledger.getTransaction(transactionId);
    res.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    });
});

app.get('/address/:address', function(req, res) {
    const address = req.params.address;
    const addressData = ledger.getAddressData(address);
    res.json({
        addressData: addressData
    });
});

//frontend
app.get('/block-exporer', function(req, res) {
    res.sendFile('./block-explorer/index.html', {root: __dirname});
});

app.listen(port, function() {
     console.log(`listening on port ${port}`);
});
