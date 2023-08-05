import test from 'ava'
import { HyperLogLog } from '../src/index'

import { errPct, saneError } from './util'
import { HasherFactory } from '../src/backends/hasher'
import { Jenkins32 } from '../src/backends/jenkins32'

// General test params - 5 million inserts of 1.5 million unique values
const insertCount = 5000000
const distinctCount = 1500000

// Custom backend id
const customHasherId = 'my-custom-backend'

// Custom backend (just reuse jenkins32)
class MyCustomBackend extends Jenkins32 {
  override hasherId = customHasherId
}

// Register custom backend
HasherFactory.register(customHasherId, MyCustomBackend)

test('custom backend registry - counting', t => {
  const counter = new HyperLogLog({ hasherId: customHasherId })
  
  for (var i=0; i<insertCount; i++)
    counter.add((i % distinctCount).toString())

  const count = counter.count()
  t.true(saneError(count, distinctCount), `error is larger than expected! err=${errPct(count, distinctCount)}%`)
})

test('custom backend registry - deserialization', t => {
  const counter = new HyperLogLog({ hasherId: customHasherId })
  
  for (var i=0; i<insertCount; i++)
    counter.add((i % distinctCount).toString())

  const buffer = counter.serialize()
  const counter2 = HyperLogLog.deserialize(buffer)

  // Verify that hasherIds match
  const hasherId = counter2['hasher']['hasherId']
  t.true(hasherId === customHasherId, `hasherId of deserialized counter doesn't reflect custom backend! id=${hasherId}, expected=${customHasherId}`)
})