import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import r, { Connection } from 'rethinkdb'

import ethApi from './ethApi'
import eosApi from './eosApi'

declare module 'koa' {
  interface BaseContext {
    conn(): Connection
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    conn: Connection
  }
}

const app = new Koa()
const router = new Router()

app.use(async (_, next) => {
  app.context.conn = await r.connect({ host: 'localhost', port: 28015 })
  await next()
})

router.get('/api/v1/holders/eos', eosApi)
router.get('/api/v1/holders/eth', ethApi)

app
  .use(json())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3011)

console.log('API listened on port 3011')