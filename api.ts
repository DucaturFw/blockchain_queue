import { compose, map, find, o, propEq, prop, groupBy, sum, mergeWith, subtract, add, divide } from 'ramda'
import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import { Connection } from 'rethinkdb'
const r = require('rethinkdb')

declare module 'koa' {
  interface BaseContext {
    conn(): Connection
  }
}

const app = new Koa()
const router = new Router()

app.use(async (_, next) => {
  app.context.conn = await r.connect({ host: 'localhost', port: 28015 })
  await next()
})

const getEOSAmountsOfHolders = r.db('eos')
  .table('contractCalls')
  .map((v: any) => v.do({
    q: v('action_trace')('act')('data')('quantity').split(' ').nth(0),
    n: v('action_trace')('act')('data')('quantity').split(' ').nth(1),
    t: v('action_trace')('act')('data')('to')
  }))
  .group('t', 'n')
  .sum((v: any) => v('q').coerceTo('NUMBER'))
  .do((v: any) => ({ tokens: v, stake: r.expr(v).div(7e9) }))

router.get('/api/v1/holders/eos', async ctx => {
  const res = await getEOSAmountsOfHolders.run(ctx.conn)
  const data = {
    name: 'EOS',
    stake: 1,
    tokens: 7e9,
    holders: res.map((v: any) => ({
      address: v.group[0],
      tokens: v.reduction.tokens,
      stake: v.reduction.stake
    }))
  }
  ctx.body = data
})

const getETHAmountsOfHolders = r.db('ethereum')
  .table('contractCalls')
  .filter((v: any) => v('event').match('Transfer|Mint|Burn'))
  .pluck('event', 'returnValues')
  .group('event')

const getReductionValues = compose(map(<any>prop('returnValues')), <any>prop('reduction'))
const findMintGroup = compose(getReductionValues, find(propEq('group', 'Mint')))
const findBurnGroup = compose(getReductionValues, find(propEq('group', 'Burn')))
const findTransferGroup = compose(getReductionValues, find(propEq('group', 'Transfer')))
const groupByTo = <any>groupBy(<any>prop('to'))
const groupByFrom = <any>groupBy(<any>prop('from'))
const groupByBurner = <any>groupBy(<any>prop('burner'))
const sumOfAmounts = map(o(<any>sum, map(<any>prop('amount'))))
const sumOfValues = map(o(<any>sum, map(<any>prop('value'))))

router.get('/api/v1/holders/eth', async ctx => {
  const res = await getETHAmountsOfHolders.run(ctx.conn)
  const minted = compose(sumOfAmounts, groupByTo, findMintGroup)(res)
  const burned = compose(sumOfValues, groupByBurner, findBurnGroup)(res)
  const transferedFrom = compose(sumOfValues, groupByFrom, findTransferGroup)(res)
  const transferedTo = compose(sumOfValues, groupByTo, findTransferGroup)(res)

  const result: { [key: string]: number } = mergeWith(add,
    transferedTo,
    mergeWith(subtract,
      mergeWith(subtract, minted, burned),
      transferedFrom
    )
  )

  const data = {
    name: 'ETH',
    stake: 1,
    tokens: 7e9,
    holders: Object.keys(result).map((k: any) => ({
      address: k,
      tokens: result[k],
      stake: divide(result[k], 7e9)
    }))
  }

  ctx.body = data
})

app
  .use(json())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3011)
console.log('ready')