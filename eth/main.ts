import r, { Connection } from 'rethinkdb'
import { Contract } from 'web3/types'

type DB = typeof r

const insertIntoDb = (db: DB, conn: Connection) => async (data: object) => {
  const res = await db.table('contractCalls').insert(data).run(conn)
  if (res.errors) throw res.first_error
}

const getLastBlock = (db: DB, conn: Connection): Promise<number> =>
  db.table('contractCalls')
    .orderBy({ index: 'chronological' })
    .nth(-1)('blockNumber')
    .default(0)
    .run(conn)

const main = async (db: DB, conn: Connection, ctr: Contract) => {
  const fromBlock = await getLastBlock(db, conn)
  const insert = insertIntoDb(db, conn)

  ctr.events.allEvents({ fromBlock }, (error, event) =>
    error ? console.log(error) : insert(event).catch(console.log))
}

export default main