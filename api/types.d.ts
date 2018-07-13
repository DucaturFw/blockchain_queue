import { Connection } from 'rethinkdb'

declare module 'koa' {
  interface BaseContext {
    rethinkdb: Connection
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    rethinkdb: Connection
  }
}

declare module 'rethinkdb' {
  interface RStream {
    group: (a: string) => RStream<{}>
  }
}

export type IHolderBalances = {
  name: string,
  tokens: number,
  holders: {
    address: string,
    tokens: number,
    stake: number
  }[]
}