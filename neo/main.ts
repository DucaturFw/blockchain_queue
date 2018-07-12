import fetch from 'node-fetch'
import r, { Connection } from 'rethinkdb'
import { zip, propOr } from 'ramda'
import { parseExchangeCall, checkTxSuccess } from './vm'

type DB = typeof r
type Fetch = typeof fetch

const prepareFetchJson = (fetch: Fetch) => async (path: string) => {
  const res = await fetch(`http://neoscan.io/api/main_net/v1/${path}`)
  return res.json()
}

const insertIntoDb = (db: DB, conn: Connection) => async (data: object) => {
  const res = await db.table('holders').insert(data).run(conn)
  if (res.errors) throw res.first_error
}

export default async (db: DB, conn: Connection, fetch: Fetch) => {
  try {
    const fetchJson = prepareFetchJson(fetch)
    const insert = insertIntoDb(db, conn)

    const txs: ITransaction[] = await fetchJson('get_last_transactions_by_address')
    if (!Array.isArray(txs)) throw Error('Fetched tx\'s is not an array')

    const ids = txs
      .filter(v => v.type === 'InvocationTransaction')
      .map(v => v.txid)

    const transactionsReqs: Promise<ISingleTransaction>[] = ids.map(id => fetchJson(`get_transaction/${id}`))
    const logsReqs: Promise<IApplogTx>[] = ids.map(id => fetchJson(`tx/${id}`))

    const [ transaction, logs ] = await Promise.all([
      Promise.all(transactionsReqs),
      Promise.all(logsReqs)
    ])
    
    const rows = zip(transaction, logs)
      .map(v => ({ tx: v[0], log: v[1] }))
      .filter(({ tx }) => propOr(false, 'method', parseExchangeCall(tx.script)) === 'exchange')
      .filter(({ log }) => checkTxSuccess(log))
      .map(({ tx, log }) => ({ id: tx.txid, tx, log }))

    await insert(rows)

  } catch (err) {
    console.log({ err })
  }
}