import { Connection } from 'rethinkdb'

declare module 'koa' {
  interface BaseContext {
    conn: Connection
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    conn: Connection
  }
}

declare module 'rethinkdb' {
  interface RStream {
    group: (a: string) => RStream<{}>
  }
}
