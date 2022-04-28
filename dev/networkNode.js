var express = require('express')
const bodyParser = require('body-parser')
var app = express()
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const port = process.argv[2];

const nodeAddress = uuid().split('-').join('');

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
    res.send('hello deergworld')
});

app.get('/blockchain', function(req, res) {
   res.send(bitcoin);
});

app.post('/transaction', function(req, res) {
    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json({note: `transaction will be added in ${blockIndex}`});
});

app.post('/transaction/broadcast', function(req, res) {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
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
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    // //send some reword to the miner
    // bitcoin.createNewTransaction(12.5, "00", nodeAddress);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);
    
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
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
            uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
            method: 'POST',
            body: {
                amount: 12.5,
                sender: "00",
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
    const lastBlock = bitcoin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];
    if (correctHash && correctIndex ) {
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
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
    if(bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
        bitcoin.networkNodes.push(newNodeUrl);
    }

    const regNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
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
            body: {allNetworkNodes: [ ...bitcoin.networkNodes, bitcoin.currentNodeUrl ]},
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

    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if(nodeNotAlreadyPresent && notCurrentNode) {
        bitcoin.networkNodes.push(newNodeUrl);
    }

    res.json({note: 'New node registered'});
});

//register multiple nodes at once
app.post('/register-nodes-bulk', function(req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
        if(nodeNotAlreadyPresent && notCurrentNode) {
            bitcoin.networkNodes.push(networkNodeUrl);
        }
    });
    res.json({note: 'Bulk registration successful'});
});

app.get('/consensus', function(req, res) {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            join: true
        };

        requestPromises.push(rp(requestOptions)); 
    });
     
    Promise.all(requestPromises).then(blockchains => {
        const currentChainLength = bitcoin.chain.length;
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

        // if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
        //     res.json({
        //         note: 'current chain has not been replaced',
        //         chain: bitcoin.chain
        //     })
        // } else if(newLongestChain && bitcoin.chainIsValid(newLongestChain)) {
        //     bitcoin.chain = newLongestChain;
        //     bitcoin.pendingTransactions = newPendingTransactions;
        //     res.json({
        //         note: 'this chain has been replaced',
        //         chain: bitcoin.chain
        //     })
        // } else {
        //     res.json({
        //         note: 'current chain has not been replaced',
        //         chain: bitcoin.chain
        //     })
        // }

    });
});

 app.listen(port, function() {
     console.log(`listening on port ${port}`);
});