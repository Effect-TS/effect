import { Both, Die, Stackless, Then } from "@effect-ts/core/io/Cause/definition";

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`, return only
 * `Die` cause/finalizer defects.
 *
 * @tsplus fluent ets/Cause keepDefects
 */
export function keepDefects<E>(self: Cause<E>): Option<Cause<never>> {
  return self.fold<E, Option<Cause<never>>>(
    () => Option.none,
    () => Option.none,
    (e, trace) => Option.some(new Die(e, trace)),
    () => Option.none,
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Then(left.value, right.value));
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value);
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value);
      }
      if (left._tag === "None" && right._tag === "None") {
        return Option.none;
      }
      throw new Error("Bug");
    },
    (left, right) => {
      if (left._tag === "Some" && right._tag === "Some") {
        return Option.some(new Both(left.value, right.value));
      }
      if (left._tag === "Some" && right._tag === "None") {
        return Option.some(left.value);
      }
      if (left._tag === "None" && right._tag === "Some") {
        return Option.some(right.value);
      }
      if (left._tag === "None" && right._tag === "None") {
        return Option.none;
      }
      throw new Error("Bug");
    },
    (causeOption, stackless) => causeOption.map((cause) => new Stackless(cause, stackless))
  );
}
