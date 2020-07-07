import * as E from "../../src/Either"
import { pipe } from "../../src/Function"
import * as O from "../../src/Option"
import * as C from "../../src/next/Cause"
import { Untraced } from "../../src/next/Errors"
import { None } from "../../src/next/Fiber"

describe("Cause", () => {
  it("defects", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const defects = C.defects(cause)

    expect(defects).toStrictEqual(["die0", "die1"])
  })

  it("contains", () => {
    const cause = C.Both(
      C.Fail("no" as const),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2" as const), C.Die("die1")))
    )

    const contains = pipe(cause, C.contains(C.Fail("no2" as const)))
    const no_contain = pipe(cause, C.contains(C.Die("die2")))

    expect(contains).toStrictEqual(true)
    expect(no_contain).toStrictEqual(false)
  })

  it("find", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const find = pipe(
      cause,
      C.find((c) => (c._tag === "Fail" && c.value === "no2" ? O.some("good") : O.none))
    )

    expect(find).toStrictEqual(O.some("good"))
  })

  it("died", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const died = pipe(cause, C.died)
    const no_died = pipe(
      C.Both(C.Fail("no"), C.Then(C.Fail("no2"), C.Both(C.Fail("no3"), C.Fail("no4")))),
      C.died
    )

    expect(died).toStrictEqual(true)
    expect(no_died).toStrictEqual(false)
  })

  it("dieOption", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const died = pipe(cause, C.dieOption)

    expect(died).toStrictEqual(O.some("die0"))
  })

  it("failed", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const filed = pipe(cause, C.failed)
    const no_filed = pipe(
      C.Both(C.Die("no"), C.Then(C.Die("no2"), C.Both(C.Die("no3"), C.Die("no4")))),
      C.failed
    )

    expect(filed).toStrictEqual(true)
    expect(no_filed).toStrictEqual(false)
  })

  it("failureOption", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const filed = pipe(cause, C.failureOption)

    expect(filed).toStrictEqual(O.some("no"))
  })

  it("failures", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const failures = pipe(cause, C.failures)

    expect(failures).toStrictEqual(["no", "no2"])
  })

  it("failureOrCause", () => {
    const cause_f = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )
    const cause_n = C.Both(
      C.Die("no"),
      C.Then(C.Die("die0"), C.Both(C.Die("no2"), C.Die("die1")))
    )

    const failure = pipe(cause_f, C.failureOrCause)
    const cause = pipe(cause_n, C.failureOrCause)

    expect(failure).toStrictEqual(E.left("no"))
    expect(cause).toStrictEqual(E.right(cause_n))
  })

  it("chain", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const cause_b = pipe(
      cause,
      C.chain((s) => C.Fail(`prefix: ${s}`))
    )

    expect(cause_b).toStrictEqual(
      C.Both(
        C.Fail("prefix: no"),
        C.Then(C.Die("die0"), C.Both(C.Fail("prefix: no2"), C.Die("die1")))
      )
    )
  })

  it("map", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const cause_b = pipe(
      cause,
      C.map((s) => `prefix: ${s}`)
    )

    expect(cause_b).toStrictEqual(
      C.Both(
        C.Fail("prefix: no"),
        C.Then(C.Die("die0"), C.Both(C.Fail("prefix: no2"), C.Die("die1")))
      )
    )
  })

  it("flatten", () => {
    const cause = C.Both(
      C.Fail(C.Fail("no")),
      C.Then(C.Die("die0"), C.Both(C.Fail(C.Fail("no2")), C.Die("die1")))
    )

    const cause_b = pipe(cause, C.flatten)

    expect(cause_b).toStrictEqual(
      C.Both(C.Fail("no"), C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1"))))
    )
  })

  it("interruptedOnly", () => {
    const cause_no = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const cause_yes = C.Both(
      C.Interrupt(None),
      C.Then(C.Interrupt(None), C.Both(C.Interrupt(None), C.Interrupt(None)))
    )

    const no = pipe(cause_no, C.interruptedOnly)
    const yes = pipe(cause_yes, C.interruptedOnly)

    expect(no).toStrictEqual(false)
    expect(yes).toStrictEqual(true)
  })

  it("interrupted", () => {
    const cause_no = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const cause_yes = C.Both(
      C.Interrupt(None),
      C.Then(C.Interrupt(None), C.Both(C.Interrupt(None), C.Interrupt(None)))
    )

    const no = pipe(cause_no, C.interrupted)
    const yes = pipe(cause_yes, C.interrupted)

    expect(no).toStrictEqual(false)
    expect(yes).toStrictEqual(true)
  })

  it("interruptors", () => {
    const cause = C.Both(
      C.Interrupt(None),
      C.Then(C.Interrupt(None), C.Both(C.Interrupt(None), C.Interrupt(None)))
    )

    const interruptors = pipe(cause, C.interruptors)

    expect(interruptors).toStrictEqual(new Set([None]))
  })

  it("isEmpty", () => {
    const cause_no = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )
    const cause_yes = C.Both(C.Empty, C.Then(C.Empty, C.Both(C.Empty, C.Empty)))

    const no = pipe(cause_no, C.isEmpty)
    const yes = pipe(cause_yes, C.isEmpty)

    expect(no).toStrictEqual(false)
    expect(yes).toStrictEqual(true)
  })

  it("fold", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const res = pipe(
      cause,
      C.fold(
        () => 0,
        () => 1,
        () => 2,
        () => 3,
        (x, y) => x + y,
        (x, y) => x + y
      )
    )

    expect(res).toStrictEqual(6)
  })

  it("keepDefects", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(C.Die("die0"), C.Both(C.Fail("no2"), C.Die("die1")))
    )

    const defects = pipe(cause, C.keepDefects)

    expect(defects).toStrictEqual(O.some(C.Then(C.Die("die0"), C.Die("die1"))))
  })

  it("pretty", () => {
    const cause = C.Both(
      C.Fail("no"),
      C.Then(
        C.Die(new Untraced("die0")),
        C.Both(C.Fail("no2"), C.Die(new Untraced("die1")))
      )
    )

    const pretty = pipe(cause, C.pretty)

    expect(pretty).toStrictEqual(`╥
╠══╦══╗
║  ║  ║
║  ║  ╠─An unchecked error was produced.
║  ║  ║ Untraced: die0
║  ║  ▼
║  ║  ║
║  ║  ╠══╦══╗
║  ║  ║  ║  ║
║  ║  ║  ║  ╠─An unchecked error was produced.
║  ║  ║  ║  ║ Untraced: die1
║  ║  ║  ║  ▼
║  ║  ║  ║
║  ║  ║  ╠─A checked error was not handled.
║  ║  ║  ║ "no2"
║  ║  ║  ▼
║  ║  ▼
║  ║
║  ╠─A checked error was not handled.
║  ║ "no"
║  ▼
▼`)

    const cause_2 = C.Both(cause, C.Fail({ foo: "bar" }))

    expect(pipe(cause_2, C.pretty)).toStrictEqual(`╥
╠══╦══╦══╗
║  ║  ║  ║
║  ║  ║  ╠─A checked error was not handled.
║  ║  ║  ║ {
║  ║  ║  ║   "foo": "bar"
║  ║  ║  ║ }
║  ║  ║  ▼
║  ║  ║
║  ║  ╠─An unchecked error was produced.
║  ║  ║ Untraced: die0
║  ║  ▼
║  ║  ║
║  ║  ╠══╦══╗
║  ║  ║  ║  ║
║  ║  ║  ║  ╠─An unchecked error was produced.
║  ║  ║  ║  ║ Untraced: die1
║  ║  ║  ║  ▼
║  ║  ║  ║
║  ║  ║  ╠─A checked error was not handled.
║  ║  ║  ║ "no2"
║  ║  ║  ▼
║  ║  ▼
║  ║
║  ╠─A checked error was not handled.
║  ║ "no"
║  ▼
▼`)
  })
})
