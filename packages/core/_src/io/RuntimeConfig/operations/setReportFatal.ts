/**
 * @tsplus static effect/core/io/RuntimeConfig.Aspects setReportFatal
 * @tsplus pipeable effect/core/io/RuntimeConfig setReportFatal
 */
export function setReportFatal(reportFatal: (defect: unknown) => void) {
  return (self: RuntimeConfig): RuntimeConfig => self.copy({ reportFatal })
}
