# Prerequisites

For development:

```
node --version
v10.19.0
npm --version
6.14.4
```

For deployment:

```
docker run -it -p 0.0.0.0:3000:3000 -v $(pwd):/opt node:10.19.0 bash
```

# Install

Run only one node of the DLT: `npm run node_1`

Run all nodes: `npm run dev`

Run tests: `node dev/test.js`

# Testing

- Check `http://localhost:3000/blockchain`
- Create 1st transaction for creating mutual fund `http://localhost:3000/transaction/broadcast`

```
{
    "amount": 100,
    "sender": "insurance-liquidity-provider",
    "recipient": "insurance-mutual-fund"
}
```
- Add new block (make a deposit for making ability add a new block) `http://localhost:3000/mine`

- Check that transaction was added in block 2

```    
...        
"transactions": [
    {
        "amount": 100,
        "sender": "insurance-liquidity-provider",
        "recipient": "insurance-mutual-fund",
        "evaluationDate": null,
        "transactionId": "d5c64850ca0d11ec9a906b78e53ed6c3"
    }
],
...
```

- Anybody who made a deposit may create a transaction (may create an insurance):

```
{
    "amount": 1,
    "sender": "person-with-id-1",
    "recipient": "insurance-mutual-fund",
    "evaluationDate": "2022-05-02 14:39:10",
    "oracle": "weather"
}
```

- Such transactions can be made by users who have been accepted in the application (or web service). All transactions fall into pending transactions until a new block is created.
- According to the specified schedule, a check is started if it is time to evaluate transactions (insurance policies)
`http://localhost:3000/check-contracts`
- If the time of the insurance policy has ended, then you need to check if the insured event has occurred or not
- If the insured event has not occurred, then the insurance payment is not made and the deposit of the insurance payment is not made
- If an insured event has occurred, then a payment is made, while the payment is made on behalf of the insurance-mutual-fund to the user "person-with-id-1".
