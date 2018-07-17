import fetch from 'node-fetch'
import r, { Connection } from 'rethinkdb'

import main from './main'

const dbConfig = { host: 'localhost', port: 28015, db: 'neo' }
// const hashScript = 'f149f74cf5fa1d61c11a5b1a90ccb7871ad7c327'
const address = 'AVnXfWmebi1GPvHcHSqjZVeuFayBhdDVdd'
const rpcEndpoint = 'http://neoscan.io/api/main_net/v1/'
const applogEndpoint = 'http://18.222.114.103:4007/'

const init = async () => {
  try {
    // const address = wallet.getAddressFromScriptHash(hashScript)
    const conn: Connection = await r.connect(dbConfig)
    await main(r, conn, fetch, address, rpcEndpoint, applogEndpoint)
  } catch (err) {
    console.log({ err })
  }
}

init()
