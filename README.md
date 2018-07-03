# blockchain_queue
Cross-blockchain event queue

## Starting service
```bash
yarn install
./start.sh
```

## RethinkDB setup
```js
r.dbCreate('ethereum');
r.db('ethereum').tableCreate('contractCalls');
r.db('ethereum').table('contractCalls').indexCreate('chronological', [r.row('blockNumber'), r.row('logIndex')]);

r.dbCreate('eos');
r.db('eos').tableCreate('contractCalls');
```
