import { pipe } from "@fp-ts/data/Function";
import * as JC from "@fp-ts/schema/JsonCodec";

// $ExpectType JsonCodec<string>
JC.string;

// $ExpectType JsonCodec<number>
JC.number;

// $ExpectType JsonCodec<boolean>
JC.boolean;

// $ExpectType JsonCodec<"a">
JC.literal("a");

// $ExpectType JsonCodec<"a" | "b" | "c">
JC.literal("a", "b", "c");

enum Fruits {
  Apple,
  Banana,
}

// $ExpectType JsonCodec<typeof Fruits>
JC.nativeEnum(Fruits);

// $ExpectType JsonCodec<string | number>
JC.union(JC.string, JC.number);

// $ExpectType JsonCodec<readonly [string, number]>
JC.tuple(JC.string, JC.number);

// $ExpectType Schema<readonly [string, number, ...boolean[]]>
pipe(JC.tuple(JC.string, JC.number), JC.withRest(JC.boolean))

// $ExpectType JsonCodec<readonly number[]>
JC.array(JC.number);

// $ExpectType JsonCodec<readonly [number, ...number[]]>
JC.nonEmptyArray(JC.number);

// $ExpectType JsonCodec<{ readonly a: string; readonly b: number; }>
JC.struct({ a: JC.string,  b: JC.number });

// $ExpectType JsonCodec<{ readonly a: string; }>
pipe(JC.struct({ a: JC.string,  b: JC.number }), JC.pick('a'));

// $ExpectType JsonCodec<{ readonly b: number; }>
pipe(JC.struct({ a: JC.string,  b: JC.number }), JC.omit('a'));

// $ExpectType JsonCodec<Partial<{ readonly a: string; readonly b: number; }>>
JC.partial(JC.struct({ a: JC.string,  b: JC.number }));

// $ExpectType JsonCodec<{ readonly [_: string]: string; }>
JC.stringIndexSignature(JC.string)

// $ExpectType JsonCodec<{ readonly [_: symbol]: string; }>
JC.symbolIndexSignature(JC.string)

// $ExpectType JsonCodec<{ readonly a: string; readonly b: string; } & { readonly [_: string]: string; }>
pipe(
  JC.struct({ a: JC.string, b: JC.string }),
  JC.extend(JC.stringIndexSignature(JC.string))
);
