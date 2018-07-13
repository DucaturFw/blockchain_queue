import { iteratePage } from './main'

const rethinkdb = require('rethinkdb-mock')

const resolveJson = (json: object) => Promise.resolve(json)

describe('NEO blockchain grabber', () => {
  test('should insert transactions from neo-scan to rethinkdb correctly', async () => {
    const insertIntoDb = jest.fn()
    const fetchJson = jest.fn()
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
    
    const len = await iteratePage('', fetchJson, insertIntoDb)(0)

    expect(len).toBe(3)
    expect(fetchJson).toHaveBeenCalledTimes(5)
    expect(insertIntoDb).toHaveBeenCalledTimes(1)
    expect(insertIntoDb).toHaveBeenCalledWith([
      {
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
      }
    ])
  })
})