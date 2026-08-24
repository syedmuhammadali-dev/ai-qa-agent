import "server-only";

import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { type Auth, getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export const isFirebaseAdminConfigured = Boolean(
  projectId && clientEmail && privateKey,
);
export const isFirebaseStorageConfigured = Boolean(
  isFirebaseAdminConfigured && storageBucket,
);

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;
let adminBucket: Bucket | undefined;

function getAdminApp(): App {
  if (!isFirebaseAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }
  if (!adminApp) {
    adminApp = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket,
        });
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) adminDb = getFirestore(getAdminApp());
  return adminDb;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(getAdminApp());
  return adminAuth;
}

export function getAdminBucket(): Bucket {
  if (!isFirebaseStorageConfigured) {
    throw new Error(
      "Firebase Storage is not configured (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET missing).",
    );
  }
  if (!adminBucket) adminBucket = getStorage(getAdminApp()).bucket();
  return adminBucket;
}
