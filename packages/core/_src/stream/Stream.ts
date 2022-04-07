// codegen:start {preset: barrel, include: ./Stream/*.ts, exclude: ./Stream/+(A|B|C|D|E|F|G|H|I|L|M|N|O|P|Q|R|S|T|U|V|W|Z|J|Y|K|W)*.ts, prefix: "@effect/core/stream"}
export * from "@effect/core/stream/Stream/definition";
export * from "@effect/core/stream/Stream/operations";
// codegen:end

export * as Emit from "@effect/core/stream/Stream/Emit";
export * as SinkEndReason from "@effect/core/stream/Stream/SinkEndReason";
export * as TerminationStrategy from "@effect/core/stream/Stream/TerminationStrategy";
