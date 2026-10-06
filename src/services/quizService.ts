import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QuizQuestion } from '../data/wordPacks';

export interface RoomData {
  pin: string;
  title: string;
  gradeLevel: string;
  status: 'waiting' | 'playing' | 'round_result' | 'finished';
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartTime: number;
  timeLimit: number;
  teacherKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface ParticipantData {
  studentKey: string;
  name: string;
  studentNum: string;
  password?: string;
  totalScore: number;
  rank: number;
  correctCount: number;
  answeredCount: number;
  lastResponse?: {
    submittedAnswer: string;
    submittedAtMs: number;
    responseTimeMs: number;
    isCorrect: boolean;
    scoreAwarded: number;
    qIndex: number;
  };
  lastActive: number;
}

export interface GameHistoryData {
  roomId: string;
  roomTitle: string;
  completedAt: number;
  totalQuestions: number;
  participantCount: number;
  topRankers: {
    studentKey: string;
    name: string;
    studentNum: string;
    totalScore: number;
    rank: number;
  }[];
}

/**
 * Score calculation based on accuracy and millisecond response speed
 * Base: 1000 points
 * Speed bonus: up to 500 points (proportional to remaining time)
 */
export function calculateQuizScore(isCorrect: boolean, responseTimeMs: number, timeLimitSeconds: number): number {
  if (!isCorrect) return 0;
  const totalMs = timeLimitSeconds * 1000;
  const remainingMs = Math.max(0, totalMs - responseTimeMs);
  const speedRatio = Math.min(1, Math.max(0, remainingMs / totalMs));
  const speedBonus = Math.round(speedRatio * 500);
  return 1000 + speedBonus;
}

// Generate random PIN (e.g. 6-digit number)
export function generateRoomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new Quiz Room with Questions in subcollection
export async function createQuizRoom(
  pin: string,
  title: string,
  gradeLevel: string,
  questions: QuizQuestion[],
  timeLimit: number = 20,
  teacherKey: string = 'teacher_' + Date.now()
): Promise<string> {
  const roomId = pin;
  const roomPath = `rooms/${roomId}`;

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc: RoomData = {
      pin,
      title,
      gradeLevel,
      status: 'waiting',
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      questionStartTime: 0,
      timeLimit,
      teacherKey,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(roomRef, roomDoc);

    // Save questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qDocRef = doc(db, 'rooms', roomId, 'questions', `q_${i}`);
      await setDoc(qDocRef, {
        qIndex: i,
        word: q.word.toUpperCase().trim(),
        meaning: q.meaning,
        initialHint: q.initialHint,
        koreanInitialHint: q.koreanInitialHint,
        alphabetBlocks: q.alphabetBlocks,
        limitTime: q.limitTime || timeLimit,
        exampleSentence: q.exampleSentence || ''
      });
    }

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, roomPath);
  }
}

// Join room for student
export async function joinQuizRoom(
  pin: string,
  studentNum: string,
  name: string,
  password: string = 'pass123'
): Promise<{ success: boolean; studentKey: string; message?: string }> {
  const roomId = pin.trim();
  const roomPath = `rooms/${roomId}`;

  try {
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
      return { success: false, studentKey: '', message: '입력하신 PIN 번호의 방을 찾을 수 없습니다.' };
    }

    const cleanNum = studentNum.trim();
    const cleanName = name.trim();
    // Unique key: num_name normalized
    const studentKey = `${cleanNum}_${cleanName}`.replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_');
    const participantPath = `rooms/${roomId}/participants/${studentKey}`;
    const participantRef = doc(db, 'rooms', roomId, 'participants', studentKey);

    const existingSnap = await getDoc(participantRef);
    if (existingSnap.exists()) {
      // Re-joining student
      const existingData = existingSnap.data() as ParticipantData;
      if (existingData.password && existingData.password !== password) {
        return {
          success: false,
          studentKey,
          message: '이미 등록된 학번/이름입니다. 설정한 비밀번호가 일치하지 않습니다.'
        };
      }
      // Update heartbeat
      await updateDoc(participantRef, {
        lastActive: Date.now()
      });
      return { success: true, studentKey };
    }

    // New student participant
    const newParticipant: ParticipantData = {
      studentKey,
      name: cleanName,
      studentNum: cleanNum,
      password,
      totalScore: 0,
      rank: 1,
      correctCount: 0,
      answeredCount: 0,
      lastActive: Date.now()
    };

    await setDoc(participantRef, newParticipant);
    return { success: true, studentKey };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, roomPath);
  }
}

// Student submit answer
export async function submitQuizAnswer(
  roomId: string,
  studentKey: string,
  answer: string,
  responseTimeMs: number,
  qIndex: number,
  correctWord: string,
  timeLimit: number
): Promise<{ isCorrect: boolean; score: number }> {
  const participantPath = `rooms/${roomId}/participants/${studentKey}`;
  const isCorrect = answer.trim().toUpperCase() === correctWord.trim().toUpperCase();
  const score = calculateQuizScore(isCorrect, responseTimeMs, timeLimit);

  try {
    const pRef = doc(db, 'rooms', roomId, 'participants', studentKey);
    const snap = await getDoc(pRef);
    if (!snap.exists()) return { isCorrect, score };

    const current = snap.data() as ParticipantData;
    const newTotalScore = current.totalScore + score;
    const newCorrectCount = current.correctCount + (isCorrect ? 1 : 0);
    const newAnsweredCount = current.answeredCount + 1;

    await updateDoc(pRef, {
      totalScore: newTotalScore,
      correctCount: newCorrectCount,
      answeredCount: newAnsweredCount,
      lastResponse: {
        submittedAnswer: answer.trim().toUpperCase(),
        submittedAtMs: Date.now(),
        responseTimeMs,
        isCorrect,
        scoreAwarded: score,
        qIndex
      },
      lastActive: Date.now()
    });

    return { isCorrect, score };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, participantPath);
  }
}

// Update room status / round
export async function updateQuizRoomStatus(
  roomId: string,
  updates: Partial<RoomData>
): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// Real-time listener for Room doc
export function subscribeToRoom(
  roomId: string,
  onData: (room: RoomData | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as RoomData);
      } else {
        onData(null);
      }
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    }
  );
}

// Real-time listener for Participants in Room
export function subscribeToParticipants(
  roomId: string,
  onData: (participants: ParticipantData[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const participantsRef = collection(db, 'rooms', roomId, 'participants');
  return onSnapshot(
    participantsRef,
    (snap) => {
      const list: ParticipantData[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ParticipantData);
      });
      // Sort by score descending
      list.sort((a, b) => b.totalScore - a.totalScore);
      // Compute ranks
      list.forEach((p, idx) => {
        p.rank = idx + 1;
      });
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/participants`);
    }
  );
}

// Get all questions in room
export async function getRoomQuestions(roomId: string): Promise<QuizQuestion[]> {
  const qPath = `rooms/${roomId}/questions`;
  try {
    const qCol = collection(db, 'rooms', roomId, 'questions');
    const snap = await getDocs(qCol);
    const questions: QuizQuestion[] = [];
    snap.forEach((d) => {
      questions.push(d.data() as QuizQuestion);
    });
    questions.sort((a, b) => a.qIndex - b.qIndex);
    return questions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, qPath);
  }
}

// Save Game History when finished
export async function saveGameHistory(
  roomId: string,
  roomTitle: string,
  questionsCount: number,
  participants: ParticipantData[]
): Promise<void> {
  const historyPath = `history/${roomId}`;
  try {
    const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore);
    const historyRef = doc(db, 'history', roomId);
    const historyDoc: GameHistoryData = {
      roomId,
      roomTitle,
      completedAt: Date.now(),
      totalQuestions: questionsCount,
      participantCount: participants.length,
      topRankers: sorted.slice(0, 10).map((p, idx) => ({
        studentKey: p.studentKey,
        name: p.name,
        studentNum: p.studentNum,
        totalScore: p.totalScore,
        rank: idx + 1
      }))
    };
    await setDoc(historyRef, historyDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, historyPath);
  }
}
