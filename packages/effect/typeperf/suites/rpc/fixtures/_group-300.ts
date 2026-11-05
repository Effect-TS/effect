// Shared RPC group with 300 same-shaped RPCs.
import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"

class Failure extends Schema.TaggedError<Failure>()("Failure", {
  code: Schema.String
}) {}

export const Rpcs = RpcGroup.make(
  Rpc.make("Rpc000", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc001", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc002", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc003", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc004", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc005", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc006", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc007", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc008", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc009", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc010", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc011", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc012", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc013", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc014", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc015", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc016", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc017", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc018", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc019", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc020", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc021", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc022", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc023", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc024", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc025", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc026", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc027", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc028", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc029", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc030", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc031", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc032", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc033", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc034", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc035", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc036", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc037", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc038", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc039", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc040", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc041", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc042", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc043", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc044", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc045", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc046", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc047", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc048", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc049", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc050", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc051", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc052", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc053", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc054", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc055", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc056", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc057", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc058", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc059", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc060", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc061", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc062", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc063", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc064", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc065", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc066", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc067", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc068", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc069", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc070", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc071", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc072", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc073", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc074", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc075", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc076", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc077", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc078", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc079", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc080", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc081", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc082", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc083", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc084", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc085", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc086", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc087", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc088", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc089", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc090", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc091", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc092", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc093", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc094", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc095", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc096", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc097", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc098", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc099", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc100", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc101", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc102", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc103", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc104", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc105", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc106", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc107", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc108", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc109", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc110", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc111", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc112", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc113", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc114", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc115", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc116", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc117", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc118", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc119", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc120", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc121", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc122", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc123", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc124", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc125", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc126", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc127", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc128", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc129", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc130", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc131", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc132", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc133", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc134", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc135", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc136", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc137", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc138", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc139", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc140", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc141", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc142", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc143", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc144", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc145", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc146", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc147", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc148", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc149", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc150", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc151", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc152", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc153", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc154", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc155", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc156", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc157", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc158", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc159", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc160", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc161", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc162", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc163", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc164", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc165", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc166", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc167", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc168", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc169", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc170", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc171", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc172", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc173", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc174", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc175", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc176", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc177", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc178", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc179", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc180", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc181", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc182", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc183", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc184", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc185", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc186", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc187", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc188", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc189", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc190", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc191", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc192", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc193", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc194", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc195", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc196", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc197", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc198", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc199", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc200", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc201", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc202", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc203", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc204", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc205", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc206", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc207", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc208", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc209", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc210", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc211", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc212", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc213", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc214", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc215", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc216", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc217", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc218", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc219", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc220", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc221", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc222", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc223", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc224", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc225", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc226", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc227", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc228", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc229", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc230", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc231", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc232", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc233", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc234", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc235", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc236", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc237", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc238", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc239", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc240", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc241", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc242", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc243", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc244", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc245", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc246", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc247", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc248", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc249", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc250", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc251", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc252", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc253", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc254", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc255", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc256", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc257", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc258", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc259", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc260", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc261", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc262", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc263", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc264", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc265", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc266", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc267", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc268", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc269", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc270", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc271", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc272", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc273", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc274", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc275", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc276", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc277", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc278", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc279", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc280", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc281", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc282", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc283", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc284", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc285", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc286", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc287", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc288", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc289", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc290", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc291", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc292", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc293", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc294", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc295", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc296", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc297", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc298", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  }),
  Rpc.make("Rpc299", {
    payload: { id: Schema.String, n: Schema.Number },
    success: Schema.Struct({ id: Schema.String, at: Schema.Number }),
    error: Failure
  })
)
