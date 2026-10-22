/** 결정적 PRNG (mulberry32). 동일 seed → 동일 Mock 데이터. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** 가중치 선택 */
  weighted<T>(items: readonly { v: T; w: number }[]): T {
    const total = items.reduce((a, i) => a + i.w, 0);
    let r = this.next() * total;
    for (const i of items) {
      r -= i.w;
      if (r <= 0) return i.v;
    }
    return items[items.length - 1].v;
  }
  hex(len: number): string {
    let s = '';
    for (let i = 0; i < len; i++) s += '0123456789abcdef'[this.int(0, 15)];
    return s;
  }
}
