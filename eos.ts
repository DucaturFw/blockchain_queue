import r, { Connection } from 'rethinkdb'

const Eos = require('eosjs')

const config = {
  chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca',
  httpEndpoint: 'http://193.93.219.219:8888',
  expireInSeconds: 60,
  broadcast: false,
  sign: true,
}

const eos = new Eos(config)

const getEosRows = async (pos = -1, offset = 0) => {
  try {
    // TODO: decrease interval, get last by id, check for more attr and fetch next
    const { rows } = await eos.getTableRows({
      code: 'duccntr',
      scope: 'duccntr',
       table: 'exchanges',
       json: 'true',
       limit: 999,
       lower_bound: pos,
       upper_bound: offset
      })
    return rows
  } catch (error) {
    return { error }
  }
}

const insertIntoDb = (conn: Connection) => async (data: object) => {
  try {
    const res = await r.db('eos').table('contractCalls').insert(data).run(conn)
    if (res.errors) throw res.first_error
  } catch (err) {
    console.log({ err })
  }
}

const getLastIndex = r.db('eos')
  .table('contractCalls')
  .orderBy('id')
  .nth(-1)('id')
  .default(-1)
  .add(1)

const checkIteration = async (conn: Connection) => {
  try {
    const lastIndex = await getLastIndex.run(conn)
    const rows = await getEosRows(lastIndex, 999)
    await insertIntoDb(conn)(rows)
  } catch (err) {
    console.log({ err })
  }
}

const main = async () => {
  const conn = await r.connect({ host: 'localhost', port: 28015 })
  setInterval(() => checkIteration(conn), 1000 * 60 * 60) // 1 hour
  checkIteration(conn)
}

main()
