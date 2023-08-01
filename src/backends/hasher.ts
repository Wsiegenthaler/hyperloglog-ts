export default abstract class Hasher<H> {
  readonly mBits: number

  constructor(mBits: number) {
    this.mBits = mBits
  }

  abstract hash(val: string): H

  abstract runLength(hashVal: H): number

  abstract mIdx(hashVal: H): number

  abstract hashLen(): number
}