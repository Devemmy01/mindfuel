import webpush from "web-push";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    "mailto:hello@mind-fuel.app",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn("VAPID keys are not fully defined in environment variables");
}

export default webpush;
