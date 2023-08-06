import { cloneDeep, defaults, isObject, toString } from 'lodash-es'
import { SmartBuffer } from 'smart-buffer'

import { Hasher, HasherFactory } from './backends/hasher'

import { alphaApprox, harmonicMean } from './util'
import { jenkins32Id } from './backends/jenkins32'

const { log, max, round } = Math


export interface MultiSetCounter {
  add(val: string): void
  count(): number
  merge(other: MultiSetCounter): MultiSetCounter
  precision(): number
  serialize(): Buffer
}

export type Options = {

  /**
   * The name of the hasher implementation to use.
   */
  hasherId?: string

  /**
   * Number of hash bits used to determine register index. This should be
   * `log2(r)` where `r` is the number of registers.
   **/
  precision?: number

  /**
   * Whether to correct for 'systematic multiplicative bias' resulting from
   * hash collisions. See the `count()` method for details (enabled by default)
   */
  collisionAdjustment?: boolean

  /**
   * Whether to make adjustments when the observed cardinality is more or less than
   * expected. See the counter `count()` method for details. (enabled by default)
   */
  boundAdjustments?: boolean
}

const Defaults: Options = {
  hasherId: jenkins32Id,
  precision: 12,
  collisionAdjustment: true,
  boundAdjustments: true
}

/**
 * Re-export `Hasher` interface to allow thirdparty backends.
 */
export { Hasher } from './backends/hasher'

/**
 * A basic implementation of the 'HyperLogLog' datastructure which is useful for
 * estimating the number of distinct elements in a multiset.
 */
export class HyperLogLog implements MultiSetCounter {

  protected hasher: Hasher<any>
  protected registers: Uint8Array
  protected opts: Options = cloneDeep(Defaults)

  /**
   * @param hasher The hashing backend to use. Any instance implementing the `Hasher` trait may be used.
   * @param options
   */
  constructor(options?: Options) {
    // Initialize options with defaults if unspecified
    if (isObject(options)) this.opts = defaults(cloneDeep(options), Defaults)

    // Verify register count is at least 1
    if (this.opts.precision! < 0) throw Error(`[HyperLogLog] ERROR: Precision (precision) must be at least 0.`)

    // Warn if register count is less than 2^4
    if (this.opts.precision! < 4) console.warn(`[HyperLogLog] WARNING: Recommended precision (precision) should be larger than 4 for accurate results.`)

    // Build hasher backend
    this.hasher = HasherFactory.build(this.opts.hasherId, this)

    // Verify that this backend supports the configured number of registers
    if (this.opts.precision > this.hasher.maxPrecision) {
      console.warn(`[HyperLogLog] WARNING: Hasher '${this.hasher.hasherId}' does not support precision (precision) larger than ${this.hasher.maxPrecision}. Defaulting to maximum.`)
      this.opts.precision = this.hasher.maxPrecision
    }

    // Initialize registers
    const regCnt = 2 ** this.opts.precision
    this.registers = new Uint8Array(regCnt)
    for (var i=0; i<regCnt; i++) this.registers[i] = 0
  }

  /**
   * @returns The number of bits used for the register index (e.g. 8-bits = 256 registers)
   */
  precision(): number {
    return this.opts.precision!
  }

  /**
   * @param val Inserts a value into this set for counting. Duplicate values will only be
   * counted once in the resulting estimate.
   */
  add(val: string) {
    const h = this.hasher.hash(toString(val))
    const z = this.hasher.runLength(h) + 1
    const i = this.hasher.regIdx(h)
    this.registers[i] = max(this.registers[i], z)
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
    const regCnt = this.registers.length
    const z = harmonicMean(Float32Array.from(this.registers).map(run => 2 ** run))

    const am = this.opts.collisionAdjustment ? alphaApprox(this.opts.precision) : 1
    const estimate = round(am * regCnt * z)

    if (this.opts.boundAdjustments) {
      const hashSpace = 2n ** BigInt(this.hasher.hashLen)
      if (estimate < 2.5 * regCnt) {
        // Lower bound correction (aka Linear Counting)
        const v = this.registers.filter(m => m === 0.0).length
        if (v === 0) return estimate
        else return regCnt * log(regCnt / v)
      } else if (estimate > hashSpace / 30n) {
        // Upper bound correction
        return -Number(hashSpace) * log(1 - estimate / Number(hashSpace))
      }
    }
    
    return estimate
  }

  /**
   * Creates a new counter by merging the state of this with another - useful for distributed scenarios.
   * @returns A new `HyperLogLog` counter instance whose cardinality estimate reflects the
   *          combined sets of the merged counters. The new counter inherits the `options`
   *          of this instance (lhs).
   */
  merge(other: HyperLogLog): HyperLogLog {
    if (this.precision() !== other.precision())
      throw Error(`[HyperLogLog] Unable to merge counters with varying register counts (lhs=${this.precision()}-bits, rhs=${other.precision()}-bits)`)

    if (this.hasher.hasherId !== other.hasher.hasherId)
      throw Error(`[HyperLogLog] Counters must use the same \`Hasher\` implementations to be merged (lhs=${this.hasher.hasherId}, rhs=${other.hasher.hasherId})`)

    const merged = new HyperLogLog(this.opts)

    for (var i=0; i<this.registers.length; i++)
      merged.registers[i] = max(this.registers[i], other.registers[i])

    return merged
  }

  /**
   * @returns A `Buffer` containing the state of this counter. Useful for transmitting
   * to another host for merging.
   */
  serialize(): Buffer {
    const optsJson = JSON.stringify(this.opts)

    const maxBytes =
      (3 * optsJson.length) +      // max 3-bytes per char (utf8)
      (4 + this.registers.length)  // 32-bit length + 1-byte per register

    const buf = new SmartBuffer({ size: maxBytes })

    buf.writeStringNT(optsJson)
    buf.writeUInt32LE(this.registers.length)
    this.registers.forEach(b => buf.writeUInt8(b))

    return buf.toBuffer()
  }

  /**
   * @returns A newly instantiated counter which mirrors a previously serialized one.
   */
  static deserialize(rawBuf: Buffer): HyperLogLog {
    const buf = SmartBuffer.fromBuffer(rawBuf)

    const options = JSON.parse(buf.readStringNT())
    const registers = new Uint8Array(buf.readBuffer(buf.readUInt32LE()))

    const counter = new HyperLogLog(options)
    counter.registers = registers
    return counter
  }
}
