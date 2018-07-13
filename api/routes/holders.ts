import { compose, sum, map, prop } from 'ramda'
import { IRouterContext } from 'koa-router'
import { IHolderBalances } from '../types'

import { getBalances as getBalancesEth } from './eth'
import { getBalances as getBalancesEos } from './eos'

const tokensSum: (a: IHolderBalances) => number = compose(
  sum as any,
  map(prop('tokens') as () => number),
  prop('holders') as () => string
)

export default async (ctx: IRouterContext) => {
  const [ balancesEth, balancesEos ] = await Promise.all([
    getBalancesEth(ctx.rethinkdb),
    getBalancesEos(ctx.rethinkdb)
  ])

  ctx.body = [
    { name: 'ETH', tokens: tokensSum(balancesEth) },
    { name: 'EOS', tokens: tokensSum(balancesEos) },
  ]
}