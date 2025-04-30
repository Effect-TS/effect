import { describe, it } from "@effect/vitest"
import { assertInstanceOf, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import { Option, Pipeable } from "effect"

describe("Pipeable", () => {
  it("pipeArguments", () => {
    const f = (n: number): number => n + 1
    const g = (n: number): number => n * 2
    assertSome(Option.some(2).pipe(Option.map(f)), 3)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g)), 6)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f)), 7)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g)), 14)
    assertSome(Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g), Option.map(f)), 15)
    assertSome(
      Option.some(2).pipe(Option.map(f), Option.map(g), Option.map(f), Option.map(g), Option.map(f), Option.map(g)),
      30
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f)
      ),
      31
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g)
      ),
      62
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f)
      ),
      63
    )
    assertSome(
      Option.some(2).pipe(
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g),
        Option.map(f),
        Option.map(g)
      ),
      126
    )
  })
  it("pipeable", () => {
    class A {
      constructor(public a: number) {}
      methodA() {
        return this.a
      }
    }
    class B extends Pipeable.Class(A) {
      constructor(private b: string) {
        super(b.length)
      }
      methodB() {
        return [this.b, this.methodA()]
      }
    }
    const b = new B("bb")

    assertInstanceOf(b, A)
    assertInstanceOf(b, B)
    deepStrictEqual(b.methodB(), ["bb", 2])
    deepStrictEqual(b.pipe((x) => x.methodB()), ["bb", 2])
  })
  it("Class", () => {
    class A extends Pipeable.Class() {
      constructor(public a: number) {
        super()
      }
      methodA() {
        return this.a
      }
    }
    const a = new A(2)

    assertInstanceOf(a, A)
    assertInstanceOf(a, Pipeable.Class())
    deepStrictEqual(a.methodA(), 2)
    deepStrictEqual(a.pipe((x) => x.methodA()), 2)
  })
})
