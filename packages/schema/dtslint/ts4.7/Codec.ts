import { pipe } from "@fp-ts/data/Function";
import * as JC from "@fp-ts/schema/Codec";

//
// Primitives
//

// $ExpectType Codec<string>
JC.string;

// $ExpectType Codec<number>
JC.number;

// $ExpectType Codec<bigint>
JC.bigint;

// $ExpectType Codec<boolean>
JC.boolean;

// $ExpectType Codec<unknown>
JC.unknown;

// $ExpectType Codec<any>
JC.any;

//
// Validations
//

// $ExpectType Codec<string>
pipe(JC.string, JC.minLength(1));

// $ExpectType Codec<string>
pipe(JC.string, JC.maxLength(10));

// $ExpectType Codec<number>
pipe(JC.number, JC.lessThan(0));

// $ExpectType Codec<number>
pipe(JC.number, JC.lessThanOrEqualTo(0));

// $ExpectType Codec<number>
pipe(JC.number, JC.greaterThan(10));

// $ExpectType Codec<number>
pipe(JC.number, JC.greaterThanOrEqualTo(10));

//
// Constructors
//

// $ExpectType Codec<"a">
JC.literal("a");

// $ExpectType Codec<"a" | "b" | "c">
JC.literal("a", "b", "c");

enum Fruits {
  Apple,
  Banana,
}

// $ExpectType Codec<typeof Fruits>
JC.nativeEnum(Fruits);

// $ExpectType Codec<string | number>
JC.union(JC.string, JC.number);

// $ExpectType Codec<readonly [string, number]>
JC.tuple(JC.string, JC.number);

// $ExpectType Schema<readonly [string, number, ...boolean[]]>
pipe(JC.tuple(JC.string, JC.number), JC.withRest(JC.boolean))

// $ExpectType Codec<readonly number[]>
JC.array(JC.number);

// $ExpectType Codec<readonly [number, ...number[]]>
JC.nonEmptyArray(JC.number);

// $ExpectType Codec<{ readonly a: string; readonly b: number; }>
JC.struct({ a: JC.string,  b: JC.number });

// $ExpectType Codec<{ readonly a: string; }>
pipe(JC.struct({ a: JC.string,  b: JC.number }), JC.pick('a'));

// $ExpectType Codec<{ readonly b: number; }>
pipe(JC.struct({ a: JC.string,  b: JC.number }), JC.omit('a'));

// $ExpectType Codec<Partial<{ readonly a: string; readonly b: number; }>>
JC.partial(JC.struct({ a: JC.string,  b: JC.number }));

// $ExpectType Codec<{ readonly [_: string]: string; }>
JC.stringIndexSignature(JC.string)

// $ExpectType Codec<{ readonly [_: symbol]: string; }>
JC.symbolIndexSignature(JC.string)

// $ExpectType Codec<{ readonly a: string; readonly b: string; } & { readonly [_: string]: string; }>
pipe(
  JC.struct({ a: JC.string, b: JC.string }),
  JC.extend(JC.stringIndexSignature(JC.string))
);

// $ExpectType Codec<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }>
JC.struct({ a: JC.string, b: JC.number }, { c: JC.boolean })

// $ExpectType Codec<Option<number>>
JC.option(JC.number)
