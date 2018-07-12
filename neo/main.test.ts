import main from './main'

const rethinkdb = require('rethinkdb-mock')

const resolveJson = (json: object) => ({
  json: () => Promise.resolve(json)
})

describe('NEO blockchain grabber', () => {
  it('should insert transactions from neo-scan to rethinkdb correctly', async () => {
    const db = rethinkdb({ name: 'eos' })
    db.init({ holders: [] })

    const fetch = jest.fn()
      .mockResolvedValueOnce(resolveJson([
        { txid: '0', type: 'InvocationTransaction' },
        { txid: '1', type: 'InvocationTransaction' },
        { txid: '2', type: 'SomethingElse' },
      ]))
      .mockResolvedValueOnce(resolveJson(
        { txid: '0', script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d' }
      ))
      .mockResolvedValueOnce(resolveJson(
        { txid: '1', script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d' }
      ))
      .mockResolvedValueOnce(resolveJson(
        { txid: '0', vmstate: 'HALT, BREAK', stack: [ {"type":"Integer","value":"1"} ] }
      ))
      .mockResolvedValueOnce(resolveJson(
        { txid: '1', vmstate: 'WAT', stack: [ {"type":"Integer","value":"1"} ] }
      ))
    
    await main(db, db, fetch)

    expect(fetch).toHaveBeenCalledTimes(5)

    expect(db._tables.holders).toHaveLength(1)
    expect(db._tables.holders[0]).toEqual({
      id: '0',
      tx: {
        txid: '0',
        script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d'
      },
      log: {
        txid: '0',
        stack: [],
        vmstate: 'HALT, BREAK'
      }
    })
  })
})