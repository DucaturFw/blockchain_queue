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

// ETH

interface IETHEventsGrouped {
  group: 'Transfer' | 'Mint' | 'Burn',
  reduction: {
    returnValues: any
  }[]
}

interface IETHEventsGroupedBurn extends IETHEventsGrouped {
  group: 'Burn',
  reduction: {
    returnValues: {
      0: string,
      1: string,
      burner: string,
      value: string
    }
  }[]
}

interface IETHEventsGroupedMint extends IETHEventsGrouped {
  group: 'Mint',
  reduction: {
    returnValues: {
      amount: string,
      to: string
    }
  }[]
}

interface IETHEventsGroupedTransfer extends IETHEventsGrouped {
  group: 'Transfer',
  reduction: {
    returnValues: {
      0: string,
      1: string,
      2: string,
      from: string,
      to: string,
      value: string
    }
  }[]
}

type GetReductionValues = (a: IETHEventsGrouped) => IETHEventsGrouped['reduction'][0]['returnValues'][]
const getReductionValues: GetReductionValues = o(<any>map(prop<string>('returnValues')), prop('reduction'))

type FindMintGroup = (a: IETHEventsGrouped[]) => IETHEventsGroupedMint
const findMintGroup: FindMintGroup = <any>find(propEq('group', 'Mint'))

type FindBurnGroup = (a: IETHEventsGrouped[]) => IETHEventsGroupedBurn
const findBurnGroup: FindBurnGroup = <any>find(propEq('group', 'Burn'))

type FindTransferGroup = (a: IETHEventsGrouped[]) => IETHEventsGroupedTransfer
const findTransferGroup: FindTransferGroup = <any>find(propEq('group', 'Transfer'))

type GroupByTo = (a: IETHEventsGroupedMint['reduction'][0]['returnValues'][]) => { [to: string]: any[] }
const groupByTo: GroupByTo = groupBy(prop<string>('to'))

type GroupByFrom = (a: IETHEventsGroupedTransfer['reduction'][0]['returnValues'][]) => { [from: string]: { value: string }[] }
const groupByFrom: GroupByFrom = groupBy(prop<string>('from'))

type GroupByBurner = (a: IETHEventsGroupedBurn['reduction'][0]['returnValues'][]) => { [burner: string]: { value: string }[] }
const groupByBurner: GroupByBurner = groupBy(prop<string>('burner'))

type SumOfAmounts = (a: { [to: string]: { amount: string }[] }) => { [to: string]: number }
const sumOfAmounts: SumOfAmounts = <any>map(o(<any>sum, map(prop<string>('amount'))))

type SumOfValues = (a: { [to: string]: { value: string }[] }) => { [to: string]: number }
const sumOfValues: SumOfValues = <any>map(o(<any>sum, map(prop<string>('value'))))

const getETHAmountsOfHolders = r.db('ethereum')
  .table('contractCalls')
  .filter((v: any) => v('event').match('Transfer|Mint|Burn'))
  .pluck('event', 'returnValues')
  .group('event')

router.get('/api/v1/holders/eth', async ctx => {
  const res: IETHEventsGrouped[] = await getETHAmountsOfHolders.run(ctx.conn)
  const minted = compose(sumOfAmounts, groupByTo, getReductionValues, findMintGroup)(res)
  const burned = compose(sumOfValues, groupByBurner, getReductionValues, findBurnGroup)(res)
  const transferedFrom = compose(sumOfValues, groupByFrom, getReductionValues, findTransferGroup)(res)
  const transferedTo = compose(sumOfValues, groupByTo, getReductionValues, findTransferGroup)(res)

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