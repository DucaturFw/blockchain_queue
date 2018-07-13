import r, { Connection } from 'rethinkdb'
import Web3 from 'web3'

import initListener from './main'

const abi = require('./ducatur-eth.abi.json')
const address = '0x60903CDA8643805F9567a083C1734E139Fe7dAD2'
const web3RPC = 'wss://rinkeby.infura.io/ws/OlWCtLVFGaNOXOgpelpw'
const dbConfig = { host: 'localhost', port: 28015, db: 'eth' }

const main = async () => {
  try {
    const conn: Connection = await r.connect(dbConfig)

    const web3 = new Web3(web3RPC)
    await web3.eth.net.isListening()
    const ctr = new web3.eth.Contract(abi, address)

    await initListener(r, conn, ctr)
  } catch (err) {
    console.log({ err })
  }
}

main()