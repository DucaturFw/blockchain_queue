# blockchain_queue
Cross-blockchain event queue

[![Build Status](https://travis-ci.org/DucaturFw/blockchain_queue.svg?branch=master)](https://travis-ci.org/DucaturFw/blockchain_queue)

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
