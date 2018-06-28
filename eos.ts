import r, { Connection } from 'rethinkdb'
const Eos = require('eosjs')

const config = {
  keyProvider: '5Kat1ikjeVg29vB1yxN6vNLqQy5AogsUdKcehPrzJ9iX8iM2VSd',
  chainId: null, // 32 byte (64 char) hex string
  httpEndpoint: 'http://35.172.116.56:8888',
  expireInSeconds: 60,
  broadcast: true,
  verbose: false, // API activity
  sign: true
}

const eos = new Eos(config)

const eosActionsReq = async (pos = -1, offset = 0) => {
  try {
    const { actions } = await eos.getActions('eosio.token', pos, offset)
    return actions
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
  .orderBy('account_action_seq')
  .nth(-1)
  .default({ account_action_seq: 0 })('account_action_seq')
  .add(1)

const checkIteration = async (conn: Connection) => {
  try {
    const lastIndex = await getLastIndex.run(conn)
    const actions = await eosActionsReq(lastIndex, 999)
    await insertIntoDb(conn)(actions)
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
