import { chunk, range, sum } from 'lodash-es'


/**
 * Printable binary representation of `number` value (the implicitly converted 32-bit
 * unsigned value). Useful for debugging.
 */
export const numToBinStr = (n: number): string => 
  chunk(range(32).reverse().map(i => ((n >> i) & 1) === 1 ? '1' : '0'), 8)
    .map(b => b.join(''))
    .join(' ')

/** Harmonic mean */
export const harmonicMean = (vals: Float32Array) => vals.length / sum(vals.map(v => 1 / v))

/**
 * 'Alpha-m' constants used to correct for 'systematic multiplicative bias' resulting from
 * hash collisions. These values are approximations of the formula provided by the
 * HyperLogLog Wikipedia entry.
 */
export const alphaApprox = (mBits: number) => {
  const alphasByMBits = [
    0.35119394711676189 , 0.53243461399597255 , 0.62560871093725783,
    0.67310202386766599 , 0.69712263380102416 , 0.70920845287002329,
    0.71527118996133942 , 0.71830763819181383 , 0.71982714782040011,
    0.72058722597645269 , 0.72096734613621909 , 0.72115742651737845,
    0.72125247178713563 , 0.72129999569229111 , 0.72132375796249839 ]
  if (mBits > 0 && mBits < alphasByMBits.length) return alphasByMBits[mBits-1]
  else return .7213 / (1 + 1.079 / mBits)
}