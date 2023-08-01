![Build](https://github.com/wsiegenthaler/hyperloglog-ts/actions/workflows/build.yml/badge.svg)
[![npm version](https://badge.fury.io/js/hyperloglog-ts.svg)](https://www.npmjs.com/package/hyperloglog-ts)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Description

An exceedingly basic implementation of *HyperLogLog*, a probabalistic datastructure useful for approximating the number of distinct elements in a multiset. This approach allows for `O(1)` time complexity and `O(log log n)` space complexity w.r.t set size `n`.

## Features

* Custom backends: Extend the `Hasher` class to use the hash function of your choice. A 32-bit Jenkins hash backend is provided by default.
* Lower-bound correction: "Linear Counting" is used when the estimated cardinality is low relative to the number of registers.
* Upper-bound correction: Estimated cardinality is adjusted when found to be high relative to the size of the hash space.
* An additional correction is made to compensate for 'systematic multiplicative bias' resulting from hash collisions.
* Type defs

## Example

```js
import HyperLogLog, { Jenkins32 } from 'hyperloglog-ts'

// Initialize counter
const hasher = new Jenkins32(12) // 12-bit register index (i.e. 4096 registers)
const counter = new HyperLogLog(hasher)

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

## References

* "[HyperLogLog](http://en.wikipedia.org/wiki/HyperLogLog)" Wikipedia. Wikimedia Foundation, n.d. Mon. 31 Jul. 2023.

## License

Everything in this repo is ISC License unless otherwise specified
