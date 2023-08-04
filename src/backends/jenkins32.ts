import { MultiSetCounter } from '../index'
import { Hasher, HasherFactory } from './hasher'


export const jenkins32Tag = 'jenkins32'

export class Jenkins32 implements Hasher<number> {

  readonly hashLen = 32
  readonly maxMBits = 12
  readonly hasherTag = jenkins32Tag

  protected readonly mBits: number
  protected readonly valMask: number
  protected readonly mIdxMask: number

  constructor(counter: MultiSetCounter) {
    this.mBits = counter.mBits()
    this.valMask = 2 ** (this.hashLen - this.mBits) - 1
    this.mIdxMask = 2 ** this.mBits - 1
  }

  hash(str: string) {
    var hash = 0

    for (var i = 0, l = str.length; i < l; i++) {
      hash += str.charCodeAt(i)
      hash += hash << 10
      hash ^= hash >> 6
    }

    hash += hash << 3
    hash ^= hash >> 6
    hash += hash << 16

    return hash
  }

  runLength(h: number) {
    let masked = h & this.valMask

    if (masked === 0) return this.hashLen - this.mBits

    var z = 0
    while (this.isZeroAtIdx(masked, z)) z++

    return z
  }

  mIdx(h: number): number {
    return (h >> (this.hashLen - this.mBits)) & this.mIdxMask
  }

  private isZeroAtIdx(h: number, z: number): boolean {
    return ((h >> z) & 1) === 0
  }
}

HasherFactory.register(jenkins32Tag, Jenkins32)