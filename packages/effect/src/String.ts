/**
 * Works with TypeScript `string` values.
 *
 * This module exposes common string operations in a pipe-friendly style. The
 * helpers cover checks, comparison, concatenation, trimming, casing, slicing,
 * padding, replacement, normalization, safe character access, search helpers
 * that return `Option`, and joining strings through a reducer.
 *
 * @stability stable
 * @since 2.0.0
 */

import type { NonEmptyArray } from "./Array.ts"
import * as Equ from "./Equivalence.ts"
import { dual } from "./Function.ts"
import * as readonlyArray from "./internal/array.ts"
import * as Count from "./internal/count.ts"
import * as number from "./Number.ts"
import * as Option from "./Option.ts"
import * as order from "./Order.ts"
import type * as Ordering from "./Ordering.ts"
import type { Refinement } from "./Predicate.ts"
import * as predicate from "./Predicate.ts"
import * as Reducer from "./Reducer.ts"

/**
 * Exposes the global string constructor.
 *
 * **When to use**
 *
 * Use to access native JavaScript string coercion or constructor behavior from
 * the Effect module namespace.
 *
 * **Gotchas**
 *
 * Calling `String(value)` returns a primitive string. Calling
 * `new String(value)` creates a boxed `String` object.
 *
 * @see {@link isString} for checking whether a value is a primitive string
 *
 * @stability stable
 * @category constructors
 * @since 4.0.0
 */
export const String = globalThis.String

/**
 * Checks whether a value is a `string`.
 *
 * **Example** (Checking for strings)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.isString("a") // => true
 * String.isString(1) // => false
 * ```
 *
 * @stability stable
 * @category guards
 * @since 2.0.0
 */
export const isString: Refinement<unknown, string> = predicate.isString

/**
 * Provides an `Order` instance for comparing strings using lexicographic
 * ordering.
 *
 * **Example** (Comparing strings lexicographically)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.Order("apple", "banana") // => -1
 * String.Order("banana", "apple") // => 1
 * String.Order("apple", "apple") // => 0
 * ```
 *
 * @stability stable
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<string> = order.String

/**
 * Provides an `Equivalence` instance for strings using strict equality (`===`).
 *
 * **Example** (Comparing strings for equality)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.Equivalence("hello", "hello") // => true
 * String.Equivalence("hello", "world") // => false
 * ```
 *
 * @stability stable
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: Equ.Equivalence<string> = Equ.String

/**
 * Provides the empty string `""`.
 *
 * **When to use**
 *
 * Use when you need the canonical empty string value from the `String` module.
 *
 * **Example** (Referencing the empty string)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.empty // => ""
 * String.isEmpty(String.empty) // => true
 * ```
 *
 * @stability stable
 * @category constants
 * @since 2.0.0
 */
export const empty: "" = "" as const

/**
 * Concatenates two strings at the type level.
 *
 * **Example** (Concatenating string literal types)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * // Type-level concatenation
 * type Result = String.Concat<"hello", "world"> // "helloworld"
 *
 * const witness: Result = "helloworld"
 * ```
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export type Concat<A extends string, B extends string> = `${A}${B}`

/**
 * Concatenates two strings at runtime.
 *
 * **Example** (Concatenating strings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * String.concat("hello", "world") // => "helloworld"
 * pipe("hello", String.concat("world")) // => "helloworld"
 * ```
 *
 * @stability stable
 * @category combining
 * @since 2.0.0
 */
export const concat: {
  <B extends string>(that: B): <A extends string>(self: A) => Concat<A, B>
  <A extends string, B extends string>(self: A, that: B): Concat<A, B>
} = dual(2, (self: string, that: string): string => self + that)

/**
 * Converts a string to uppercase.
 *
 * **Example** (Converting strings to uppercase)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("a", String.toUpperCase) // => "A"
 * String.toUpperCase("hello") // => "HELLO"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const toUpperCase = <S extends string>(self: S): Uppercase<S> => self.toUpperCase() as Uppercase<S>

/**
 * Converts a string to lowercase.
 *
 * **Example** (Converting strings to lowercase)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("A", String.toLowerCase) // => "a"
 * String.toLowerCase("HELLO") // => "hello"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const toLowerCase = <T extends string>(self: T): Lowercase<T> => self.toLowerCase() as Lowercase<T>

// UTF-16 surrogate ranges. A code point above U+FFFF is one high unit
// (U+D800 through U+DBFF) followed by one low unit (U+DC00 through U+DFFF).
// `Uppercase` and `Lowercase` perform the case mapping.
type HighSurrogates =
  "\uD800\uD801\uD802\uD803\uD804\uD805\uD806\uD807\uD808\uD809\uD80A\uD80B\uD80C\uD80D\uD80E\uD80F\uD810\uD811\uD812\uD813\uD814\uD815\uD816\uD817\uD818\uD819\uD81A\uD81B\uD81C\uD81D\uD81E\uD81F\uD820\uD821\uD822\uD823\uD824\uD825\uD826\uD827\uD828\uD829\uD82A\uD82B\uD82C\uD82D\uD82E\uD82F\uD830\uD831\uD832\uD833\uD834\uD835\uD836\uD837\uD838\uD839\uD83A\uD83B\uD83C\uD83D\uD83E\uD83F\uD840\uD841\uD842\uD843\uD844\uD845\uD846\uD847\uD848\uD849\uD84A\uD84B\uD84C\uD84D\uD84E\uD84F\uD850\uD851\uD852\uD853\uD854\uD855\uD856\uD857\uD858\uD859\uD85A\uD85B\uD85C\uD85D\uD85E\uD85F\uD860\uD861\uD862\uD863\uD864\uD865\uD866\uD867\uD868\uD869\uD86A\uD86B\uD86C\uD86D\uD86E\uD86F\uD870\uD871\uD872\uD873\uD874\uD875\uD876\uD877\uD878\uD879\uD87A\uD87B\uD87C\uD87D\uD87E\uD87F\uD880\uD881\uD882\uD883\uD884\uD885\uD886\uD887\uD888\uD889\uD88A\uD88B\uD88C\uD88D\uD88E\uD88F\uD890\uD891\uD892\uD893\uD894\uD895\uD896\uD897\uD898\uD899\uD89A\uD89B\uD89C\uD89D\uD89E\uD89F\uD8A0\uD8A1\uD8A2\uD8A3\uD8A4\uD8A5\uD8A6\uD8A7\uD8A8\uD8A9\uD8AA\uD8AB\uD8AC\uD8AD\uD8AE\uD8AF\uD8B0\uD8B1\uD8B2\uD8B3\uD8B4\uD8B5\uD8B6\uD8B7\uD8B8\uD8B9\uD8BA\uD8BB\uD8BC\uD8BD\uD8BE\uD8BF\uD8C0\uD8C1\uD8C2\uD8C3\uD8C4\uD8C5\uD8C6\uD8C7\uD8C8\uD8C9\uD8CA\uD8CB\uD8CC\uD8CD\uD8CE\uD8CF\uD8D0\uD8D1\uD8D2\uD8D3\uD8D4\uD8D5\uD8D6\uD8D7\uD8D8\uD8D9\uD8DA\uD8DB\uD8DC\uD8DD\uD8DE\uD8DF\uD8E0\uD8E1\uD8E2\uD8E3\uD8E4\uD8E5\uD8E6\uD8E7\uD8E8\uD8E9\uD8EA\uD8EB\uD8EC\uD8ED\uD8EE\uD8EF\uD8F0\uD8F1\uD8F2\uD8F3\uD8F4\uD8F5\uD8F6\uD8F7\uD8F8\uD8F9\uD8FA\uD8FB\uD8FC\uD8FD\uD8FE\uD8FF\uD900\uD901\uD902\uD903\uD904\uD905\uD906\uD907\uD908\uD909\uD90A\uD90B\uD90C\uD90D\uD90E\uD90F\uD910\uD911\uD912\uD913\uD914\uD915\uD916\uD917\uD918\uD919\uD91A\uD91B\uD91C\uD91D\uD91E\uD91F\uD920\uD921\uD922\uD923\uD924\uD925\uD926\uD927\uD928\uD929\uD92A\uD92B\uD92C\uD92D\uD92E\uD92F\uD930\uD931\uD932\uD933\uD934\uD935\uD936\uD937\uD938\uD939\uD93A\uD93B\uD93C\uD93D\uD93E\uD93F\uD940\uD941\uD942\uD943\uD944\uD945\uD946\uD947\uD948\uD949\uD94A\uD94B\uD94C\uD94D\uD94E\uD94F\uD950\uD951\uD952\uD953\uD954\uD955\uD956\uD957\uD958\uD959\uD95A\uD95B\uD95C\uD95D\uD95E\uD95F\uD960\uD961\uD962\uD963\uD964\uD965\uD966\uD967\uD968\uD969\uD96A\uD96B\uD96C\uD96D\uD96E\uD96F\uD970\uD971\uD972\uD973\uD974\uD975\uD976\uD977\uD978\uD979\uD97A\uD97B\uD97C\uD97D\uD97E\uD97F\uD980\uD981\uD982\uD983\uD984\uD985\uD986\uD987\uD988\uD989\uD98A\uD98B\uD98C\uD98D\uD98E\uD98F\uD990\uD991\uD992\uD993\uD994\uD995\uD996\uD997\uD998\uD999\uD99A\uD99B\uD99C\uD99D\uD99E\uD99F\uD9A0\uD9A1\uD9A2\uD9A3\uD9A4\uD9A5\uD9A6\uD9A7\uD9A8\uD9A9\uD9AA\uD9AB\uD9AC\uD9AD\uD9AE\uD9AF\uD9B0\uD9B1\uD9B2\uD9B3\uD9B4\uD9B5\uD9B6\uD9B7\uD9B8\uD9B9\uD9BA\uD9BB\uD9BC\uD9BD\uD9BE\uD9BF\uD9C0\uD9C1\uD9C2\uD9C3\uD9C4\uD9C5\uD9C6\uD9C7\uD9C8\uD9C9\uD9CA\uD9CB\uD9CC\uD9CD\uD9CE\uD9CF\uD9D0\uD9D1\uD9D2\uD9D3\uD9D4\uD9D5\uD9D6\uD9D7\uD9D8\uD9D9\uD9DA\uD9DB\uD9DC\uD9DD\uD9DE\uD9DF\uD9E0\uD9E1\uD9E2\uD9E3\uD9E4\uD9E5\uD9E6\uD9E7\uD9E8\uD9E9\uD9EA\uD9EB\uD9EC\uD9ED\uD9EE\uD9EF\uD9F0\uD9F1\uD9F2\uD9F3\uD9F4\uD9F5\uD9F6\uD9F7\uD9F8\uD9F9\uD9FA\uD9FB\uD9FC\uD9FD\uD9FE\uD9FF\uDA00\uDA01\uDA02\uDA03\uDA04\uDA05\uDA06\uDA07\uDA08\uDA09\uDA0A\uDA0B\uDA0C\uDA0D\uDA0E\uDA0F\uDA10\uDA11\uDA12\uDA13\uDA14\uDA15\uDA16\uDA17\uDA18\uDA19\uDA1A\uDA1B\uDA1C\uDA1D\uDA1E\uDA1F\uDA20\uDA21\uDA22\uDA23\uDA24\uDA25\uDA26\uDA27\uDA28\uDA29\uDA2A\uDA2B\uDA2C\uDA2D\uDA2E\uDA2F\uDA30\uDA31\uDA32\uDA33\uDA34\uDA35\uDA36\uDA37\uDA38\uDA39\uDA3A\uDA3B\uDA3C\uDA3D\uDA3E\uDA3F\uDA40\uDA41\uDA42\uDA43\uDA44\uDA45\uDA46\uDA47\uDA48\uDA49\uDA4A\uDA4B\uDA4C\uDA4D\uDA4E\uDA4F\uDA50\uDA51\uDA52\uDA53\uDA54\uDA55\uDA56\uDA57\uDA58\uDA59\uDA5A\uDA5B\uDA5C\uDA5D\uDA5E\uDA5F\uDA60\uDA61\uDA62\uDA63\uDA64\uDA65\uDA66\uDA67\uDA68\uDA69\uDA6A\uDA6B\uDA6C\uDA6D\uDA6E\uDA6F\uDA70\uDA71\uDA72\uDA73\uDA74\uDA75\uDA76\uDA77\uDA78\uDA79\uDA7A\uDA7B\uDA7C\uDA7D\uDA7E\uDA7F\uDA80\uDA81\uDA82\uDA83\uDA84\uDA85\uDA86\uDA87\uDA88\uDA89\uDA8A\uDA8B\uDA8C\uDA8D\uDA8E\uDA8F\uDA90\uDA91\uDA92\uDA93\uDA94\uDA95\uDA96\uDA97\uDA98\uDA99\uDA9A\uDA9B\uDA9C\uDA9D\uDA9E\uDA9F\uDAA0\uDAA1\uDAA2\uDAA3\uDAA4\uDAA5\uDAA6\uDAA7\uDAA8\uDAA9\uDAAA\uDAAB\uDAAC\uDAAD\uDAAE\uDAAF\uDAB0\uDAB1\uDAB2\uDAB3\uDAB4\uDAB5\uDAB6\uDAB7\uDAB8\uDAB9\uDABA\uDABB\uDABC\uDABD\uDABE\uDABF\uDAC0\uDAC1\uDAC2\uDAC3\uDAC4\uDAC5\uDAC6\uDAC7\uDAC8\uDAC9\uDACA\uDACB\uDACC\uDACD\uDACE\uDACF\uDAD0\uDAD1\uDAD2\uDAD3\uDAD4\uDAD5\uDAD6\uDAD7\uDAD8\uDAD9\uDADA\uDADB\uDADC\uDADD\uDADE\uDADF\uDAE0\uDAE1\uDAE2\uDAE3\uDAE4\uDAE5\uDAE6\uDAE7\uDAE8\uDAE9\uDAEA\uDAEB\uDAEC\uDAED\uDAEE\uDAEF\uDAF0\uDAF1\uDAF2\uDAF3\uDAF4\uDAF5\uDAF6\uDAF7\uDAF8\uDAF9\uDAFA\uDAFB\uDAFC\uDAFD\uDAFE\uDAFF\uDB00\uDB01\uDB02\uDB03\uDB04\uDB05\uDB06\uDB07\uDB08\uDB09\uDB0A\uDB0B\uDB0C\uDB0D\uDB0E\uDB0F\uDB10\uDB11\uDB12\uDB13\uDB14\uDB15\uDB16\uDB17\uDB18\uDB19\uDB1A\uDB1B\uDB1C\uDB1D\uDB1E\uDB1F\uDB20\uDB21\uDB22\uDB23\uDB24\uDB25\uDB26\uDB27\uDB28\uDB29\uDB2A\uDB2B\uDB2C\uDB2D\uDB2E\uDB2F\uDB30\uDB31\uDB32\uDB33\uDB34\uDB35\uDB36\uDB37\uDB38\uDB39\uDB3A\uDB3B\uDB3C\uDB3D\uDB3E\uDB3F\uDB40\uDB41\uDB42\uDB43\uDB44\uDB45\uDB46\uDB47\uDB48\uDB49\uDB4A\uDB4B\uDB4C\uDB4D\uDB4E\uDB4F\uDB50\uDB51\uDB52\uDB53\uDB54\uDB55\uDB56\uDB57\uDB58\uDB59\uDB5A\uDB5B\uDB5C\uDB5D\uDB5E\uDB5F\uDB60\uDB61\uDB62\uDB63\uDB64\uDB65\uDB66\uDB67\uDB68\uDB69\uDB6A\uDB6B\uDB6C\uDB6D\uDB6E\uDB6F\uDB70\uDB71\uDB72\uDB73\uDB74\uDB75\uDB76\uDB77\uDB78\uDB79\uDB7A\uDB7B\uDB7C\uDB7D\uDB7E\uDB7F\uDB80\uDB81\uDB82\uDB83\uDB84\uDB85\uDB86\uDB87\uDB88\uDB89\uDB8A\uDB8B\uDB8C\uDB8D\uDB8E\uDB8F\uDB90\uDB91\uDB92\uDB93\uDB94\uDB95\uDB96\uDB97\uDB98\uDB99\uDB9A\uDB9B\uDB9C\uDB9D\uDB9E\uDB9F\uDBA0\uDBA1\uDBA2\uDBA3\uDBA4\uDBA5\uDBA6\uDBA7\uDBA8\uDBA9\uDBAA\uDBAB\uDBAC\uDBAD\uDBAE\uDBAF\uDBB0\uDBB1\uDBB2\uDBB3\uDBB4\uDBB5\uDBB6\uDBB7\uDBB8\uDBB9\uDBBA\uDBBB\uDBBC\uDBBD\uDBBE\uDBBF\uDBC0\uDBC1\uDBC2\uDBC3\uDBC4\uDBC5\uDBC6\uDBC7\uDBC8\uDBC9\uDBCA\uDBCB\uDBCC\uDBCD\uDBCE\uDBCF\uDBD0\uDBD1\uDBD2\uDBD3\uDBD4\uDBD5\uDBD6\uDBD7\uDBD8\uDBD9\uDBDA\uDBDB\uDBDC\uDBDD\uDBDE\uDBDF\uDBE0\uDBE1\uDBE2\uDBE3\uDBE4\uDBE5\uDBE6\uDBE7\uDBE8\uDBE9\uDBEA\uDBEB\uDBEC\uDBED\uDBEE\uDBEF\uDBF0\uDBF1\uDBF2\uDBF3\uDBF4\uDBF5\uDBF6\uDBF7\uDBF8\uDBF9\uDBFA\uDBFB\uDBFC\uDBFD\uDBFE\uDBFF"
type LowSurrogates =
  "\uDC00\uDC01\uDC02\uDC03\uDC04\uDC05\uDC06\uDC07\uDC08\uDC09\uDC0A\uDC0B\uDC0C\uDC0D\uDC0E\uDC0F\uDC10\uDC11\uDC12\uDC13\uDC14\uDC15\uDC16\uDC17\uDC18\uDC19\uDC1A\uDC1B\uDC1C\uDC1D\uDC1E\uDC1F\uDC20\uDC21\uDC22\uDC23\uDC24\uDC25\uDC26\uDC27\uDC28\uDC29\uDC2A\uDC2B\uDC2C\uDC2D\uDC2E\uDC2F\uDC30\uDC31\uDC32\uDC33\uDC34\uDC35\uDC36\uDC37\uDC38\uDC39\uDC3A\uDC3B\uDC3C\uDC3D\uDC3E\uDC3F\uDC40\uDC41\uDC42\uDC43\uDC44\uDC45\uDC46\uDC47\uDC48\uDC49\uDC4A\uDC4B\uDC4C\uDC4D\uDC4E\uDC4F\uDC50\uDC51\uDC52\uDC53\uDC54\uDC55\uDC56\uDC57\uDC58\uDC59\uDC5A\uDC5B\uDC5C\uDC5D\uDC5E\uDC5F\uDC60\uDC61\uDC62\uDC63\uDC64\uDC65\uDC66\uDC67\uDC68\uDC69\uDC6A\uDC6B\uDC6C\uDC6D\uDC6E\uDC6F\uDC70\uDC71\uDC72\uDC73\uDC74\uDC75\uDC76\uDC77\uDC78\uDC79\uDC7A\uDC7B\uDC7C\uDC7D\uDC7E\uDC7F\uDC80\uDC81\uDC82\uDC83\uDC84\uDC85\uDC86\uDC87\uDC88\uDC89\uDC8A\uDC8B\uDC8C\uDC8D\uDC8E\uDC8F\uDC90\uDC91\uDC92\uDC93\uDC94\uDC95\uDC96\uDC97\uDC98\uDC99\uDC9A\uDC9B\uDC9C\uDC9D\uDC9E\uDC9F\uDCA0\uDCA1\uDCA2\uDCA3\uDCA4\uDCA5\uDCA6\uDCA7\uDCA8\uDCA9\uDCAA\uDCAB\uDCAC\uDCAD\uDCAE\uDCAF\uDCB0\uDCB1\uDCB2\uDCB3\uDCB4\uDCB5\uDCB6\uDCB7\uDCB8\uDCB9\uDCBA\uDCBB\uDCBC\uDCBD\uDCBE\uDCBF\uDCC0\uDCC1\uDCC2\uDCC3\uDCC4\uDCC5\uDCC6\uDCC7\uDCC8\uDCC9\uDCCA\uDCCB\uDCCC\uDCCD\uDCCE\uDCCF\uDCD0\uDCD1\uDCD2\uDCD3\uDCD4\uDCD5\uDCD6\uDCD7\uDCD8\uDCD9\uDCDA\uDCDB\uDCDC\uDCDD\uDCDE\uDCDF\uDCE0\uDCE1\uDCE2\uDCE3\uDCE4\uDCE5\uDCE6\uDCE7\uDCE8\uDCE9\uDCEA\uDCEB\uDCEC\uDCED\uDCEE\uDCEF\uDCF0\uDCF1\uDCF2\uDCF3\uDCF4\uDCF5\uDCF6\uDCF7\uDCF8\uDCF9\uDCFA\uDCFB\uDCFC\uDCFD\uDCFE\uDCFF\uDD00\uDD01\uDD02\uDD03\uDD04\uDD05\uDD06\uDD07\uDD08\uDD09\uDD0A\uDD0B\uDD0C\uDD0D\uDD0E\uDD0F\uDD10\uDD11\uDD12\uDD13\uDD14\uDD15\uDD16\uDD17\uDD18\uDD19\uDD1A\uDD1B\uDD1C\uDD1D\uDD1E\uDD1F\uDD20\uDD21\uDD22\uDD23\uDD24\uDD25\uDD26\uDD27\uDD28\uDD29\uDD2A\uDD2B\uDD2C\uDD2D\uDD2E\uDD2F\uDD30\uDD31\uDD32\uDD33\uDD34\uDD35\uDD36\uDD37\uDD38\uDD39\uDD3A\uDD3B\uDD3C\uDD3D\uDD3E\uDD3F\uDD40\uDD41\uDD42\uDD43\uDD44\uDD45\uDD46\uDD47\uDD48\uDD49\uDD4A\uDD4B\uDD4C\uDD4D\uDD4E\uDD4F\uDD50\uDD51\uDD52\uDD53\uDD54\uDD55\uDD56\uDD57\uDD58\uDD59\uDD5A\uDD5B\uDD5C\uDD5D\uDD5E\uDD5F\uDD60\uDD61\uDD62\uDD63\uDD64\uDD65\uDD66\uDD67\uDD68\uDD69\uDD6A\uDD6B\uDD6C\uDD6D\uDD6E\uDD6F\uDD70\uDD71\uDD72\uDD73\uDD74\uDD75\uDD76\uDD77\uDD78\uDD79\uDD7A\uDD7B\uDD7C\uDD7D\uDD7E\uDD7F\uDD80\uDD81\uDD82\uDD83\uDD84\uDD85\uDD86\uDD87\uDD88\uDD89\uDD8A\uDD8B\uDD8C\uDD8D\uDD8E\uDD8F\uDD90\uDD91\uDD92\uDD93\uDD94\uDD95\uDD96\uDD97\uDD98\uDD99\uDD9A\uDD9B\uDD9C\uDD9D\uDD9E\uDD9F\uDDA0\uDDA1\uDDA2\uDDA3\uDDA4\uDDA5\uDDA6\uDDA7\uDDA8\uDDA9\uDDAA\uDDAB\uDDAC\uDDAD\uDDAE\uDDAF\uDDB0\uDDB1\uDDB2\uDDB3\uDDB4\uDDB5\uDDB6\uDDB7\uDDB8\uDDB9\uDDBA\uDDBB\uDDBC\uDDBD\uDDBE\uDDBF\uDDC0\uDDC1\uDDC2\uDDC3\uDDC4\uDDC5\uDDC6\uDDC7\uDDC8\uDDC9\uDDCA\uDDCB\uDDCC\uDDCD\uDDCE\uDDCF\uDDD0\uDDD1\uDDD2\uDDD3\uDDD4\uDDD5\uDDD6\uDDD7\uDDD8\uDDD9\uDDDA\uDDDB\uDDDC\uDDDD\uDDDE\uDDDF\uDDE0\uDDE1\uDDE2\uDDE3\uDDE4\uDDE5\uDDE6\uDDE7\uDDE8\uDDE9\uDDEA\uDDEB\uDDEC\uDDED\uDDEE\uDDEF\uDDF0\uDDF1\uDDF2\uDDF3\uDDF4\uDDF5\uDDF6\uDDF7\uDDF8\uDDF9\uDDFA\uDDFB\uDDFC\uDDFD\uDDFE\uDDFF\uDE00\uDE01\uDE02\uDE03\uDE04\uDE05\uDE06\uDE07\uDE08\uDE09\uDE0A\uDE0B\uDE0C\uDE0D\uDE0E\uDE0F\uDE10\uDE11\uDE12\uDE13\uDE14\uDE15\uDE16\uDE17\uDE18\uDE19\uDE1A\uDE1B\uDE1C\uDE1D\uDE1E\uDE1F\uDE20\uDE21\uDE22\uDE23\uDE24\uDE25\uDE26\uDE27\uDE28\uDE29\uDE2A\uDE2B\uDE2C\uDE2D\uDE2E\uDE2F\uDE30\uDE31\uDE32\uDE33\uDE34\uDE35\uDE36\uDE37\uDE38\uDE39\uDE3A\uDE3B\uDE3C\uDE3D\uDE3E\uDE3F\uDE40\uDE41\uDE42\uDE43\uDE44\uDE45\uDE46\uDE47\uDE48\uDE49\uDE4A\uDE4B\uDE4C\uDE4D\uDE4E\uDE4F\uDE50\uDE51\uDE52\uDE53\uDE54\uDE55\uDE56\uDE57\uDE58\uDE59\uDE5A\uDE5B\uDE5C\uDE5D\uDE5E\uDE5F\uDE60\uDE61\uDE62\uDE63\uDE64\uDE65\uDE66\uDE67\uDE68\uDE69\uDE6A\uDE6B\uDE6C\uDE6D\uDE6E\uDE6F\uDE70\uDE71\uDE72\uDE73\uDE74\uDE75\uDE76\uDE77\uDE78\uDE79\uDE7A\uDE7B\uDE7C\uDE7D\uDE7E\uDE7F\uDE80\uDE81\uDE82\uDE83\uDE84\uDE85\uDE86\uDE87\uDE88\uDE89\uDE8A\uDE8B\uDE8C\uDE8D\uDE8E\uDE8F\uDE90\uDE91\uDE92\uDE93\uDE94\uDE95\uDE96\uDE97\uDE98\uDE99\uDE9A\uDE9B\uDE9C\uDE9D\uDE9E\uDE9F\uDEA0\uDEA1\uDEA2\uDEA3\uDEA4\uDEA5\uDEA6\uDEA7\uDEA8\uDEA9\uDEAA\uDEAB\uDEAC\uDEAD\uDEAE\uDEAF\uDEB0\uDEB1\uDEB2\uDEB3\uDEB4\uDEB5\uDEB6\uDEB7\uDEB8\uDEB9\uDEBA\uDEBB\uDEBC\uDEBD\uDEBE\uDEBF\uDEC0\uDEC1\uDEC2\uDEC3\uDEC4\uDEC5\uDEC6\uDEC7\uDEC8\uDEC9\uDECA\uDECB\uDECC\uDECD\uDECE\uDECF\uDED0\uDED1\uDED2\uDED3\uDED4\uDED5\uDED6\uDED7\uDED8\uDED9\uDEDA\uDEDB\uDEDC\uDEDD\uDEDE\uDEDF\uDEE0\uDEE1\uDEE2\uDEE3\uDEE4\uDEE5\uDEE6\uDEE7\uDEE8\uDEE9\uDEEA\uDEEB\uDEEC\uDEED\uDEEE\uDEEF\uDEF0\uDEF1\uDEF2\uDEF3\uDEF4\uDEF5\uDEF6\uDEF7\uDEF8\uDEF9\uDEFA\uDEFB\uDEFC\uDEFD\uDEFE\uDEFF\uDF00\uDF01\uDF02\uDF03\uDF04\uDF05\uDF06\uDF07\uDF08\uDF09\uDF0A\uDF0B\uDF0C\uDF0D\uDF0E\uDF0F\uDF10\uDF11\uDF12\uDF13\uDF14\uDF15\uDF16\uDF17\uDF18\uDF19\uDF1A\uDF1B\uDF1C\uDF1D\uDF1E\uDF1F\uDF20\uDF21\uDF22\uDF23\uDF24\uDF25\uDF26\uDF27\uDF28\uDF29\uDF2A\uDF2B\uDF2C\uDF2D\uDF2E\uDF2F\uDF30\uDF31\uDF32\uDF33\uDF34\uDF35\uDF36\uDF37\uDF38\uDF39\uDF3A\uDF3B\uDF3C\uDF3D\uDF3E\uDF3F\uDF40\uDF41\uDF42\uDF43\uDF44\uDF45\uDF46\uDF47\uDF48\uDF49\uDF4A\uDF4B\uDF4C\uDF4D\uDF4E\uDF4F\uDF50\uDF51\uDF52\uDF53\uDF54\uDF55\uDF56\uDF57\uDF58\uDF59\uDF5A\uDF5B\uDF5C\uDF5D\uDF5E\uDF5F\uDF60\uDF61\uDF62\uDF63\uDF64\uDF65\uDF66\uDF67\uDF68\uDF69\uDF6A\uDF6B\uDF6C\uDF6D\uDF6E\uDF6F\uDF70\uDF71\uDF72\uDF73\uDF74\uDF75\uDF76\uDF77\uDF78\uDF79\uDF7A\uDF7B\uDF7C\uDF7D\uDF7E\uDF7F\uDF80\uDF81\uDF82\uDF83\uDF84\uDF85\uDF86\uDF87\uDF88\uDF89\uDF8A\uDF8B\uDF8C\uDF8D\uDF8E\uDF8F\uDF90\uDF91\uDF92\uDF93\uDF94\uDF95\uDF96\uDF97\uDF98\uDF99\uDF9A\uDF9B\uDF9C\uDF9D\uDF9E\uDF9F\uDFA0\uDFA1\uDFA2\uDFA3\uDFA4\uDFA5\uDFA6\uDFA7\uDFA8\uDFA9\uDFAA\uDFAB\uDFAC\uDFAD\uDFAE\uDFAF\uDFB0\uDFB1\uDFB2\uDFB3\uDFB4\uDFB5\uDFB6\uDFB7\uDFB8\uDFB9\uDFBA\uDFBB\uDFBC\uDFBD\uDFBE\uDFBF\uDFC0\uDFC1\uDFC2\uDFC3\uDFC4\uDFC5\uDFC6\uDFC7\uDFC8\uDFC9\uDFCA\uDFCB\uDFCC\uDFCD\uDFCE\uDFCF\uDFD0\uDFD1\uDFD2\uDFD3\uDFD4\uDFD5\uDFD6\uDFD7\uDFD8\uDFD9\uDFDA\uDFDB\uDFDC\uDFDD\uDFDE\uDFDF\uDFE0\uDFE1\uDFE2\uDFE3\uDFE4\uDFE5\uDFE6\uDFE7\uDFE8\uDFE9\uDFEA\uDFEB\uDFEC\uDFED\uDFEE\uDFEF\uDFF0\uDFF1\uDFF2\uDFF3\uDFF4\uDFF5\uDFF6\uDFF7\uDFF8\uDFF9\uDFFA\uDFFB\uDFFC\uDFFD\uDFFE\uDFFF"

type IsUtf16Unit<Alphabet extends string, Unit extends string> = Alphabet extends `${string}${Unit}${string}` ? true
  : false

type FirstCodePoint<S extends string> = S extends `${infer Head}${infer Next}${infer Rest}`
  ? IsUtf16Unit<HighSurrogates, Head> extends true
    ? IsUtf16Unit<LowSurrogates, Next> extends true ? [`${Head}${Next}`, Rest]
    : [Head, `${Next}${Rest}`]
  : [Head, `${Next}${Rest}`]
  : S extends `${infer Head}${infer Rest}` ? [Head, Rest]
  : [S, ""]

/**
 * Capitalizes the first Unicode code point of a string type.
 *
 * **Details**
 *
 * TypeScript 5.9's `Capitalize` rewrites one UTF-16 code unit. `Uppercase`
 * rewrites a whole code point, which is the mapping `toUpperCase` uses at
 * runtime. This type splits off one code point, including a surrogate pair,
 * then applies `Uppercase`.
 *
 * **Example** (Capitalizing an astral letter at the type level)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * type Result = String.Capitalize<"𐐨foo"> // "𐐀foo"
 *
 * const witness: Result = "𐐀foo"
 * ```
 *
 * @stability stable
 * @category models
 * @since 4.0.5
 */
export type Capitalize<A extends string> = A extends unknown ? string extends A ? A
  : FirstCodePoint<A> extends [infer First extends string, infer Rest extends string] ? `${Uppercase<First>}${Rest}`
  : A
  : never

/**
 * Uncapitalizes the first Unicode code point of a string type.
 *
 * **Details**
 *
 * TypeScript 5.9's `Uncapitalize` rewrites one UTF-16 code unit. `Lowercase`
 * rewrites a whole code point, which is the mapping `toLowerCase` uses at
 * runtime. This type splits off one code point, including a surrogate pair,
 * then applies `Lowercase`.
 *
 * **Example** (Uncapitalizing an astral letter at the type level)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * type Result = String.Uncapitalize<"𐐀FOO"> // "𐐨FOO"
 *
 * const witness: Result = "𐐨FOO"
 * ```
 *
 * @stability stable
 * @category models
 * @since 4.0.5
 */
export type Uncapitalize<A extends string> = A extends unknown ? string extends A ? A
  : FirstCodePoint<A> extends [infer First extends string, infer Rest extends string] ? `${Lowercase<First>}${Rest}`
  : A
  : never

const mapFirstCodePoint = (self: string, transform: (first: string) => string): string => {
  const codePoint = self.codePointAt(0)
  if (codePoint === undefined) {
    return self
  }
  const first = String.fromCodePoint(codePoint)
  return transform(first) + self.slice(first.length)
}

/**
 * Capitalizes the first Unicode code point in a string.
 *
 * **Details**
 *
 * The first character is one code point. An astral letter such as `"𐐨"` is two
 * UTF-16 code units and is cased as one character.
 *
 * **Example** (Capitalizing a string)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("abc", String.capitalize) // => "Abc"
 * String.capitalize("hello") // => "Hello"
 * String.capitalize("𐐨foo") // => "𐐀foo"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const capitalize = <T extends string>(self: T): Capitalize<T> =>
  mapFirstCodePoint(self, toUpperCase) as Capitalize<T>

/**
 * Uncapitalizes the first Unicode code point in a string.
 *
 * **Details**
 *
 * The first character is one code point. An astral letter such as `"𐐀"` is two
 * UTF-16 code units and is cased as one character.
 *
 * **Example** (Uncapitalizing a string)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("ABC", String.uncapitalize) // => "aBC"
 * String.uncapitalize("Hello") // => "hello"
 * String.uncapitalize("𐐀FOO") // => "𐐨FOO"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const uncapitalize = <T extends string>(self: T): Uncapitalize<T> =>
  mapFirstCodePoint(self, toLowerCase) as Uncapitalize<T>

/**
 * Replaces matches in a string using `String.prototype.replace`.
 *
 * **Details**
 *
 * String search values and non-global regular expressions replace the first
 * match; global regular expressions replace every match.
 *
 * **Example** (Replacing a substring)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("abc", String.replace("b", "d")) // => "adc"
 * pipe("hello world", String.replace("world", "Effect")) // => "hello Effect"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const replace = (searchValue: string | RegExp, replaceValue: string) => (self: string): string =>
  self.replace(searchValue, replaceValue)

/**
 * Type-level representation of trimming whitespace from both ends of a string.
 *
 * **Example** (Trimming whitespace at the type level)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * type Result = String.Trim<"  hello  "> // "hello"
 *
 * const witness: Result = "hello"
 * ```
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export type Trim<A extends string> = TrimEnd<TrimStart<A>>

/**
 * Removes whitespace from both ends of a string.
 *
 * **Example** (Trimming whitespace)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.trim(" a ") // => "a"
 * String.trim("  hello world  ") // => "hello world"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const trim = <A extends string>(self: A): Trim<A> => self.trim() as Trim<A>

/**
 * Type-level representation of trimming whitespace from the start of a string.
 *
 * **Example** (Trimming leading whitespace at the type level)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * type Result = String.TrimStart<"  hello"> // "hello"
 *
 * const witness: Result = "hello"
 * ```
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export type TrimStart<A extends string> = A extends `${" " | "\n" | "\t" | "\r"}${infer B}` ? TrimStart<B> : A

/**
 * Removes whitespace from the start of a string.
 *
 * **Example** (Trimming leading whitespace)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.trimStart(" a ") // => "a "
 * String.trimStart("  hello world") // => "hello world"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const trimStart = <A extends string>(self: A): TrimStart<A> => self.trimStart() as TrimStart<A>

/**
 * Type-level representation of trimming whitespace from the end of a string.
 *
 * **Example** (Trimming trailing whitespace at the type level)
 *
 * ```ts import.meta.vitest
 * import type { String } from "effect"
 *
 * type Result = String.TrimEnd<"hello  "> // "hello"
 *
 * const witness: Result = "hello"
 * ```
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export type TrimEnd<A extends string> = A extends `${infer B}${" " | "\n" | "\t" | "\r"}` ? TrimEnd<B> : A

/**
 * Removes whitespace from the end of a string.
 *
 * **Example** (Trimming trailing whitespace)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.trimEnd(" a ") // => " a"
 * String.trimEnd("hello world  ") // => "hello world"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const trimEnd = <A extends string>(self: A): TrimEnd<A> => self.trimEnd() as TrimEnd<A>

/**
 * Extracts a section of a string and returns it as a new string.
 *
 * **Example** (Slicing strings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("abcd", String.slice(1, 3)) // => "bc"
 * pipe("hello world", String.slice(0, 5)) // => "hello"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const slice = (start?: number, end?: number) => (self: string): string => self.slice(start, end)

/**
 * Checks whether a `string` is empty.
 *
 * **Example** (Checking for empty strings)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.isEmpty("") // => true
 * String.isEmpty("a") // => false
 * ```
 *
 * @stability stable
 * @category guards
 * @since 2.0.0
 */
export const isEmpty = (self: string): self is "" => self.length === 0

/**
 * Checks whether a `string` is non-empty.
 *
 * **Example** (Checking for non-empty strings)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.isNonEmpty("") // => false
 * String.isNonEmpty("a") // => true
 * ```
 *
 * @stability stable
 * @category predicates
 * @since 2.0.0
 */
export const isNonEmpty = (self: string): boolean => self.length > 0

/**
 * Returns the JavaScript string length, measured in UTF-16 code units.
 *
 * **Example** (Getting string length)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.length("abc") // => 3
 * ```
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const length = (self: string): number => self.length

/**
 * Splits a string into an array of substrings using a separator.
 *
 * **Example** (Splitting strings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("abc", String.split("")) // => ["a", "b", "c"]
 * pipe("", String.split("")) // => [""]
 * String.split("hello,world", ",") // => ["hello", "world"]
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const split: {
  (separator: string | RegExp): (self: string) => NonEmptyArray<string>
  (self: string, separator: string | RegExp): NonEmptyArray<string>
} = dual(2, (self: string, separator: string | RegExp): NonEmptyArray<string> => {
  const out = self.split(separator)
  return readonlyArray.isArrayNonEmpty(out) ? out : [self]
})

/**
 * Returns `true` if `searchString` appears as a substring of `self`, at one or more positions that are
 * greater than or equal to `position`; otherwise, returns `false`.
 *
 * **Example** (Checking for substrings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("hello world", String.includes("world")) // => true
 * pipe("hello world", String.includes("foo")) // => false
 * ```
 *
 * @stability stable
 * @category predicates
 * @since 2.0.0
 */
export const includes = (searchString: string, position?: number) => (self: string): boolean =>
  self.includes(searchString, position)

/**
 * Returns `true` if the string starts with the specified search string.
 *
 * **Example** (Checking string prefixes)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("hello world", String.startsWith("hello")) // => true
 * pipe("hello world", String.startsWith("world")) // => false
 * ```
 *
 * @stability stable
 * @category predicates
 * @since 2.0.0
 */
export const startsWith = (searchString: string, position?: number) => (self: string): boolean =>
  self.startsWith(searchString, position)

/**
 * Returns `true` if the string ends with the specified search string.
 *
 * **Example** (Checking string suffixes)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("hello world", String.endsWith("world")) // => true
 * pipe("hello world", String.endsWith("hello")) // => false
 * ```
 *
 * @stability stable
 * @category predicates
 * @since 2.0.0
 */
export const endsWith = (searchString: string, position?: number) => (self: string): boolean =>
  self.endsWith(searchString, position)

/**
 * Returns the character code at the specified index safely, or `None` if the index is out of bounds.
 *
 * **Example** (Reading character codes)
 *
 * ```ts import.meta.vitest
 * import { Option, String } from "effect"
 *
 * String.charCodeAt("abc", 1) // => Option.some(98)
 * String.charCodeAt("abc", 4) // => Option.none()
 * ```
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const charCodeAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
} = dual(
  2,
  (self: string, index: number): Option.Option<number> =>
    Option.filter(Option.some(self.charCodeAt(index)), (charCode) => !isNaN(charCode))
)

/**
 * Extracts characters from a string between two specified indices.
 *
 * **Example** (Extracting substrings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("abcd", String.substring(1)) // => "bcd"
 * pipe("abcd", String.substring(1, 3)) // => "bc"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const substring = (start: number, end?: number) => (self: string): string => self.substring(start, end)

/**
 * Returns the character at the specified relative index safely, or `None` if the index is out of bounds.
 *
 * **Example** (Accessing characters safely)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe("abc", String.at(1)) // => Option.some("b")
 * pipe("abc", String.at(4)) // => Option.none()
 * ```
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const at: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
} = dual(2, (self: string, index: number): Option.Option<string> => Option.fromUndefinedOr(self.at(index)))

/**
 * Returns the character at the specified non-negative index safely, or `None` if the index is out of bounds.
 *
 * **Example** (Reading characters safely)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe("abc", String.charAt(1)) // => Option.some("b")
 * pipe("abc", String.charAt(4)) // => Option.none()
 * ```
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const charAt: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
} = dual(
  2,
  (self: string, index: number): Option.Option<string> => Option.filter(Option.some(self.charAt(index)), isNonEmpty)
)

/**
 * Returns the Unicode code point at the specified index safely, or `None` if the index is out of bounds.
 *
 * **Example** (Reading code points)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe("abc", String.codePointAt(1)) // => Option.some(98)
 * pipe("abc", String.codePointAt(10)) // => Option.none()
 * ```
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const codePointAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
} = dual(2, (self: string, index: number): Option.Option<number> => Option.fromUndefinedOr(self.codePointAt(index)))

/**
 * Returns the index of the first occurrence of a substring safely, or `None` if not found.
 *
 * **Example** (Finding the first substring index)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe("abbbc", String.indexOf("b")) // => Option.some(1)
 * pipe("abbbc", String.indexOf("z")) // => Option.none()
 * ```
 *
 * @stability stable
 * @category searching
 * @since 2.0.0
 */
export const indexOf = (searchString: string) => (self: string): Option.Option<number> =>
  Option.filter(Option.some(self.indexOf(searchString)), number.isGreaterThanOrEqualTo(0))

/**
 * Returns the index of the last occurrence of a substring safely, or `None` if not found.
 *
 * **Example** (Finding the last substring index)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe("abbbc", String.lastIndexOf("b")) // => Option.some(3)
 * pipe("abbbc", String.lastIndexOf("d")) // => Option.none()
 * ```
 *
 * @stability stable
 * @category searching
 * @since 2.0.0
 */
export const lastIndexOf = (searchString: string) => (self: string): Option.Option<number> =>
  Option.filter(Option.some(self.lastIndexOf(searchString)), number.isGreaterThanOrEqualTo(0))

/**
 * Computes locale-aware ordering for two strings, with optional locales and
 * collator options, and returns the result as an `Ordering` (`-1`, `0`, or
 * `1`).
 *
 * **Example** (Comparing strings by locale)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("a", String.localeCompare("b")) // => -1
 * pipe("b", String.localeCompare("a")) // => 1
 * pipe("a", String.localeCompare("a")) // => 0
 * ```
 *
 * @stability stable
 * @category comparisons
 * @since 2.0.0
 */
export const localeCompare =
  (that: string, locales?: Array<string>, options?: Intl.CollatorOptions) => (self: string): Ordering.Ordering =>
    number.sign(self.localeCompare(that, locales, options))

/**
 * Matches a string against a pattern safely and returns `Option.some` with the match
 * array, or `Option.none` when the pattern does not match.
 *
 * **Example** (Matching regular expressions)
 *
 * ```ts import.meta.vitest
 * import { Option, pipe, String } from "effect"
 *
 * pipe(
 *   "hello",
 *   String.match(/l+/),
 *   Option.map((match) => [match[0], match.index])
 * ) // => Option.some(["ll", 2])
 * pipe("hello", String.match(/x/)) // => Option.none()
 * ```
 *
 * @stability stable
 * @category searching
 * @since 2.0.0
 */
export const match = (regExp: RegExp | string) => (self: string): Option.Option<RegExpMatchArray> =>
  Option.fromNullOr(self.match(regExp))

/**
 * Returns an iterator over all regular expression matches in the string using
 * native `String.prototype.matchAll` semantics.
 *
 * **Example** (Iterating regular expression matches)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * const matches = pipe("hello world", String.matchAll(/l/g))
 *
 * Array.from(matches, (match) => [match[0], match.index]) // => [["l", 2], ["l", 3], ["l", 9]]
 * ```
 *
 * @stability stable
 * @category searching
 * @since 2.0.0
 */
export const matchAll = (regExp: RegExp) => (self: string): IterableIterator<RegExpMatchArray> => self.matchAll(regExp)

/**
 * Normalizes a string according to the specified Unicode normalization form.
 *
 * **Example** (Normalizing Unicode strings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * const str = "\u1E9B\u0323"
 * Array.from(pipe(str, String.normalize()), (character) => character.codePointAt(0)) // => [0x1e9b, 0x323]
 * Array.from(pipe(str, String.normalize("NFC")), (character) => character.codePointAt(0)) // => [0x1e9b, 0x323]
 * Array.from(
 *   pipe(str, String.normalize("NFD")),
 *   (character) => character.codePointAt(0)
 * ) // => [0x17f, 0x323, 0x307]
 * Array.from(pipe(str, String.normalize("NFKC")), (character) => character.codePointAt(0)) // => [0x1e69]
 * Array.from(
 *   pipe(str, String.normalize("NFKD")),
 *   (character) => character.codePointAt(0)
 * ) // => [0x73, 0x323, 0x307]
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const normalize = (form?: "NFC" | "NFD" | "NFKC" | "NFKD") => (self: string): string => self.normalize(form)

/**
 * Pads the string from the end with a given fill string to a specified length.
 *
 * **Example** (Padding strings at the end)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("a", String.padEnd(5)) // => "a    "
 * pipe("a", String.padEnd(5, "_")) // => "a____"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const padEnd = (maxLength: number, fillString?: string) => (self: string): string =>
  self.padEnd(maxLength, fillString)

/**
 * Pads the string from the start with a given fill string to a specified length.
 *
 * **Example** (Padding strings at the start)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("a", String.padStart(5)) // => "    a"
 * pipe("a", String.padStart(5, "_")) // => "____a"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const padStart = (maxLength: number, fillString?: string) => (self: string): string =>
  self.padStart(maxLength, fillString)

/**
 * Repeats the string the specified number of times.
 *
 * **Details**
 *
 * `count` is rounded down. `NaN` and non-positive values are treated as `0`.
 *
 * **Example** (Repeating strings)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("a", String.repeat(5)) // => "aaaaa"
 * pipe("hello", String.repeat(3)) // => "hellohellohello"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const repeat = (count: number) => (self: string): string => self.repeat(Count.normalize(count))

/**
 * Replaces all occurrences of a substring or pattern in a string.
 *
 * **Example** (Replacing all matches)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * pipe("ababb", String.replaceAll("b", "c")) // => "acacc"
 * pipe("ababb", String.replaceAll(/ba/g, "cc")) // => "accbb"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const replaceAll = (searchValue: string | RegExp, replaceValue: string) => (self: string): string =>
  self.replaceAll(searchValue, replaceValue)

/**
 * Returns the index of the first match for a string or regular expression safely, or
 * `Option.none` when no match is found.
 *
 * **Example** (Searching strings)
 *
 * ```ts import.meta.vitest
 * import { Option, String } from "effect"
 *
 * String.search("ababb", "b") // => Option.some(1)
 * String.search("ababb", /abb/) // => Option.some(2)
 * String.search("ababb", "d") // => Option.none()
 * ```
 *
 * @stability stable
 * @category searching
 * @since 2.0.0
 */
export const search: {
  (regExp: RegExp | string): (self: string) => Option.Option<number>
  (self: string, regExp: RegExp | string): Option.Option<number>
} = dual(
  2,
  (self: string, regExp: RegExp | string): Option.Option<number> =>
    Option.filter(Option.some(self.search(regExp)), number.isGreaterThanOrEqualTo(0))
)

/**
 * Converts the string to lowercase according to the specified locale.
 *
 * **Example** (Lowercasing strings by locale)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * const str = "\u0130"
 * pipe(str, String.toLocaleLowerCase("tr")) // => "i"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const toLocaleLowerCase = (locale?: string | Array<string>) => (self: string): string =>
  self.toLocaleLowerCase(locale)

/**
 * Converts the string to uppercase according to the specified locale.
 *
 * **Example** (Uppercasing strings by locale)
 *
 * ```ts import.meta.vitest
 * import { pipe, String } from "effect"
 *
 * const str = "i\u0307"
 * pipe(str, String.toLocaleUpperCase("lt-LT")) // => "I"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const toLocaleUpperCase = (locale?: string | Array<string>) => (self: string): string =>
  self.toLocaleUpperCase(locale)

/**
 * Keeps the specified number of characters from the start of a string.
 *
 * **Details**
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, including `NaN`, an empty string will be
 * returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 *
 * **Example** (Taking characters from the start)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.takeLeft("Hello World", 5) // => "Hello"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const takeLeft: {
  (n: number): (self: string) => string
  (self: string, n: number): string
} = dual(2, (self: string, n: number): string => self.slice(0, Count.normalize(n)))

/**
 * Keeps the specified number of characters from the end of a string.
 *
 * **Details**
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, including `NaN`, an empty string will be
 * returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 *
 * **Example** (Taking characters from the end)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.takeRight("Hello World", 5) // => "World"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const takeRight: {
  (n: number): (self: string) => string
  (self: string, n: number): string
} = dual(
  2,
  (self: string, n: number): string => self.slice(self.length - Math.min(Count.normalize(n), self.length), Infinity)
)

const CR = 0x0d
const LF = 0x0a

/**
 * Returns an `IterableIterator` which yields each line contained within the
 * string, trimming off the trailing newline character.
 *
 * **Example** (Iterating lines without separators)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * Array.from(String.linesIterator("hello\nworld\n")) // => ["hello", "world"]
 * ```
 *
 * @stability stable
 * @category splitting
 * @since 2.0.0
 */
export const linesIterator = (self: string): LinesIterator => linesSeparated(self, true)

/**
 * Returns an `IterableIterator` which yields each line contained within the
 * string as well as the trailing newline character.
 *
 * **Example** (Iterating lines with separators)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * Array.from(String.linesWithSeparators("hello\nworld\n")) // => ["hello\n", "world\n"]
 * ```
 *
 * @stability stable
 * @category splitting
 * @since 2.0.0
 */
export const linesWithSeparators = (s: string): LinesIterator => linesSeparated(s, false)

/**
 * Strips a leading margin prefix from every line using the supplied margin
 * character.
 *
 * **Example** (Stripping custom margins)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.stripMarginWith("  |hello\n  |world", "|") // => "hello\nworld"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const stripMarginWith: {
  (marginChar: string): (self: string) => string
  (self: string, marginChar: string): string
} = dual(2, (self: string, marginChar: string): string => {
  let out = ""

  for (const line of linesWithSeparators(self)) {
    let index = 0

    while (index < line.length && line.charAt(index) <= " ") {
      index = index + 1
    }

    const stripped = index < line.length && line.charAt(index) === marginChar
      ? line.substring(index + 1)
      : line

    out = out + stripped
  }

  return out
})

/**
 * Strips a leading `|` margin prefix from every line.
 *
 * **Example** (Stripping pipe margins)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.stripMargin("  |hello\n  |world") // => "hello\nworld"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const stripMargin = (self: string): string => stripMarginWith(self, "|")

/**
 * Converts a snake_case string to camelCase.
 *
 * **Details**
 *
 * Keeps the first character, then replaces each later underscore and the
 * character after it with that character uppercased. A trailing underscore is
 * dropped. Input made only of an even number of underscores returns `""`.
 *
 * **Example** (Converting snake_case to camelCase)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.snakeToCamel("hello_world") // => "helloWorld"
 * String.snakeToCamel("foo_bar_baz") // => "fooBarBaz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const snakeToCamel = (self: string): string => {
  if (self.length === 0 || (self.length % 2 === 0 && self[0] === "_" && /^_+$/.test(self))) return ""
  let str = self[0]
  for (let i = 1; i < self.length; i++) {
    str += self[i] === "_" ? self.charAt(++i).toUpperCase() : self[i]
  }
  return str
}

/**
 * Converts a snake_case string to PascalCase.
 *
 * **Details**
 *
 * Uppercases the first character, then replaces each later underscore and the
 * character after it with that character uppercased. A trailing underscore is
 * dropped. Input made only of an even number of underscores returns `""`.
 *
 * **Example** (Converting snake_case to PascalCase)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.snakeToPascal("hello_world") // => "HelloWorld"
 * String.snakeToPascal("foo_bar_baz") // => "FooBarBaz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const snakeToPascal = (self: string): string => {
  if (self.length === 0 || (self.length % 2 === 0 && self[0] === "_" && /^_+$/.test(self))) return ""
  let str = self[0].toUpperCase()
  for (let i = 1; i < self.length; i++) {
    str += self[i] === "_" ? self.charAt(++i).toUpperCase() : self[i]
  }
  return str
}

/**
 * Converts a snake_case string to kebab-case.
 *
 * **Example** (Converting snake_case to kebab-case)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.snakeToKebab("hello_world") // => "hello-world"
 * String.snakeToKebab("foo_bar_baz") // => "foo-bar-baz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const snakeToKebab = (self: string): string => self.replace(/_/g, "-")

/**
 * Converts a camelCase string to snake_case.
 *
 * **Example** (Converting camelCase to snake_case)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.camelToSnake("helloWorld") // => "hello_world"
 * String.camelToSnake("fooBarBaz") // => "foo_bar_baz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const camelToSnake = (self: string): string => self.replace(/([A-Z])/g, "_$1").toLowerCase()

/**
 * Converts a PascalCase string to snake_case.
 *
 * **Example** (Converting PascalCase to snake_case)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.pascalToSnake("HelloWorld") // => "hello_world"
 * String.pascalToSnake("FooBarBaz") // => "foo_bar_baz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const pascalToSnake = (self: string): string =>
  (self.slice(0, 1) + self.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase()

/**
 * Converts a kebab-case string to snake_case.
 *
 * **Example** (Converting kebab-case to snake_case)
 *
 * ```ts import.meta.vitest
 * import { String } from "effect"
 *
 * String.kebabToSnake("hello-world") // => "hello_world"
 * String.kebabToSnake("foo-bar-baz") // => "foo_bar_baz"
 * ```
 *
 * @stability stable
 * @category transforming
 * @since 2.0.0
 */
export const kebabToSnake = (self: string): string => self.replace(/-/g, "_")

class LinesIterator implements IterableIterator<string> {
  private index: number
  private readonly length: number
  readonly s: string
  readonly stripped: boolean

  constructor(
    s: string,
    stripped: boolean = false
  ) {
    this.s = s
    this.stripped = stripped
    this.index = 0
    this.length = s.length
  }

  next(): IteratorResult<string> {
    if (this.done) {
      return { done: true, value: undefined }
    }
    const start = this.index
    while (!this.done && !isLineBreak(this.s[this.index]!)) {
      this.index = this.index + 1
    }
    let end = this.index
    if (!this.done) {
      const char = this.s[this.index]!
      this.index = this.index + 1
      if (!this.done && isLineBreak2(char, this.s[this.index]!)) {
        this.index = this.index + 1
      }
      if (!this.stripped) {
        end = this.index
      }
    }
    return { done: false, value: this.s.substring(start, end) }
  }

  [Symbol.iterator](): IterableIterator<string> {
    return new LinesIterator(this.s, this.stripped)
  }

  private get done(): boolean {
    return this.index >= this.length
  }
}

/**
 * Checks whether the provided character is a line break character (i.e. either `"\r"`
 * or `"\n"`).
 */
const isLineBreak = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code === CR || code === LF
}

/**
 * Checks whether the provided characters combine to form a carriage return/line-feed
 * (i.e. `"\r\n"`).
 */
const isLineBreak2 = (char0: string, char1: string): boolean => char0.charCodeAt(0) === CR && char1.charCodeAt(0) === LF

const linesSeparated = (self: string, stripped: boolean): LinesIterator => new LinesIterator(self, stripped)

/**
 * Normalizes a string by splitting it into word parts, transforming each part,
 * and joining the parts with a configurable delimiter.
 *
 * **When to use**
 *
 * Use when you need custom word-case output with a delimiter or part transform
 * that the fixed case helpers do not provide.
 *
 * @see {@link pascalCase} for fixed PascalCase output
 * @see {@link camelCase} for fixed lower-initial camelCase output
 * @see {@link constantCase} for fixed uppercase underscore-separated output
 * @see {@link kebabCase} for fixed lowercase hyphen-separated output
 * @see {@link snakeCase} for fixed lowercase underscore-separated output
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const noCase: {
  (options?: {
    readonly splitRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
    readonly stripRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
    readonly delimiter?: string | undefined
    readonly transform?: (part: string, index: number, parts: ReadonlyArray<string>) => string
  }): (self: string) => string
  (self: string, options?: {
    readonly splitRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
    readonly stripRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
    readonly delimiter?: string | undefined
    readonly transform?: (part: string, index: number, parts: ReadonlyArray<string>) => string
  }): string
} = dual((args) => typeof args[0] === "string", (input: string, options?: {
  readonly splitRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
  readonly stripRegExp?: RegExp | ReadonlyArray<RegExp> | undefined
  readonly delimiter?: string | undefined
  readonly transform?: (part: string, index: number, parts: ReadonlyArray<string>) => string
}): string => {
  const splitRegExp = toRegExpArray(options?.splitRegExp ?? SPLIT_REGEXP)
  const stripRegExp = toRegExpArray(options?.stripRegExp ?? STRIP_REGEXP)
  const delimiter = options?.delimiter ?? " "
  const transform = options?.transform ?? toLowerCase
  return normalizeCase(input, splitRegExp, stripRegExp, delimiter, transform)
})

const toRegExpArray = (regexp: RegExp | ReadonlyArray<RegExp>): ReadonlyArray<RegExp> =>
  predicate.isRegExp(regexp) ? [regexp] : regexp

const normalizeCase = (
  input: string,
  splitRegExp: ReadonlyArray<RegExp>,
  stripRegExp: ReadonlyArray<RegExp>,
  delimiter: string,
  transform: (part: string, index: number, parts: ReadonlyArray<string>) => string
): string => {
  let result = input
  for (const regexp of splitRegExp) {
    result = result.replace(regexp, "$1\0$2")
  }
  for (const regexp of stripRegExp) {
    result = result.replace(regexp, "\0")
  }
  let start = 0
  let end = result.length
  // Trim the delimiter from around the output string.
  while (result.charAt(start) === "\0") {
    start++
  }
  while (result.charAt(end - 1) === "\0") {
    end--
  }
  if (start >= end) return ""

  // Transform each token independently.
  return result.slice(start, end).split("\0").map(transform).join(delimiter)
}

// Support camel case ("camelCase" -> "camel Case" and "CAMELCase" -> "CAMEL Case")
// and digit boundaries ("camel2case" -> "camel 2 case").
const SPLIT_REGEXP = [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g, /([A-Z])([0-9])/gi, /([0-9])([A-Z])/gi]

// Config paths preserve digit groups such as "v2" while still supporting camel case.
const CONFIG_SPLIT_REGEXP = [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g]

// Remove all non-word characters.
const STRIP_REGEXP = /[^A-Z0-9]+/gi

const pascalCaseTransform = (input: string): string => {
  const firstChar = input.charAt(0)
  const lowerChars = input.substring(1).toLowerCase()
  return `${firstChar.toUpperCase()}${lowerChars}`
}

/**
 * Converts a string to PascalCase.
 *
 * **When to use**
 *
 * Use to normalize strings from spaces, separators, or camel/Pascal word
 * boundaries into PascalCase.
 *
 * @see {@link camelCase} for lower-initial camelCase output
 * @see {@link noCase} for configurable delimiters and part transforms
 * @see {@link snakeToPascal} for converting known snake_case input only
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const pascalCase: (self: string) => string = noCase({
  delimiter: "",
  transform: pascalCaseTransform
})

const camelCaseTransform = (input: string, index: number): string =>
  index === 0
    ? input.toLowerCase()
    : pascalCaseTransform(input)

/**
 * Converts a string to camelCase.
 *
 * **When to use**
 *
 * Use to normalize mixed word separators or existing PascalCase/camelCase text
 * into lower-initial camelCase identifiers.
 *
 * @see {@link noCase} for configurable delimiters and part transforms
 * @see {@link pascalCase} for upper-initial PascalCase output
 * @see {@link snakeCase} for lowercase underscore-separated output
 * @see {@link kebabCase} for lowercase hyphen-separated output
 * @see {@link constantCase} for uppercase underscore-separated output
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const camelCase: (self: string) => string = noCase({
  delimiter: "",
  transform: camelCaseTransform
})

/**
 * Converts a string to CONSTANT_CASE (uppercase with underscores).
 *
 * **When to use**
 *
 * Use to normalize words from mixed input formats into uppercase,
 * underscore-separated identifiers.
 *
 * @see {@link snakeCase} for lowercase underscore-separated output
 * @see {@link kebabCase} for lowercase hyphen-separated output
 * @see {@link camelCase} for lower-initial camelCase output
 * @see {@link pascalCase} for upper-initial PascalCase output
 * @see {@link configCase} for configuration key casing that preserves numeric word groups
 * @see {@link noCase} for configurable delimiters and part transforms
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const constantCase: (self: string) => string = noCase({
  delimiter: "_",
  transform: toUpperCase
})

/**
 * Converts a string to CONFIG_CASE (uppercase with underscores) for
 * configuration keys.
 *
 * **When to use**
 *
 * Use to normalize configuration path segments into environment-variable-like
 * keys while preserving numeric word groups such as `v2`.
 *
 * **Details**
 *
 * Unlike {@link constantCase}, digit-letter boundaries are not split. For
 * example, `"api-v2 xml"` becomes `"API_V2_XML"`.
 *
 * @see {@link constantCase} for standard uppercase underscore-separated output
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const configCase: (self: string) => string = (self) =>
  normalizeCase(self, CONFIG_SPLIT_REGEXP, [STRIP_REGEXP], "_", toUpperCase)

/**
 * Converts a string to kebab-case (lowercase with hyphens).
 *
 * **When to use**
 *
 * Use to normalize free-form labels, identifiers, or keys into lowercase
 * hyphen-separated text.
 *
 * @see {@link noCase} for configurable delimiters and part transforms
 * @see {@link snakeCase} for lowercase underscore-separated output
 * @see {@link constantCase} for uppercase underscore-separated output
 * @see {@link camelCase} for lower-initial camelCase output
 * @see {@link pascalCase} for upper-initial PascalCase output
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const kebabCase: (self: string) => string = noCase({
  delimiter: "-"
})

/**
 * Converts a string to snake_case (lowercase with underscores).
 *
 * **When to use**
 *
 * Use to normalize mixed-case or separator-delimited text into lowercase words
 * joined with underscores.
 *
 * @see {@link noCase} for configurable lower-level normalization
 * @see {@link kebabCase} for lowercase hyphen-separated output
 * @see {@link constantCase} for uppercase underscore-separated output
 *
 * @stability stable
 * @category transforming
 * @since 4.0.0
 */
export const snakeCase: (self: string) => string = noCase({
  delimiter: "_"
})

/**
 * Reducer for concatenating `string`s.
 *
 * **When to use**
 *
 * Use to concatenate many strings through APIs that consume a `Reducer`.
 *
 * **Details**
 *
 * The reducer starts from `""`, so combining an empty collection returns `""`.
 *
 * @see {@link concat} for concatenating two strings directly
 *
 * @stability stable
 * @category combining
 * @since 4.0.0
 */
export const ReducerConcat: Reducer.Reducer<string> = Reducer.make((a, b) => a + b, "")
