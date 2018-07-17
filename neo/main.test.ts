import { iteratePage } from './main'

const resolveJson = (json: object) => Promise.resolve(json)

describe('NEO blockchain grabber', () => {
  test('should insert transactions from neo-scan to rethinkdb correctly', async () => {
    const insertIntoDb = jest.fn()
    const fetchRpc = jest.fn()
      .mockResolvedValueOnce(resolveJson([
        { txid: '0', type: 'InvocationTransaction' },
        { txid: '1', type: 'InvocationTransaction' },
        { txid: '2', type: 'SomethingElse' },
      ]))
      .mockResolvedValueOnce(resolveJson(
        { txid: '0', script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d' },
      ))
      .mockResolvedValueOnce(resolveJson(
        { txid: '1', script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d' },
      ))

    const fetchApplog = jest.fn()
      .mockResolvedValueOnce(resolveJson({
        tx: {
          stack: [ { type: 'Integer', value: '1' } ],
          txid: '0',
          vmstate: 'HALT, BREAK',
        },
      }))
      .mockResolvedValueOnce(resolveJson({
        tx: {
          stack: [ { type: 'Integer', value: '1' } ],
          txid: '1',
          vmstate: 'WAT',
        },
      }))

    const len = await iteratePage('', fetchRpc, fetchApplog, insertIntoDb)(0)

    expect(len).toBe(3)
    expect(fetchRpc).toHaveBeenCalledTimes(3)
    expect(fetchApplog).toHaveBeenCalledTimes(2)
    expect(insertIntoDb).toHaveBeenCalledTimes(1)
    expect(insertIntoDb).toHaveBeenCalledWith([
      {
        id: '0',
        log: {
          stack: [],
          txid: '0',
          vmstate: 'HALT, BREAK',
        },
        tx: {
          txid: '0',
          script: '03307830034554485a224151764273374e4472783937716a5031547a64547864436e636847616b38626a64740865786368616e67656759b6f25c66b8229875bee6131363114f2c32668d'
        },
      },
    ])
  })
})
