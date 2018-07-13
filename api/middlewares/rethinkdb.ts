import Koa from 'koa'
import r from 'rethinkdb'

export default async function(ctx: Koa.Context, next: () => Promise<any>) {
  ctx.rethinkdb = await r.connect({ host: 'localhost', port: 28015 })
  await next()
  ctx.rethinkdb.close()
}