///<reference path="./types.d.ts"/>

import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import r from 'rethinkdb'
import cors from '@koa/cors'

import holdersApi from './holdersApi'
import ethApi from './ethApi'
import eosApi from './eosApi'

const app = new Koa()
const router = new Router()

app.use(cors())

app.use(async (_, next) => {
  app.context.conn = await r.connect({ host: 'localhost', port: 28015 })
  await next()
  app.context.conn.close()
})

router.get('/api/v1/holders', holdersApi)
router.get('/api/v1/holders/eos', eosApi)
router.get('/api/v1/holders/eth', ethApi)

app
  .use(json())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3011)

console.log('API listened on port 3011')