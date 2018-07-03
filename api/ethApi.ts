import {
  compose, map, find, o, propEq, prop, groupBy, sum, mergeWith, subtract, flip,
  add, divide, applySpec, converge, values, pipe, nth, filter, lt, toPairs, __
} from 'ramda'

import { Connection } from 'rethinkdb'

const r = require('rethinkdb')

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

const prepareBalances = o(filter(o(lt(0), nth(1))), toPairs)

const getMinted = compose(sumOfAmounts, groupByTo, getReductionValues, findMintGroup)
const getBurned = compose(sumOfValues, groupByBurner, getReductionValues, findBurnGroup)
const getTransferedTo = compose(sumOfValues, groupByTo, getReductionValues, findTransferGroup)
const getTransferedFrom = compose(sumOfValues, groupByFrom, getReductionValues, findTransferGroup)
const getProperties = applySpec({ mint: getMinted, burn: getBurned, transTo: getTransferedTo, transFrom: getTransferedFrom })
const mergeEntities = converge(mergeWith(add), [
  converge(mergeWith(subtract), [ prop('mint'), prop('burn') ]),
  converge(mergeWith(subtract), [ prop('transTo'), prop('transFrom')  ]),
])
export const getBalances = o(mergeEntities, getProperties)
export const weiToDucat: (a: number) => number = divide(__, 1e18)

export const getTransactions = r.db('ethereum')
  .table('contractCalls')
  .filter((v: any) => v('event').match('Transfer|Mint|Burn'))
  .pluck('event', 'returnValues')
  .group('event')

export default async (ctx: any) => {
  const res: IETHEventsGrouped[] = await getTransactions.run(ctx.conn as Connection)
  const balances: { [key: string]: number } = getBalances(res)
  const balancesSum = o(sum, values, balances)
  const calcStake = divide(__, balancesSum)

  const data = {
    name: 'ETH',
    tokens: weiToDucat(balancesSum),
    holders: pipe(prepareBalances, map(([ k, v ]) => ({
      address: k,
      tokens: weiToDucat(v),
      stake: calcStake(v)
    })))(balances)
  }

  ctx.body = data
}