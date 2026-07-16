import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

function adminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return initializeApp({
    projectId,
    credential: clientEmail && privateKey
      ? cert({ projectId, clientEmail, privateKey })
      : applicationDefault(),
  });
}

export async function requireFirebaseUser(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    return await getAuth(adminApp()).verifyIdToken(token, true);
  } catch {
    return null;
  }
}

export async function verifyFirebaseToken(token: string) {
  if (!token) return null;
  try {
    return await getAuth(adminApp()).verifyIdToken(token, true);
  } catch {
    return null;
  }
}
