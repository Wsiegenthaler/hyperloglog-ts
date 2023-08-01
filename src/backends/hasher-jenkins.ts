import Hasher from './hasher'


export class Jenkins32Hasher extends Hasher<number> {

  protected static HASH_LEN = 32
  protected static DFLT_MBITS = 12

  protected valMask: number
  protected mIdxMask: number

  constructor(mBits: number = Jenkins32Hasher.DFLT_MBITS) {
    if (mBits > 12) {
      console.log(`[Jenkins32Hasher] WARNING: Hasher does not support precision (mBits) larger than 12. Defaulting to maximum.`)
      mBits = Jenkins32Hasher.DFLT_MBITS
    }

    super(mBits)

    this.valMask = 2 ** (Jenkins32Hasher.HASH_LEN - mBits) - 1
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

    if (masked === 0) return Jenkins32Hasher.HASH_LEN - this.mBits

    var z = 0
    while (this.isZeroAtIdx(masked, z)) z++

    return z
  }

  mIdx(h: number): number {
    return (h >> (Jenkins32Hasher.HASH_LEN - this.mBits)) & this.mIdxMask
  }

  hashLen() { return Jenkins32Hasher.HASH_LEN }

  private isZeroAtIdx(h: number, z: number): boolean {
    return ((h >> z) & 1) === 0
  }
}