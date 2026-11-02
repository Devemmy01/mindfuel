/** The "send test notification" tool exists outside production only. */
export function testPushEnabled() {
  return process.env.VERCEL_ENV !== "production" && process.env.ENABLE_TEST_PUSH !== "0";
}
