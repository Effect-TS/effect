/**
 * Creates a sink containing the first value.
 *
 * @tsplus static ets/Sink/Ops head
 */
export function head<In>(
  __tsplusTrace?: string
): Sink<unknown, never, In, In, Option<In>> {
  return Sink.fold(
    Option.emptyOf<In>(),
    (option: Option<In>) => option.isNone(),
    (option: Option<In>, input) => (option.isSome() ? option : Option.some(input))
  );
}
