/// <reference path="./types.d.ts" />
import nodeFetch from 'node-fetch'
import { propOr, zip } from 'ramda'
import r, { Connection, WriteResult } from 'rethinkdb'

import { checkTxSuccess, parseExchangeCall } from './vm'

type DB = typeof r
type Fetch = typeof nodeFetch

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time))

const prepareFetchJson = (fetch: Fetch, rpcEndpoint: string) => (path: string) =>
  fetch(`${rpcEndpoint}${path}`).then(res => res.json())

const insertIntoDb = (db: DB, conn: Connection) => async (rows: Array<{}>): Promise<any> => {
  const res = await db.table('transactions').insert(rows).run(conn)
  if (res.errors) throw res.first_error
}

const getPageBasedOnCount = (db: DB, conn: Connection) =>
  db.table('transactions').count().div(15).round().run(conn)

type IteratePage = (
  address: string,
  fetchJson: (path: string) => Promise<any>,
  insert: (rows: object[]) => Promise<WriteResult<any, any>> ) =>
    (page: number) => Promise<number>

export const iteratePage: IteratePage = (address, fetchJson, insert) => async (page) => {
  const txs: ITransaction[] = await fetchJson(`get_last_transactions_by_address/${address}/${page}`)
  if (!Array.isArray(txs)) throw Error(`Fetched tx\'s is not an array: ${txs}`)

  const ids = txs
    .filter(v => v.type === 'InvocationTransaction')
    .map((v) => v.txid)

  const transactionsReqs: Array<Promise<ISingleTransaction>> = ids.map((id) => fetchJson(`get_transaction/${id}`))
  const logsReqs: Array<Promise<IApplogTx>> = ids.map((id) => fetchJson(`tx/${id}`))

  const [ transaction, logs ] = await Promise.all([
    Promise.all(transactionsReqs),
    Promise.all(logsReqs),
  ])

  const rows = zip(transaction, logs)
    .map((v) => ({ tx: v[0], log: v[1] }))
    .filter(({ tx }) => propOr(false, 'method', parseExchangeCall(tx.script)) === 'exchange')
    .filter(({ log }) => checkTxSuccess(log))
    .map(({ tx, log }) => ({ id: tx.txid, tx, log }))

  await insert(rows)

  // return all transactions without any filters
  return txs.length
}

export default async (db: DB, conn: Connection, fetch: Fetch, address: string, rpcEndpoint: string) => {
  try {
    const fetchJson = prepareFetchJson(fetch, rpcEndpoint)
    const insert = insertIntoDb(db, conn)
    const iterate = iteratePage(address, fetchJson, insert)
    const initialPage = await getPageBasedOnCount(db, conn)

    const loop = async (page: number) => {
      const rowsLength = await iterate(page)
      if (rowsLength === 15) {
        await loop(page++)
      } else {
        await delay(3000)
        await loop(page)
      }
    }
    await loop(initialPage)

  } catch (err) {
    console.log({ err })
  }
}
