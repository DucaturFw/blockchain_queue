import r, { Connection } from 'rethinkdb'
import { IRouterContext } from 'koa-router'
import { IHolderBalances } from '../types'

const ignoreHolders = [ 'eosio', 'duccntr' ]

export const getBalances = async (conn: Connection) => {
  const cursor = await r.db('eos').table('balances').run(conn)
  const rows: { holder: string, amount: number }[] = await cursor.toArray()
  
  const filtered = rows
    .filter(({ holder }) => !ignoreHolders.includes(holder))
  
  const sum = filtered
    .map(({ amount }) => amount)
    .reduce((total, amount) => total + amount, 0)
  
  return {
    name: 'EOS',
    tokens: sum,
    holders: filtered.map(({ holder, amount }) => ({
      address: holder,
      tokens: amount,
      stake: ((amount / sum * 1e4) >> 0) / 1e4
    }))
  } as IHolderBalances
}

export default async (ctx: IRouterContext) => {
  ctx.body = await getBalances(ctx.rethinkdb)
}