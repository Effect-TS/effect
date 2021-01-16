import * as A from "../src/Common/Array"
import * as E from "../src/Common/Either"
import * as T from "../src/Effect"
import * as Ex from "../src/Effect/Exit"
import { pipe } from "../src/Function"

export type ADT =
  | { _tag: "A"; a: string }
  | { _tag: "B"; b: string }
  | { _tag: "C"; c: string }

export const matcher = T.matchTagIn<ADT>()({
  A: ({ a }) => T.access((_: { A: string }) => `${_.A} - ${a}`),
  B: ({ b }) => T.access((_: { B: string }) => `${_.B} - ${b}`),
  C: ({ c }) => T.access((_: { C: string }) => `${_.C} - ${c}`)
})

export const matcherDef = T.matchTagIn<ADT>()(
  {
    A: ({ a }) => T.access((_: { A: string }) => `${_.A} - ${a}`)
  },
  (bc) => T.access((_: { D: string }) => `${_.D} - ${bc._tag}`)
)

describe("Matchers", () => {
  it("matchIn", async () => {
    const program = matcher({
      _tag: "A",
      a: "a"
    })

    const res = await pipe(
      program,
      T.provideAll({ A: "A", B: "B", C: "C", D: "D" }),
      T.runPromiseExit
    )

    expect(res).toEqual(Ex.succeed("A - a"))
  })
  it("matchIn - def", async () => {
    const program = matcherDef({
      _tag: "B",
      b: "b"
    })

    const res = await pipe(
      program,
      T.provideAll({ A: "A", B: "B", C: "C", D: "D" }),
      T.runPromiseExit
    )

    expect(res).toEqual(Ex.succeed("D - B"))
  })
  it("match", async () => {
    const program = pipe(
      T.succeed<ADT>({ _tag: "A", a: "a" }),
      T.chain(
        T.matchTag(
          {
            A: ({ a }) => T.access((_: { A: string }) => `${_.A} - ${a}`)
          },
          (bc) => T.succeed(JSON.stringify(bc))
        )
      )
    )

    const res = await pipe(program, T.provideAll({ A: "A" }), T.runPromiseExit)

    expect(res).toEqual(Ex.succeed("A - a"))
  })

  it("array conditional", () => {
    const res = pipe(
      false,
      A.if(
        () => [0],
        () => ["ok"]
      )
    )
    expect(res).toEqual(["ok"])
  })

  it("either conditionals", () => {
    const res = E.if_(
      true,
      () => E.right(0),
      () => E.left("ko")
    )
    expect(res).toEqual(E.right(0))
  })
})
