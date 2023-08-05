
/** Computes the absolute error */
export const err = (count: number, expected: number) => Math.abs(count - expected) / expected

/** Computes the absolute error as a whole percentage */
export const errPct = (count: number, expected: number) => (100 * err(count, expected)).toFixed(2)

/** Basic check that the error is below a generous threshold, say 3% */
export const saneError = (count: number, expected: number) => err(count, expected) < 0.03