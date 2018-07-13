import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import cors from '@koa/cors'

import rethinkdb from './middlewares/rethinkdb'

import holders from './routes/holders'
import eth from './routes/eth'
import eos from './routes/eos'

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(rethinkdb)

router.get('/api/v1/holders', holders)
router.get('/api/v1/holders/eos', eos)
router.get('/api/v1/holders/eth', eth)

app
  .use(json())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3011)

console.log('API listened on port 3011')