![Build](https://github.com/wsiegenthaler/hyperloglog-ts/actions/workflows/build.yml/badge.svg)
[![npm version](https://badge.fury.io/js/hyperloglog-ts.svg)](https://www.npmjs.com/package/hyperloglog-ts)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Description

A basic implementation of *HyperLogLog*, a probabalistic datastructure useful for approximating the number of distinct elements in a multiset. This approach allows for `O(1)` time complexity and `O(log log n)` space complexity w.r.t set size `n`.

## Features

* Custom Backends: Extend the `Hasher` class to use the hash function of your choice. A 32-bit Jenkins hash backend is provided by default.
* Serialization & Deserialization
* Lower-Bound Correction: 'Linear Counting' is used when the estimated cardinality is low relative to the number of configured registers.
* Upper-Bound Correction: Estimated cardinality is adjusted when found to be high relative to the size of the hash space.
* An additional correction is made to compensate for 'systematic multiplicative bias' resulting from hash collisions.
* Type Definitions

## Usage

#### Basic

```js
import { HyperLogLog } from 'hyperloglog-ts'

// Initialize counter
const counter = new HyperLogLog({ hasherId: 'jenkins32', mBits: 12 }) // 12-bit register index = 4096 registers

// Perform 50 million insertions of 15 million distinct values
const insertCount = 50000000
const distinctCount = 15000000

// Count values
for (var i=0; i<insertCount; i++)
  counter.add(i % distinctCount)

// Approximate count
const count = counter.count()
console.log(`[count] estimate = ${count}, expected = ${distinctCount}, error = ${count - distinctCount}`)
```

#### Merging

Counters can be merged, allowing for tracking cardinality in distributed scenarios. Here we create another counter
whose set has a 50% overlap with the first:

```js
// Another counter, somewhere else
const another = new HyperLogLog({ hasherId: 'jenkins32', mBits: 12 })

// Count values with only half the range overlapping the the original set
const offset = Math.round(distinctCount / 2)
for (var i=0; i<insertCount; i++)
  another.add(i % distinctCount + offset)

// Merge first counter with the second, estimated cardinality should be 1.5x the original
const merged = counter.merge(another)
const mergedCount = merged.count()
console.log(`[merged] estimate = ${mergedCount}, expected = ${count + offset}, error = ${mergedCount - count - offset}`)
```

#### Serialization

Counters can be converted to a `Buffer` for persistance or distribution:

```js
const buffer = counter.serialize()
```

And deserialized somewhere else:

```js
const counter = HyperLogLog.deserialize(buffer)
```

The deserialized counter will inherit the options of the original.

If using a custom backend, the `Hasher` implementation of the counter being deserialized must be registered with the local `HasherFactory`.

## References

* "[HyperLogLog](http://en.wikipedia.org/wiki/HyperLogLog)" Wikipedia. Wikimedia Foundation, n.d. Mon. 31 Jul. 2023.

## License

Everything in this repo is ISC License unless otherwise specified