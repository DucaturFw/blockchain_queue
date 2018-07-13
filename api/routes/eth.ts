import { map, o, compose, sum, pipe, nth, filter, lt, toPairs } from 'ramda'
import r, { Connection } from 'rethinkdb'
import { IRouterContext } from 'koa-router'
import { IHolderBalances } from '../types'

type PrepareBalances = (balancesObj: { [key: string]: number }) => [ string, number ][]
const prepareBalances: PrepareBalances = <any>o(filter(o(lt(0), nth(1))), toPairs)

type SumOfValues = (balancesObj: { [key: string]: number })  => number
const sumOfValues: SumOfValues = compose(sum as any, map(nth(1)), prepareBalances) as any

export const getTransactions = r.db('eth')
  .table('contractCalls')
  .filter({ event: 'Transfer' })
  .map(v => v.do({
    from: v('returnValues')('from'),
    to: v('returnValues')('to'),
    value: v('returnValues')('value').coerceTo('number').div(1e18)
  } as any))
  .orderBy('to')

type ITransaction = { from: string, to: string, value: number }
type IBalances = { [address: string]: number }

export const getBalances = async (conn: Connection) => {
  const res: ITransaction[] = await getTransactions.run(conn)

  const balances: IBalances = res.reduce((obj: { [address: string]: number }, { from, to, value }) =>
    ({ ...obj, ...{ [from]: (obj[from] || 0) - value, [to]: (obj[to] || 0) + value } }), {})

  const sum = sumOfValues(balances)

  return {
    name: 'ETH',
    tokens: sum,
    holders: pipe(prepareBalances, map(([ k, v ]) => ({
      address: k,
      tokens: v,
      stake: v / sum
    })))(balances)
  } as IHolderBalances
}

export default async (ctx: IRouterContext) => {
  ctx.body = await getBalances(ctx.rethinkdb)
}