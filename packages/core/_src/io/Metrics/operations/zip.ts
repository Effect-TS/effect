/**
 * @tsplus fluent ets/Metrics/Metric zip
 */
export function zip_<Type, In, Out, Type2, In2, Out2>(
  self: Metric<Type, In, Out>,
  that: Metric<Type2, In2, Out2>
): Metric<Tuple<[Type, Type2]>, Tuple<[In, In2]>, Tuple<[Out, Out2]>> {
  return Metric(
    Tuple(self.keyType, that.keyType),
    (input: Tuple<[In, In2]>, extraTags) => {
      const { tuple: [l, r] } = input;
      self.unsafeUpdate(l, extraTags);
      that.unsafeUpdate(r, extraTags);
    },
    (extraTags) => Tuple(self.unsafeValue(extraTags), that.unsafeValue(extraTags))
  );
}

/**
 * @tsplus static ets/Metrics/Metric/Aspects zip
 */
export const zip = Pipeable(zip_);
