# Prerequisites

`nodejs v10`

# Install

```
git clone <repo> .
npm install
```

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

    amount: 1$
    sender: person's id
    evaluationDate: до какого срока должна работать страховка
    oracle: какой тип оракула использовать

```{
    "amount": 1,
    "sender": "person-with-id-1",
    "recipient": "insurance-mutual-fund",
    "evaluationDate": "2022-05-02 14:39:10",
    "oracle": "weather"
}
```

- Такие транзакции могут быть сделаны пользователями, кто был акцептирован в приложении (или веб сервисе). Все транзакции попрадают в pending transactions, пока не будет создан новый блок.
- Транзакции попадают в блок
- Согласно заданному расписанию, запускается проверка, если настало время эвалюировать транзакции (страховые полисы)
`http://localhost:3000/check-contracts`
- Если время страхового полиса завершилось, то нужно проверить, если страховой случай произошёл или нет
- Если страховой случай не произошёл, то страховая выплата не производится и депозит страховой выплаты не производится
Если страховой случай произошёл, то происходит выплата, при этом выплата производится от лица фонда "insurance-mutual-fund" пользователю "person-with-id-1". 
