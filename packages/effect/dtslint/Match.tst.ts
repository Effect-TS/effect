import { Either, hole, Match, Option, pipe, Predicate } from "effect"
import { describe, expect, it } from "tstyche"

type Value = { _tag: "A"; a: number } | { _tag: "B"; b: number }
declare const value: Value
declare const handlerA: (_: { _tag: "A"; a: number }) => string
const isArray = (_: unknown): _ is ReadonlyArray<unknown> => Array.isArray(_)

describe("Match", () => {
  it("type", () => {
    expect(
      Match.type<Value>().pipe(
        Match.when(Match.any, (v) => {
          expect(v).type.toBe<Value>()
          return "a"
        }),
        Match.exhaustive
      )
    ).type.toBe<(u: Value) => string>()
  })

  it("value", () => {
    expect(
      Match.value(hole<Value>()).pipe(
        Match.when(Match.any, (v) => {
          expect(v).type.toBe<Value>()
          return "a"
        }),
        Match.exhaustive
      )
    ).type.toBe<string>()
  })

  it("withReturnType", () => {
    expect(
      Match.type<{ a: number } | { b: string }>().pipe(
        Match.withReturnType<string>(),
        Match.when({ a: Match.number }, (_) =>
          // @ts-expect-error: Type 'number' is not assignable to type 'string'
          _.a),
        Match.when({ b: Match.string }, (_) => _.b),
        Match.exhaustive
      )
    ).type.toBe<(u: { a: number } | { b: string }) => string>()
  })

  it("orElse", () => {
    expect(
      Match.value(hole<string | number>()).pipe(
        Match.when(Match.string, (s) => {
          expect(s).type.toBe<string>()
          return Symbol.for(s)
        }),
        Match.orElse((n) => {
          expect(n).type.toBe<number>()
          return true
        })
      )
    ).type.toBe<boolean | symbol>()
  })

  it("option", () => {
    expect(
      Match.value(hole<string | number>()).pipe(
        Match.when(Match.string, (s) => {
          expect(s).type.toBe<string>()
          return Symbol.for(s)
        }),
        Match.option
      )
    ).type.toBe<Option.Option<symbol>>()
  })

  it("either", () => {
    expect(
      Match.value(hole<string | number>()).pipe(
        Match.when(Match.string, (s) => {
          expect(s).type.toBe<string>()
          return Symbol.for(s)
        }),
        Match.either
      )
    ).type.toBe<Either.Either<symbol, number>>()
  })

  describe("when", () => {
    it("schema exhaustive-literal", () => {
      expect(
        pipe(
          Match.value(hole<{ _tag: "A"; a: number | string } | { _tag: "B"; b: number }>()),
          Match.when({ _tag: Match.is("A", "B"), a: Match.number }, (v) => {
            expect(v).type.toBe<{ _tag: "A"; a: number }>()
            return Either.right(v._tag)
          }),
          Match.when({ _tag: Match.string, a: Match.string }, (v) => {
            expect(v).type.toBe<{ _tag: "A"; a: string }>()
            return Either.right(v._tag)
          }),
          Match.when({ b: Match.number }, (v) => {
            expect(v).type.toBe<{ _tag: "B"; b: number }>()
            return Either.left(v._tag)
          }),
          Match.orElse((v) => {
            expect(v).type.toBe<{ _tag: "A"; a: number | string }>()
            throw "absurd"
          })
        )
      ).type.toBe<Either.Either<"A", "B">>()
    })

    it("tuples", () => {
      expect(
        pipe(
          Match.value(hole<[string, string]>()),
          Match.when(["yeah"], (v) => {
            expect(v).type.toBe<readonly ["yeah", string]>()
            return true
          }),
          Match.option
        )
      ).type.toBe<Option.Option<boolean>>()
    })

    it("not literal", () => {
      expect(
        pipe(
          Match.value(hole<string | number>()),
          Match.not("hi", (v) => {
            expect(v).type.toBe<string | number>()
            return "a"
          }),
          Match.orElse((v) => {
            expect(v).type.toBe<"hi">()
            return "b"
          })
        )
      ).type.toBe<string>()
    })

    it("literals", () => {
      expect(
        pipe(
          Match.value(hole<string>()),
          Match.when("yeah", (v) => {
            expect(v).type.toBe<"yeah">()
            return v === "yeah"
          }),
          Match.orElse((v) => {
            expect(v).type.toBe<string>()
            return "nah"
          })
        )
      ).type.toBe<string | boolean>()
    })

    it("nested", () => {
      expect(
        pipe(
          Match.value(
            hole<
              | { foo: { bar: { baz: { qux: string } } } }
              | { foo: { bar: { baz: { qux: number } } } }
              | { foo: { bar: null } }
            >()
          ),
          Match.when({ foo: { bar: { baz: { qux: 2 } } } }, (v) => {
            expect(v).type.toBe<{ foo: { bar: { baz: { qux: 2 } } } }>()
            return `literal ${v.foo.bar.baz.qux}`
          }),
          Match.when({ foo: { bar: { baz: { qux: "b" } } } }, (v) => {
            expect(v).type.toBe<{ foo: { bar: { baz: { qux: "b" } } } }>()
            return `literal ${v.foo.bar.baz.qux}`
          }),
          Match.when({ foo: { bar: { baz: { qux: Match.number } } } }, (v) => v.foo.bar.baz.qux),
          Match.when({ foo: { bar: { baz: { qux: Match.string } } } }, (v) => v.foo.bar.baz.qux),
          Match.when({ foo: { bar: null } }, (v) => v.foo.bar),
          Match.exhaustive
        )
      ).type.toBe<string | number | null>()
    })

    it("deep recursive", () => {
      type A = null | string | number | { [K in string]: A }
      expect(
        pipe(
          Match.value(hole<A>()),
          Match.when(Predicate.isNull, (v) => {
            expect(v).type.toBe<null>()
            return "null"
          }),
          Match.when(Predicate.isBoolean, (v) => {
            expect(v).type.toBe<boolean>()
            return "boolean"
          }),
          Match.when(Predicate.isNumber, (v) => {
            expect(v).type.toBe<number>()
            return "number"
          }),
          Match.when(Predicate.isString, (v) => {
            expect(v).type.toBe<string>()
            return "string"
          }),
          Match.when(Match.record, (v) => {
            expect(v).type.toBe<{ [x: string]: A }>()
            return "record"
          }),
          Match.when(Predicate.isSymbol, (v) => {
            expect(v).type.toBe<symbol>()
            return "symbol"
          }),
          Match.when(Predicate.isReadonlyRecord, (v) => {
            expect(v).type.toBe<{ readonly [x: string]: unknown; readonly [x: symbol]: unknown }>()
            return "readonlyrecord"
          }),
          Match.exhaustive
        )
      ).type.toBe<string>()
    })

    it("instanceOf", () => {
      class Test {}
      class Test2 {}
      expect(
        pipe(
          Match.value<Test | Test2>(new Test()),
          Match.when(Match.instanceOf(Test), (v) => {
            expect(v).type.toBe<Test>()
            return 1
          }),
          Match.orElse((v) => {
            expect(v).type.toBe<Test | Test2>()
            return 0
          })
        )
      ).type.toBe<number>()

      const match = pipe(
        Match.type<Uint8Array | Uint16Array>(),
        Match.when(Match.instanceOf(Uint8Array), (v) => {
          // @tstyche if { target: ">=5.7" } -- Before TypeScript 5.7, 'Uint8Array' was not generic
          expect(v).type.toBe<Uint8Array<ArrayBuffer>>()
          // @tstyche if { target: "<5.7" }
          expect(v).type.toBe<Uint8Array>()
          return "uint8"
        }),
        Match.when(Match.instanceOf(Uint16Array), (v) => {
          // @tstyche if { target: ">=5.7" } -- Before TypeScript 5.7, 'Uint16Array' was not generic
          expect(v).type.toBe<Uint16Array<ArrayBuffer>>()
          // @tstyche if { target: "<5.7" }
          expect(v).type.toBe<Uint16Array>()
          return "uint16"
        }),
        Match.orElse((v) => {
          // @tstyche if { target: ">=5.7" } -- Before TypeScript 5.7, 'Uint8Array' and 'Uint16Array' were not generic
          expect(v).type.toBe<Uint8Array<ArrayBufferLike> | Uint16Array<ArrayBufferLike>>()
          // @tstyche if { target: "<5.7" }
          expect(v).type.toBe<Uint8Array | Uint16Array>()
          return "a"
        })
      )

      expect(match(new Uint8Array())).type.toBe<string>()
      expect(match(new Uint16Array())).type.toBe<string>()
    })

    it("instanceOf prop", () => {
      class Test {}
      expect(
        pipe(
          Match.value<{ test: Test | null }>({ test: new Test() }),
          Match.when({ test: Match.instanceOf(Test) }, ({ test }) => {
            expect(test).type.toBe<Test>()
            return 1
          }),
          Match.orElse(({ test }) => {
            expect(test).type.toBe<Test | null>()
            return 0
          })
        )
      ).type.toBe<number>()
    })

    it("refinement with unknown", () => {
      const isArray = (_: unknown): _ is ReadonlyArray<unknown> => Array.isArray(_)
      expect(
        pipe(
          Match.value(hole<string | Array<number>>()),
          Match.when(isArray, (v) => {
            expect(v).type.toBe<Array<number>>()
            return "array"
          }),
          Match.when(Predicate.isString, (v) => {
            expect(v).type.toBe<string>()
            return "string"
          }),
          Match.exhaustive
        )
      ).type.toBe<string>()
    })

    it("refinement nested with unknown", () => {
      expect(
        pipe(
          Match.value(hole<{ readonly a: string | Array<number> }>()),
          Match.when({ a: isArray }, (v) => {
            expect(v).type.toBe<{ a: Array<number> }>()
            return "array"
          }),
          Match.orElse((v) => {
            expect(v).type.toBe<{ readonly a: string | Array<number> }>()
            return "fail"
          })
        )
      ).type.toBe<string>()
    })

    it("unknown refinement", () => {
      expect(
        pipe(
          Match.value(hole<unknown>()),
          Match.when(Predicate.isReadonlyRecord, (v) => {
            expect(v).type.toBe<{ readonly [x: string]: unknown; readonly [x: symbol]: unknown }>()
            return "record"
          }),
          Match.orElse(() => "unknown")
        )
      ).type.toBe<string>()
    })

    it("any refinement", () => {
      expect(
        pipe(
          Match.value(hole<any>()),
          Match.when(Predicate.isReadonlyRecord, (v) => {
            expect(v).type.toBe<{ readonly [x: string]: unknown; readonly [x: symbol]: unknown }>()
            return "record"
          }),
          Match.orElse(() => "unknown")
        )
      ).type.toBe<string>()
    })

    it("pattern type is not fixed by the function argument type", () => {
      type T =
        | { resolveType: "A"; value: number }
        | { resolveType: "B"; value: number }
        | { resolveType: "C"; value: number }
      const doStuff = (x: { value: number }) => x
      expect(
        pipe(
          Match.value(hole<T>()),
          Match.when({ resolveType: Match.is("A", "B") }, doStuff),
          Match.not({ resolveType: Match.is("A", "B") }, doStuff),
          Match.exhaustive
        )
      ).type.toBe<{ value: number }>()
    })

    it("non literal refinement", () => {
      const a: number = 1
      const b: string = "b"
      expect(
        Match.value(hole<{ a: number; b: string }>()).pipe(
          Match.when({ a, b }, (v) => {
            expect(v).type.toBe<{ a: number; b: string }>()
            return "ok"
          }),
          Match.either
        )
      ).type.toBe<Either.Either<string, { a: number; b: string }>>()
    })
  })

  it("valueTags", () => {
    expect(
      pipe(
        value,
        Match.valueTags({
          A: (A) => {
            expect(A).type.toBe<{ _tag: "A"; a: number }>()
            return A.a
          },
          B: (B) => {
            expect(B).type.toBe<{ _tag: "B"; b: number }>()
            return "B"
          }
        })
      )
    ).type.toBe<string | number>()

    expect(
      Match.valueTags(value, {
        A: (A) => {
          expect(A).type.toBe<{ _tag: "A"; a: number }>()
          return A.a
        },
        B: (B) => {
          expect(B).type.toBe<{ _tag: "B"; b: number }>()
          return "B"
        }
      })
    ).type.toBe<string | number>()

    pipe(
      value,
      Match.valueTags({
        A: (_A) => _A.a,
        B: () => "B",
        // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
        C: () => false
      })
    )

    Match.valueTags(value, {
      A: (_A) => _A.a,
      B: () => "B",
      // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
      C: () => false
    })
  })

  it("typeTags", () => {
    expect(
      Match.typeTags<Value>()({
        A: (A) => {
          expect(A).type.toBe<{ _tag: "A"; a: number }>()
          return A.a
        },
        B: (B) => {
          expect(B).type.toBe<{ _tag: "B"; b: number }>()
          return "B"
        }
      })(value)
    ).type.toBe<string | number>()

    expect(
      Match.typeTags<Value, string | number>()({
        A: (A) => {
          expect(A).type.toBe<{ _tag: "A"; a: number }>()
          return A.a
        },
        B: (B) => {
          expect(B).type.toBe<{ _tag: "B"; b: number }>()
          return "B"
        }
      })(value)
    ).type.toBe<string | number>()

    Match.typeTags<Value>()({
      A: (_) => _.a,
      B: () => "B",
      // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
      C: () => false
    })(value)

    Match.typeTags<Value, string>()({
      // @ts-expect-error: Type 'number' is not assignable to type 'string'
      A: (_) => _.a,
      B: () => "B",
      // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
      C: () => false
    })(value)
  })

  it("discriminators", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.discriminators("_tag")({
          A: (A) => {
            expect(A).type.toBe<{ _tag: "A"; a: number }>()
            return A.a
          },
          B: (B) => {
            expect(B).type.toBe<{ _tag: "B"; b: number }>()
            return "B"
          }
        }),
        Match.exhaustive
      )(value)
    ).type.toBe<string | number>()

    pipe(
      Match.type<Value>(),
      Match.discriminators("_tag")({
        A: (_) => _.a,
        B: () => "B",
        // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
        C: () => false
      }),
      Match.exhaustive
    )(value)
  })

  it("discriminatorsExhaustive", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.discriminatorsExhaustive("_tag")({
          A: (A) => {
            expect(A).type.toBe<{ _tag: "A"; a: number }>()
            return A.a
          },
          B: (B) => {
            expect(B).type.toBe<{ _tag: "B"; b: number }>()
            return "B"
          }
        })
      )(value)
    ).type.toBe<string | number>()

    pipe(
      Match.type<Value>(),
      Match.discriminatorsExhaustive("_tag")({
        A: (_) => _.a,
        B: () => "B",
        // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
        C: () => false
      })
    )(value)
  })

  it("tags", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.tags({
          A: (A) => {
            expect(A).type.toBe<{ _tag: "A"; a: number }>()
            return A.a
          },
          B: (B) => {
            expect(B).type.toBe<{ _tag: "B"; b: number }>()
            return "B"
          }
        }),
        Match.exhaustive
      )(value)
    ).type.toBe<string | number>()

    pipe(
      Match.type<Value>(),
      Match.tags({
        A: (_) => _.a,
        B: () => "B",
        // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
        C: () => false
      }),
      Match.exhaustive
    )(value)
  })

  it("tagsExhaustive", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.tagsExhaustive({
          A: (A) => {
            expect(A).type.toBe<{ _tag: "A"; a: number }>()
            return A.a
          },
          B: (B) => {
            expect(B).type.toBe<{ _tag: "B"; b: number }>()
            return "B"
          }
        })
      )(value)
    ).type.toBe<string | number>()

    pipe(
      Match.type<Value>(),
      Match.tagsExhaustive({
        A: (_) => _.a,
        B: () => "B",
        // @ts-expect-error: Type '() => boolean' is not assignable to type 'never'
        C: () => false
      })
    )(value)
  })

  it("tag", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.tag("A", handlerA),
        Match.orElse((B) => {
          expect(B).type.toBe<{ _tag: "B"; b: number }>()
          return B.b
        })
      )(value)
    ).type.toBe<string | number>()
  })

  it("tagStartsWith", () => {
    expect(
      pipe(
        Match.type<Value>(),
        Match.tagStartsWith("A", handlerA),
        Match.orElse((B) => {
          expect(B).type.toBe<{ _tag: "B"; b: number }>()
          return B.b
        })
      )(value)
    ).type.toBe<string | number>()
  })

  it("Option.isSome", () => {
    expect(
      pipe(
        Match.type<{ maybeNumber: Option.Option<number> }>(),
        Match.when({ maybeNumber: Option.isSome }, (v) => {
          expect(v).type.toBe<{ maybeNumber: Option.Some<number> }>()
          return v.maybeNumber.value
        }),
        Match.orElse((B) => {
          expect(B).type.toBe<{ maybeNumber: Option.Option<number> }>()
          return undefined
        })
      )({ maybeNumber: Option.some(1) })
    ).type.toBe<number | undefined>()
  })

  it("whenOr refinement with pattern", () => {
    class Person {
      get contactable() {
        return true
      }
    }
    expect(
      pipe(
        Match.type<{ maybeNumber: Option.Option<number>; person: Person }>(),
        Match.whenOr({
          maybeNumber: {
            _tag: Match.is("Some", "None")
          },
          person: { contactable: true }
        }, ({ person }) => {
          expect(person.contactable).type.toBe<true>()
          return person.contactable
        }),
        Match.orElse(({ person }) => {
          expect(person).type.toBe<Person>()
          return false
        })
      )({ maybeNumber: Option.some(1), person: new Person() })
    ).type.toBe<boolean>()
  })

  it(".is prop", () => {
    Match.value<{ foo: string }>({ foo: "bar" }).pipe(
      Match.when({ foo: Match.is("baz") }, (_) => {
        expect(_).type.toBe<{ foo: "baz" }>()
        return true
      }),
      Match.when({ foo: (s): s is "baz" => s === "baz" }, (_) => {
        expect(_).type.toBe<{ foo: "baz" }>()
        return true
      }),
      Match.orElse((_) => {
        expect(_).type.toBe<{ foo: string }>()
        return true
      })
    )
  })
})
