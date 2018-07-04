import { o, sum, values } from 'ramda'
import { IRouterContext } from 'koa-router'

import { getTransactions as EthGetTransactions, getBalances as EthGetBalances, weiToDucat } from './ethApi'
import { getTransactions as EosGetTransactions, getBalances as EosGetBalances } from './eosApi'

export default async (ctx: IRouterContext) => {
  const [ ethRes, eosRes ] = await Promise.all([
    EthGetTransactions.run(ctx.conn),
    EosGetTransactions.run(ctx.conn)
  ])
  const ethBalances: { [key: string]: number } = EthGetBalances(ethRes)
  const eosBalances: { [key: string]: number } = EosGetBalances(eosRes)

  ctx.body = [
    { name: 'ETH', tokens: o(weiToDucat, o(sum, values), ethBalances) },
    { name: 'EOS', tokens: o(sum, values, eosBalances) },
  ]
}