import Hasher from './hasher'


export class Jenkins32 extends Hasher<number> {

  readonly hashLen = 32
  readonly hasherTag = 'jenkins32'

  protected static readonly defaultMBits = 12

  protected valMask: number
  protected mIdxMask: number

  constructor(mBits: number = Jenkins32.defaultMBits) {
    if (mBits > 12) {
      console.warn(`[Jenkins32] WARNING: Hasher does not support precision (mBits) larger than 12. Defaulting to maximum.`)
      mBits = Jenkins32.defaultMBits
    }

    super(mBits)

    this.valMask = 2 ** (this.hashLen - mBits) - 1
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
