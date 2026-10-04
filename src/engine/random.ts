// Seeded random numbers, so a saved game replays the same rolls.

/** mulberry32: small, fast, and good enough for dice. */
export class Rng {
  constructor(public state: number) {}

  /** A float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A d100 roll, 1-100. */
  d100 = (): number => Math.floor(this.next() * 100) + 1;

  /** An integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with the given probability (0-1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Picks by weight; items with weight 0 are never picked. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T | undefined {
    const total = items.reduce((sum, i) => sum + Math.max(0, i.weight), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const i of items) {
      r -= Math.max(0, i.weight);
      if (r < 0) return i.item;
    }
    return items[items.length - 1].item;
  }
}

export const newSeed = (): number => Math.floor(Math.random() * 2 ** 31);
