// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror

export interface State {
  s0: number
  s1: number
  s2: number
  c: number
}

export class Alea {
  private mash: (data: string) => number = undefined as any
  public s0: number = undefined as any
  public s1: number = undefined as any
  public s2: number = undefined as any
  public c: number = undefined as any

  constructor(seed: string) {
    this.setSeed(seed)
  }

  setSeed(seed: string) {
    this.mash = Mash()

    this.s0 = this.mash(" ")
    this.s1 = this.mash(" ")
    this.s2 = this.mash(" ")
    this.c = 1

    this.s0 -= this.mash(seed)

    if (this.s0 < 0) {
      this.s0 += 1
    }

    this.s1 -= this.mash(seed)

    if (this.s1 < 0) {
      this.s1 += 1
    }

    this.s2 -= this.mash(seed)

    if (this.s2 < 0) {
      this.s2 += 1
    }
  }

  next() {
    const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10 // 2^-32
    this.s0 = this.s1
    this.s1 = this.s2
    return (this.s2 = t - (this.c = t | 0))
  }
}

export class PRNG {
  readonly xg: Alea

  constructor(seed: string) {
    this.xg = new Alea(seed)
  }

  setSeed(seed: string) {
    this.xg.setSeed(seed)
  }

  next() {
    return this.xg.next()
  }

  int32() {
    return (this.xg.next() * 0x100000000) | 0
  }

  double() {
    return this.next() + ((this.next() * 0x200000) | 0) * 1.1102230246251565e-16
  }
}

export function Mash() {
  let n = 0xefc8249d

  const mash = function (data: string) {
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n = h >>> 0
      h -= n
      h *= n
      n = h >>> 0
      h -= n
      n += h * 0x100000000 // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
  }

  return mash
}
