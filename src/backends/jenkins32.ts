import { MultiSetCounter } from '../index'
import { Hasher, HasherFactory } from './hasher'


export const jenkins32Id = 'jenkins32'

export class Jenkins32 implements Hasher<number> {

  readonly hashLen = 32
  maxPrecision = 12
  hasherId = jenkins32Id

  protected readonly precision: number
  protected readonly valMask: number
  protected readonly regIdxMask: number

  constructor(counter: MultiSetCounter) {
    this.precision = counter.precision()
    this.valMask = 2 ** (this.hashLen - this.precision) - 1
    this.regIdxMask = 2 ** this.precision - 1
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

    if (masked === 0) return this.hashLen - this.precision

    var z = 0
    while (this.isZeroAtIdx(masked, z)) z++

    return z
  }

  regIdx(h: number): number {
    return (h >> (this.hashLen - this.precision)) & this.regIdxMask
  }

  private isZeroAtIdx(h: number, z: number): boolean {
    return ((h >> z) & 1) === 0
  }
}

HasherFactory.register(jenkins32Id, Jenkins32)