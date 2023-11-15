import * as _ from "effect/Option"
import { describe, expect, it } from "vitest"

describe.concurrent("Pipeable", () => {
  it("pipeArguments", () => {
    const f = (n: number): number => n + 1
    const g = (n: number): number => n * 2
    expect(_.some(2).pipe(_.map(f))).toEqual(_.some(3))
    expect(_.some(2).pipe(_.map(f), _.map(g))).toEqual(_.some(6))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f))).toEqual(_.some(7))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g))).toEqual(_.some(14))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f))).toEqual(_.some(15))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g))).toEqual(_.some(30))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f))).toEqual(_.some(31))
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g))).toEqual(
      _.some(62)
    )
    expect(_.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f)))
      .toEqual(
        _.some(63)
      )
    expect(
      _.some(2).pipe(_.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g), _.map(f), _.map(g))
    )
      .toEqual(
        _.some(126)
      )
  })
})
