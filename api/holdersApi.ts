import { o, sum, values, compose, filter, lt, map, nth, toPairs } from 'ramda'
import { IRouterContext } from 'koa-router'

import { getTransactions as EthGetTransactions, getBalances as EthGetBalances } from './ethApi'
import { getTransactions as EosGetTransactions, getBalances as EosGetBalances } from './eosApi'

export default async (ctx: IRouterContext) => {
  const [ ethRes, eosRes ] = await Promise.all([
    EthGetTransactions.run(ctx.conn),
    EosGetTransactions.run(ctx.conn)
  ])
  const ethBalances: { [key: string]: number } = EthGetBalances(ethRes)
  const eosBalances: { [key: string]: number } = EosGetBalances(eosRes)

  ctx.body = [
    { name: 'ETH', tokens: compose(<any>sum, filter(lt(0)), map(nth(1)), toPairs)(ethBalances) },
    { name: 'EOS', tokens: o(sum, values, eosBalances) },
  ]
}