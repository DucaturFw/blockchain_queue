import nodeFetch from 'node-fetch'
import { propOr, zip } from 'ramda'
import r, { Connection, WriteResult } from 'rethinkdb'

import { IApplogTx, ISingleTransaction, ITransaction } from './types'
import { checkTxSuccess, parseExchangeCall } from './vm'

type DB = typeof r
type Fetch = typeof nodeFetch

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time))

const prepareFetchJson = (fetch: Fetch, endpoint: string) => (path: string) =>
  fetch(`${endpoint}${path}`).then(res => res.json())

const insertIntoDb = (db: DB, conn: Connection) => async (rows: Array<{}>): Promise<any> => {
  const res = await db.table('transactions').insert(rows).run(conn)
  if (res.errors) throw res.first_error
}

const getPageBasedOnCount = (db: DB, conn: Connection) =>
  db.table('transactions').count().div(15).round().run(conn)

type IteratePage = (
  address: string,
  fetchRpc: (path: string) => Promise<any>,
  fetchApplog: (path: string) => Promise<any>,
  insert: (rows: object[]) => Promise<WriteResult<any, any>> ) =>
    (page: number) => Promise<number>

export const iteratePage: IteratePage = (address, fetchRpc, fetchApplog, insert) => async (page) => {
  const txs: ITransaction[] = await fetchRpc(`get_last_transactions_by_address/${address}/${page}`)
  if (!Array.isArray(txs)) throw Error(`Fetched tx\'s is not an array: ${txs}`)

  const ids = txs
    .filter(v => v.type === 'InvocationTransaction')
    .map((v) => v.txid)

  const transactionsReqs: Array<Promise<ISingleTransaction>> = ids.map((id) => fetchRpc(`get_transaction/${id}`))
  const logsReqs: Array<Promise<{ tx: IApplogTx | null }>> = ids.map((id) => fetchApplog(`tx/${id}`))

  const [ transaction, logs ] = await Promise.all([
    Promise.all(transactionsReqs),
    Promise.all(logsReqs),
  ])

  const rows = zip(transaction, logs)
    .map((v) => ({ tx: v[0], log: v[1].tx }))
    .filter(({ tx }) => propOr(false, 'method', parseExchangeCall(tx.script)) === 'exchange')
    .filter(({ log }) => log && checkTxSuccess(log))
    .map(({ tx, log }) => ({ id: tx.txid, tx, log }))

  await insert(rows)

  // return all transactions without any filters
  return txs.length
}

type Main = (
  db: DB,
  conn: Connection,
  fetch: Fetch,
  address: string,
  rpcEndpoint: string,
  applogEndpoint: string,
) => Promise<void>

const main: Main = async (db, conn, fetch, address, rpcEndpoint, applogEndpoint) => {
  try {
    const fetchRpc = prepareFetchJson(fetch, rpcEndpoint)
    const fetchApplog = prepareFetchJson(fetch, applogEndpoint)
    const insert = insertIntoDb(db, conn)
    const iterate = iteratePage(address, fetchRpc, fetchApplog, insert)
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

export default main
