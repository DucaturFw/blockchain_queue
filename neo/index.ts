import r, { Connection } from 'rethinkdb'
import fetch from 'node-fetch'

import main from './main'

const dbConfig = { host: 'localhost', port: 28015, db: 'neo' }
const address = 'f149f74cf5fa1d61c11a5b1a90ccb7871ad7c327'
const rpcEndpoint = 'http://neoscan.io/api/main_net/v1/'

const init = async () => {
  try {
    const conn: Connection = await r.connect(dbConfig)
    await main(r, conn, fetch, address, rpcEndpoint)
  } catch (err) {
    console.log({ err })
  }
}

init()