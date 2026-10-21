/**
 * SMS delivery capabilities and messages.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Required SMS transport. Acceptance is not confirmation of delivery to the handset.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SmsDelivery,
  /**
   * Recipient, message identifier, and redacted body submitted to an SMS provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SmsMessage
} from "./internal/sms/smsDelivery.ts"
