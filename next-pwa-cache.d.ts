declare module "next-pwa/cache.js" {
  import type { RuntimeCaching } from "workbox-build";
  const runtimeCaching: RuntimeCaching[];
  export default runtimeCaching;
}
