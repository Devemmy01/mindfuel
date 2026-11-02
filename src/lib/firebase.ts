/**
 * The Firebase client SDK is loaded after first paint instead of in every
 * page's initial bundle. AuthProvider starts the load on mount, so by the time
 * someone taps "Sign in" the module is ready and the popup opens inside the
 * click (browsers block popups opened after an await).
 */
export type FirebaseClient = typeof import("./firebase-client");

let client: FirebaseClient | null = null;
let pending: Promise<FirebaseClient> | null = null;

export function loadFirebase() {
  pending ??= import("./firebase-client").then((module) => (client = module));
  return pending;
}

/** The SDK if it has already loaded, for code that must stay synchronous. */
export function loadedFirebase() {
  return client;
}
