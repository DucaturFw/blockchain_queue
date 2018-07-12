import r, { Connection } from 'rethinkdb'
import fetch from 'node-fetch'

import main from './main'

const dbConfig = { host: 'localhost', port: 28015, db: 'eos' }

const init = async () => {
  try {
    const conn: Connection = await r.connect(dbConfig)

    await main(r, conn, fetch)
  } catch (err) {
    console.log({ err })
  }
}

init()