# blockchain_queue
Cross-blockchain event queue

## Starting service
```bash
yarn install
./start.sh
```

## RethinkDB setup
```js
r.dbCreate('eth');
r.db('eth').tableCreate('contractCalls');
r.db('eth').table('contractCalls').indexCreate('chronological', [r.row('blockNumber'), r.row('logIndex')]);

r.dbCreate('eos');
r.db('eos').tableCreate('holders');
```
