import r, { Connection } from 'rethinkdb'
import Web3 from 'web3'
import { EventLog } from 'web3/types'

const abi = require('./ducatur-eth.abi.json')
const address = '0x60903CDA8643805F9567a083C1734E139Fe7dAD2'

const ethListen = (fromBlock = 0) => async (cb: (a: EventLog) => void, err: (a: Error) => void) => {
  try {
    const web3 = new Web3('wss://rinkeby.infura.io/ws/OlWCtLVFGaNOXOgpelpw')

    await web3.eth.net.isListening()
    const ctr = new web3.eth.Contract(abi, address)

    ctr.events.allEvents({ fromBlock }, (error, event) => error ? err(error) : cb(event))
  } catch (error) {
    err(error)
  }
}

const insertIntoDb = (conn: Connection) => async (data: object) => {
  try {
    const res = await r.db('ethereum').table('contractCalls').insert(data).run(conn)
    if (res.errors) throw res.first_error
  } catch (err) {
    console.log({ err })
  }
}

const main = async () => {
  try {
    const conn = await r.connect({ host: 'localhost', port: 28015 })

    const lastBlock = await r.db('ethereum')
      .table('contractCalls')
      .orderBy({ index: 'chronological' })
      .nth(-1)('blockNumber')
      .run(conn)

    await ethListen(lastBlock)(insertIntoDb(conn), console.log)
  } catch (err) {
    console.log({ err })
  }
}

main()
