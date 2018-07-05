///<reference path="./types.d.ts"/>

import { map, o, sum, pipe, nth, filter, lt, toPairs } from 'ramda'
import r from 'rethinkdb'
import { IRouterContext } from 'koa-router'

type PrepareBalances = (balancesObj: { [key: string]: number }) => [ string, number ][]
const prepareBalances: PrepareBalances = <any>o(filter(o(lt(0), nth(1))), toPairs)

type SumOfValues = (a: [ any, number ][]) => number
const sumOfValues: SumOfValues = <any>o(<any>sum, map(nth(1)))

export const getTransactions = r.db('ethereum')
  .table('contractCalls')
  .filter({ event: 'Transfer' })
  .map(v => v.do(<any>{
    f: v('returnValues')('from'),
    t: v('returnValues')('to'),
    v: v('returnValues')('value').coerceTo('number').div(1e18)
  }))
  .orderBy('t')

type ITransaction = { f: string, t: string, v: number }

type GetBalances = (a: ITransaction[]) => { [address: string]: number }
export const getBalances: GetBalances = res => res
  .reduce((obj: { [address: string]: number }, { f, t, v }) =>
    ({ ...obj, ...{ [f]: (obj[f] || 0) - v, [t]: (obj[t] || 0) + v } }), {})

export default async (ctx: IRouterContext) => {
  const res: ITransaction[] = await getTransactions.run(ctx.conn)
  const balances = getBalances(res)
  const balancesSum: number = o(sumOfValues, prepareBalances)(balances)

  const data = {
    name: 'ETH',
    tokens: balancesSum,
    holders: pipe(prepareBalances, map(([ k, v ]) => ({
      address: k,
      tokens: v,
      stake: v / balancesSum
    })))(balances)
  }

  ctx.body = data
}