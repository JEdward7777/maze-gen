/**
 * Random number generator class using Mulberry32 algorithm.
 * Provides a drop-in replacement for Math.random() with seeded behavior.
 */
class Random {
  /**
   * @param {number} seed - Initial seed (integer, will be treated as uint32)
   */
  constructor(seed) {
    this.seed = seed | 0; // Ensure uint32
  }

  /**
   * Generate a random number in [0, 1)
   * @returns {number}
   */
  random() {
    let t = (this.seed += 0x6D2B79F5) | 0;
    t = Math.imul(t ^ t >>> 15, 1 | t);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

module.exports = { Random };