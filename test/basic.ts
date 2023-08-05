import test from 'ava'
import { isEqual } from 'lodash-es'

import { HyperLogLog } from '../src/index'

import { errPct, saneError } from './util'

// General test params - 5 million inserts of 1.5 million unique values
const insertCount = 5000000
const distinctCount = 1500000

test('basic test', t => {
  const counter = new HyperLogLog()
  
  for (var i=0; i<insertCount; i++)
    counter.add((i % distinctCount).toString())

  const count = counter.count()
  t.true(saneError(count, distinctCount), `error is larger than expected! err=${errPct(count, distinctCount)}%`)
})

test('merge test', t => {
  const counter1 = new HyperLogLog()
  const counter2 = new HyperLogLog()
  
  const offset = Math.floor(distinctCount / 2)
  for (var i=0; i<insertCount; i++) {
    counter1.add((i % distinctCount).toString())
    counter2.add((i % distinctCount + offset).toString())
  }

  const merged = counter1.merge(counter2)
  const count = merged.count()
  const expected = distinctCount * 1.5
  t.true(saneError(count, expected), `error is larger than expected! err=${errPct(count, expected)}%`)
})

test('serialize / deserialize', t => {
  const counter1 = new HyperLogLog()
  
  for (var i=0; i<insertCount; i++)
    counter1.add((i % distinctCount).toString())

  // Create clone via serialization
  const buffer = counter1.serialize()
  const counter2 = HyperLogLog.deserialize(buffer)

  // Verify that mBits parameters match
  t.true(counter1.mBits === counter2.mBits, `register count of deserialized counter doesn't match original! original=${counter1.mBits}-bits, clone=${counter2.mBits}-bits`)

  // Verify that hasherIds match
  const hasherId1 = counter1['hasher']['hasherId']
  const hasherId2 = counter2['hasher']['hasherId']
  t.true(hasherId1 === hasherId2, `hasherId of deserialized counter doesn't match original! original=${hasherId1}, clone=${hasherId2}`)

  // Verify that options match
  const options1 = counter1['opts']
  const options2 = counter2['opts']
  t.true(isEqual(options1, options2), `\`options\` of deserialized counter doesn't match original! original=${hasherId1}, clone=${hasherId2}`)

  // Verify that counts match
  const count1 = counter1.count()
  const count2 = counter2.count()
  t.true(count1 === count2, `count doesn't match after serialization/deserialization! count1=${count1}, count2=${count2}`)
})
