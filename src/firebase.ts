import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  getDocs,
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Standard OperationType for Skill Error Compliance
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Real CRUD Connection Test - Required by User Specification
export interface CrudTestResult {
  success: boolean;
  message: string;
  durationMs: number;
  stepsCompleted: string[];
  error?: string;
}

export async function runRealFirestoreCrudTest(): Promise<CrudTestResult> {
  const startTime = performance.now();
  const testId = `probe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `test_connection/${testId}`;
  const steps: string[] = [];

  try {
    const testDocRef = doc(db, 'test_connection', testId);

    // 1. Create (SET)
    await setDoc(testDocRef, {
      test: true,
      timestamp: Date.now()
    });
    steps.push('1. 문서 생성(Create/Set) 완료');

    // 2. Read (GET)
    const snapshot = await getDoc(testDocRef);
    if (!snapshot.exists() || !snapshot.data()?.test) {
      throw new Error('문서가 생성되었으나 데이터를 읽어오지 못했습니다.');
    }
    steps.push('2. 문서 읽기(Read/Get) 완료');

    // 3. Update (UPDATE)
    await updateDoc(testDocRef, {
      updated: true
    });
    steps.push('3. 문서 수정(Update) 완료');

    // 4. Delete (DELETE)
    await deleteDoc(testDocRef);
    steps.push('4. 문서 삭제(Delete) 완료');

    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: true,
      message: `Firebase Firestore CRUD 테스트 전체 성공 (${durationMs}ms)`,
      durationMs,
      stepsCompleted: steps
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    console.error('Real CRUD Test Failed:', err);
    return {
      success: false,
      message: `Firestore CRUD 테스트 실패: ${err?.message || '알 수 없는 오류'}`,
      durationMs,
      stepsCompleted: steps,
      error: err?.message
    };
  }
}
