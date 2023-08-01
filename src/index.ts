import { cloneDeep, defaults, isObject, toString } from 'lodash-es'

import Hasher from './backends/hasher'

import { alphaApprox, harmonicMean } from './util'

const { log, max, round } = Math


export interface MultiSetCounter {
  add(val: string): void
  count(): number
}

//export abstract class Hasher<H> {
//  readonly mBits: number
//
//  constructor(mBits: number) {
//    this.mBits = mBits
//  }
//
//  abstract hash(val: string): H
//
//  abstract runLength(hashVal: H): number
//
//  abstract mIdx(hashVal: H): number
//
//  abstract hashLen(): number
//}

/* Re-export provided hashers */
export { Jenkins32 } from './backends/jenkins32'

export type Options = {

  /**
   * Whether to correct for 'systematic multiplicative bias' resulting from
   * hash collisions. See the `count()` method for details (enabled by default)
   */
  readonly collisionAdjustment?: boolean

  /**
   * Whether to make adjustments when the observed cardinality is more or less than
   * expected. See the counter `count()` method for details. (enabled by default)
   */
  readonly boundAdjustments?: boolean
}

const Defaults: Options = {
  collisionAdjustment: true,
  boundAdjustments: true
}

/**
 * A basic implementation of the 'HyperLogLog' datastructure which is useful for
 * estimating the number of distinct elements in a multiset.
 */
export default class HyperLogLog<H extends Hasher<any>> implements MultiSetCounter {

  protected hasher: H
  protected M: Uint8Array
  protected opts: Options = cloneDeep(Defaults)
 
  /**
   * @param hasher The hashing backend to use. Any instance implementing the `Hasher` trait may be used.
   * @param options
   */
  constructor(hasher: H, options?: Options) {
    if (!hasher) throw new Error(`[HyperLogLog] ERROR: A \`Hasher\` implementation must be provided!`)
    this.hasher = hasher

    if (isObject(options)) defaults(cloneDeep(this.opts), options)

    if (hasher.mBits! < 4)
      console.warn(`[HyperLogLog] WARNING: Recommended precision (mBits) should be larger than 4 for accurate results.`)

    const m = 2 ** hasher.mBits
    this.M = new Uint8Array(m)
    for (var i=0; i<m; i++) this.M[i] = 0
  }
 
  /**
   * @param val Inserts a value into this set for counting. Duplicate values will only be
   * counted once in the resulting estimate.
   */
  add(val: string) {
    const h = this.hasher.hash(toString(val))
    const z = this.hasher.runLength(h) + 1
    const i = this.hasher.mIdx(h)
    this.M[i] = max(this.M[i], z)
  }

  /**
   * Estimates the cardinality of all elements added to this set. This implementation
   * performs various adjustments as recommended by the HyperLogLog wikipedia entry:
   * 
   * * When the estimate is low relative to the number of configured registers, 'Linear 
   *   Counting' is used instead of the standard method of estimation. A corresponding
   *   adjustment is made when the cardinality is high relative to the size of the hash space.
   *   These upper & lower bound adjustments may be controlled using the `boundAdjustments`
   *   option (enabled by default).
   * * An additional correction is performed to compensate for overestimates resulting from hash
   *   collisions. This correction can be controlled by the `collisionAdjustment` option
   *   (enabled by default)
   */
  count() {
    const m = this.M.length
    const z = harmonicMean(Float32Array.from(this.M).map(run => 2 ** run))

    const am = this.opts.collisionAdjustment ? alphaApprox(this.hasher.mBits) : 1
    const estimate = round(am * m * z)

    if (this.opts.boundAdjustments) {
      const hashSpace = 2n ** BigInt(this.hasher.hashLen())
      if (estimate < 2.5 * m) {
        // Lower bound correction (aka Linear Counting)
        const v = this.M.filter(m => m === 0.0).length
        if (v === 0) return estimate
        else return m * log(m / v)
      } else if (estimate > hashSpace / 30n) {
        // Upper bound correction
        return -Number(hashSpace) * log(1 - estimate / Number(hashSpace))
      }
    }
    
    return estimate
  }

  /**
   * Creates a new counter by merging the state of this with another - useful for scenarios
   * where counting is performed in a distributed manner.
   * @returns A new `HyperLogLog` counter instance whose cardinality estimate reflects the
   *          combined sets of the merged counters.
   */
  merge(other: HyperLogLog<H>) {
    if (this.hasher.mBits === other.hasher.mBits) {
      const merged = new HyperLogLog(this.hasher)
      for (var i=0; i<this.M.length; i++)
        merged.M[i] = max(this.M[i], other.M[i])
      return merged
    } else console.error('[HyperLogLog] Unable to merge counters with varying register counts (see mBit parameter)')
  }
}
