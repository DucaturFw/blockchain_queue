import { converge, mergeWith, subtract, o, map, sum, prop, groupBy, zip, keys, values, nth, add, divide, negate } from 'ramda'
import { Connection } from 'rethinkdb';

const r = require('rethinkdb')

export const getTransactions = r.db('eos')
  .table('contractCalls')
  .map((v: any) =>
    v.do({
      amount: v('amount').split(' ').nth(0).coerceTo('number'),
      from: v('from'),
      to: v('to')
    })
  ).orderBy('from')

export const getBalances = converge(mergeWith(add), [
  o(map(o(sum, <(a: {}) => number[]>map(prop<string>('amount')))), groupBy(prop<string>('to'))),
  o(map(o(sum, <(a: {}) => number[]>map(o(negate, prop<string>('amount'))))), groupBy(prop<string>('from')))
])

const mapToHoldersResult = (mapFn: (v: any[]) => object) =>
  o(map(mapFn), converge(zip, [ keys, values ]))

export default async (ctx: any) => {
  const res = await getTransactions.run(ctx.conn as Connection)
  console.log({ res })
  const balances = getBalances(res)
  console.log({ balances })

  const data = {
    name: 'EOS',
    tokens: o(sum, values, balances),
    holders: mapToHoldersResult((v) => ({
      address: nth(0, v),
      tokens: nth(1, v),
      stake: divide(<number>nth(1, v), 7e9)
    }))(balances)
  }
  ctx.body = data
}
