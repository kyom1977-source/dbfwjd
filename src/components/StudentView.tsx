import React, { useState, useEffect, useRef } from 'react';
import {
  LogIn,
  Send,
  Delete,
  RotateCcw,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Volume2,
  VolumeX,
  Flame,
  Award,
  Zap,
  UserCheck
} from 'lucide-react';
import {
  RoomData,
  ParticipantData,
  joinQuizRoom,
  submitQuizAnswer,
  subscribeToRoom,
  subscribeToParticipants,
  getRoomQuestions
} from '../services/quizService';
import { QuizQuestion } from '../data/wordPacks';
import { soundManager } from '../utils/sound';

interface StudentViewProps {
  initialPin?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  initialPin = '',
  soundEnabled,
  onToggleSound
}) => {
  // Login form state
  const [pin, setPin] = useState<string>(initialPin);
  const [studentNum, setStudentNum] = useState<string>('2026-2-15');
  const [name, setName] = useState<string>('김민준');
  const [password, setPassword] = useState<string>('pass123');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Active student session state
  const [joinedRoomId, setJoinedRoomId] = useState<string>('');
  const [studentKey, setStudentKey] = useState<string>('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Word building state for active question
  const [placedLetters, setPlacedLetters] = useState<string[]>([]);
  const [availableBlocks, setAvailableBlocks] = useState<{ id: string; letter: string; isUsed: boolean }[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ isCorrect: boolean; score: number; responseTime: number } | null>(null);
  const [showKoreanHint, setShowKoreanHint] = useState<boolean>(false);

  // Millisecond timer tracking
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Update PIN if initialPin changes
  useEffect(() => {
    if (initialPin && !joinedRoomId) {
      setPin(initialPin);
    }
  }, [initialPin, joinedRoomId]);

  // Subscriptions when joined
  useEffect(() => {
    if (!joinedRoomId) return;

    const unsubRoom = subscribeToRoom(joinedRoomId, (data) => {
      setRoomData(data);
    });

    const unsubParticipants = subscribeToParticipants(joinedRoomId, (list) => {
      setParticipants(list);
    });

    getRoomQuestions(joinedRoomId).then((qList) => {
      if (qList && qList.length > 0) {
        setQuestions(qList);
      }
    });

    return () => {
      unsubRoom();
      unsubParticipants();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [joinedRoomId]);

  // Current Question
  const currentQIndex = roomData?.currentQuestionIndex ?? 0;
  const currentQuestion: QuizQuestion | undefined = questions[currentQIndex];

  // Self participant data
  const myParticipant = participants.find((p) => p.studentKey === studentKey);

  // Handle Question Changes: Reset block slots when new question starts
  useEffect(() => {
    if (!roomData || roomData.status !== 'playing' || !currentQuestion) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    // Reset local answer state
    setPlacedLetters([]);
    setIsSubmitted(false);
    setSubmissionFeedback(null);
    setShowKoreanHint(false);

    // Prepare available blocks with unique ids
    const blocks = currentQuestion.alphabetBlocks.map((letter, idx) => ({
      id: `${letter}_${idx}`,
      letter,
      isUsed: false
    }));
    setAvailableBlocks(blocks);

    // Track response time in ms
    const startMs = Date.now();
    setQuestionStartTime(startMs);

    const tick = () => {
      setElapsedMs(Date.now() - startMs);
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [roomData?.status, roomData?.currentQuestionIndex, currentQuestion?.word]);

  // Keydown listener for physical keyboard support
  useEffect(() => {
    if (!roomData || roomData.status !== 'playing' || isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleRemoveLastLetter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAnswer();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase();
        // Find unused block with this letter
        const block = availableBlocks.find((b) => !b.isUsed && b.letter === char);
        if (block) {
          handleSelectBlock(block.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roomData?.status, isSubmitted, availableBlocks, placedLetters]);

  // Handle Join Room
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setErrorMessage('PIN 번호와 이름을 모두 입력해 주세요.');
      return;
    }

    setIsJoining(true);
    setErrorMessage('');

    try {
      const res = await joinQuizRoom(pin.trim(), studentNum.trim(), name.trim(), password);
      if (res.success) {
        setJoinedRoomId(pin.trim());
        setStudentKey(res.studentKey);
        soundManager.playRoundStart();
      } else {
        setErrorMessage(res.message || '입장에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMessage('입장 처리 중 오류가 발생했습니다: ' + (err?.message || ''));
    } finally {
      setIsJoining(false);
    }
  };

  // Block Selection
  const handleSelectBlock = (blockId: string) => {
    if (isSubmitted) return;
    const targetBlock = availableBlocks.find((b) => b.id === blockId);
    if (!targetBlock || targetBlock.isUsed) return;

    soundManager.playBlockTap();

    // Mark as used
    setAvailableBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, isUsed: true } : b))
    );
    // Add to placed letters
    setPlacedLetters((prev) => [...prev, targetBlock.letter]);
  };

  // Remove letter slot
  const handleRemoveLetterAt = (index: number) => {
    if (isSubmitted) return;
    const letterToRemove = placedLetters[index];
    if (!letterToRemove) return;

    soundManager.playBlockTap();

    // Remove from placed
    const newPlaced = [...placedLetters];
    newPlaced.splice(index, 1);
    setPlacedLetters(newPlaced);

    // Unmark the first used block with this letter
    const blockToFree = availableBlocks.find(
      (b) => b.isUsed && b.letter === letterToRemove
    );
    if (blockToFree) {
      setAvailableBlocks((prev) =>
        prev.map((b) => (b.id === blockToFree.id ? { ...b, isUsed: false } : b))
      );
    }
  };

  const handleRemoveLastLetter = () => {
    if (placedLetters.length > 0) {
      handleRemoveLetterAt(placedLetters.length - 1);
    }
  };

  const handleClearAll = () => {
    if (isSubmitted) return;
    soundManager.playBlockTap();
    setPlacedLetters([]);
    setAvailableBlocks((prev) => prev.map((b) => ({ ...b, isUsed: false })));
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (isSubmitted || !currentQuestion || !joinedRoomId || !studentKey) return;

    const answer = placedLetters.join('').toUpperCase().trim();
    if (!answer) return;

    setIsSubmitted(true);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const responseTimeMs = Math.max(500, Date.now() - questionStartTime);
    const limit = currentQuestion.limitTime || roomData?.timeLimit || 20;

    try {
      const result = await submitQuizAnswer(
        joinedRoomId,
        studentKey,
        answer,
        responseTimeMs,
        currentQIndex,
        currentQuestion.word,
        limit
      );

      if (result.isCorrect) {
        soundManager.playCorrect();
      } else {
        soundManager.playWrong();
      }

      setSubmissionFeedback({
        isCorrect: result.isCorrect,
        score: result.score,
        responseTime: responseTimeMs
      });
    } catch (err) {
      console.error('Submit answer error:', err);
    }
  };

  // -------------------------------------------------------------
  // RENDER 1: STUDENT LOGIN SCREEN
  // -------------------------------------------------------------
  if (!joinedRoomId || !roomData) {
    return (
      <div className="max-w-md mx-auto pt-4 sm:pt-10 px-4">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
              <Zap className="w-8 h-8 text-white fill-current" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">영어 단어 퀴즈 쇼</h2>
            <p className="text-xs text-slate-300 mt-1">
              선생님 빔프로젝터에 표시된 PIN 번호로 입장하세요!
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                게임 PIN 번호 (6자리)
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="예: 724915"
                maxLength={8}
                className="w-full bg-slate-900 border-2 border-indigo-500/50 rounded-2xl px-4 py-3.5 text-center font-game text-2xl tracking-widest text-white focus:outline-none focus:border-indigo-400 transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">학번/번호</label>
                <input
                  type="text"
                  value={studentNum}
                  onChange={(e) => setStudentNum(e.target.value)}
                  placeholder="예: 2-3-15"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 김민준"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>재접속용 비밀번호 (선택)</span>
                <span className="text-[10px] text-slate-400 font-normal">팅김 시 동일 계정 보호</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50 mt-2"
            >
              <LogIn className="w-5 h-5" />
              {isJoining ? '입장 확인 중...' : '퀴즈 쇼 입장하기'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: STUDENT WAITING SCREEN (게임 시작 대기)
  // -------------------------------------------------------------
  if (roomData.status === 'waiting') {
    return (
      <div className="max-w-md mx-auto pt-6 px-4 text-center">
        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center mx-auto text-indigo-300 animate-pulse">
            <UserCheck className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              입장 완료! 준비 상태
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-3">{name} 학생 환영합니다!</h2>
            <p className="text-xs text-slate-300 mt-1">
              학번: {studentNum} | 방 번호: {roomData.pin}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 p-5 rounded-2xl">
            <h4 className="text-sm font-bold text-indigo-300 mb-1">{roomData.title}</h4>
            <p className="text-xs text-slate-400">
              선생님이 빔프로젝터에서 퀴즈를 시작하면 문제가 자동으로 나타납니다.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              선생님의 시작 신호를 기다리는 중...
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            초성 힌트와 알파벳 블록을 터치하여 단어를 빠르게 완성해보세요!
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 3: ACTIVE PLAYING QUESTION (알파벳 블록 터치 및 단어 제출)
  // -------------------------------------------------------------
  if (roomData.status === 'playing' && currentQuestion) {
    const roundLimit = currentQuestion.limitTime || roomData.timeLimit || 20;
    const remainingSeconds = Math.max(
      0,
      Math.ceil(roundLimit - elapsedMs / 1000)
    );
    const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / roundLimit) * 100));

    return (
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-4">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between bg-slate-800/80 rounded-2xl border border-slate-700 px-4 py-2.5 shadow">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
              Q{currentQIndex + 1}/{questions.length}
            </span>
            <span className="text-xs font-bold text-slate-200">{name}</span>
          </div>

          {/* Countdown timer pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border ${
              remainingSeconds <= 5
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-slate-700/80 text-white border-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingSeconds}초</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-200 ${
              remainingSeconds <= 5 ? 'bg-rose-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Prompt Card */}
        <div className="bg-slate-800/95 border border-slate-700 rounded-3xl p-5 sm:p-6 text-center shadow-xl space-y-3">
          <span className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider block">
            [한국어 뜻 힌트]
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            "{currentQuestion.meaning}"
          </h2>

          {/* Consonant Hint & Initial Letter Hint */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setShowKoreanHint(!showKoreanHint)}
              className="text-xs px-3 py-1 rounded-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 font-bold transition"
            >
              {showKoreanHint
                ? `초성: ${currentQuestion.koreanInitialHint}`
                : '💡 초성 힌트 보기'}
            </button>

            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
              {currentQuestion.initialHint}
            </span>
          </div>
        </div>

        {/* Word Answer Slots (Letter Boxes) */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-3xl p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              작성 중인 단어 ({placedLetters.length}/{currentQuestion.word.length}글자)
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleRemoveLastLetter}
                disabled={placedLetters.length === 0 || isSubmitted}
                className="text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1 disabled:opacity-40"
              >
                <Delete className="w-3.5 h-3.5" />
                지우기
              </button>
              <button
                onClick={handleClearAll}
                disabled={placedLetters.length === 0 || isSubmitted}
                className="text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </button>
            </div>
          </div>

          {/* Interactive Letter Slots */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 min-h-14 py-2">
            {Array.from({ length: Math.max(placedLetters.length, currentQuestion.word.length) }).map(
              (_, idx) => {
                const char = placedLetters[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => char && handleRemoveLetterAt(idx)}
                    disabled={!char || isSubmitted}
                    className={`w-11 h-12 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center font-game font-extrabold text-2xl transition transform active:scale-95 shadow ${
                      char
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 text-white border-2 border-indigo-400 cursor-pointer shadow-indigo-600/30'
                        : 'bg-slate-800/80 text-transparent border-2 border-dashed border-slate-700'
                    }`}
                  >
                    {char || ''}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Interactive Alphabet Blocks Pool */}
        {!isSubmitted ? (
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-4 sm:p-5 shadow-xl">
            <span className="text-[11px] font-bold text-slate-300 block mb-3 text-center">
              알파벳 블록을 터치하여 단어를 완성하세요!
            </span>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5">
              {availableBlocks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBlock(b.id)}
                  disabled={b.isUsed}
                  className={`h-12 sm:h-14 rounded-2xl font-game font-extrabold text-xl sm:text-2xl flex items-center justify-center transition-all transform active:scale-90 shadow-md ${
                    b.isUsed
                      ? 'bg-slate-900/60 text-slate-700 border border-slate-800 cursor-not-allowed opacity-30'
                      : 'bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-500/60 hover:border-indigo-400 active:bg-indigo-600'
                  }`}
                >
                  {b.letter}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitAnswer}
              disabled={placedLetters.length === 0}
              className={`w-full mt-4 py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-xl transition transform active:scale-98 ${
                placedLetters.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
              답안 제출하기 ({placedLetters.join('')})
            </button>
          </div>
        ) : (
          /* Submitted Waiting State */
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">답안 제출 완료!</h3>
            <p className="text-xs text-slate-300">
              제출한 단어:{' '}
              <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {placedLetters.join('')}
              </span>
            </p>
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
              ⚡ {(submissionFeedback?.responseTime ? submissionFeedback.responseTime / 1000 : 0).toFixed(2)}초 만에 제출!
            </div>
            <p className="text-xs text-slate-400 pt-2">
              제한시간이 끝나면 선생님 화면에서 정답과 랭킹이 공개됩니다.
            </p>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 4: ROUND RESULT SCREEN (정답 및 라운드 점수 피드백)
  // -------------------------------------------------------------
  if (roomData.status === 'round_result' && currentQuestion) {
    const lastRes = myParticipant?.lastResponse;
    const isCorrect = lastRes?.isCorrect;
    const scoreAwarded = lastRes?.scoreAwarded ?? 0;

    return (
      <div className="max-w-md mx-auto px-4 pt-4 text-center space-y-4">
        <div
          className={`rounded-3xl border p-8 shadow-2xl transition space-y-4 ${
            isCorrect
              ? 'bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40'
              : 'bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/40'
          }`}
        >
          {isCorrect ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-300 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-300">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          <div>
            <span
              className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                isCorrect
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isCorrect ? '정답입니다! 🎉' : '오답입니다 😢'}
            </span>

            <h1 className="font-game text-4xl sm:text-5xl font-extrabold text-white tracking-widest mt-3">
              {currentQuestion.word}
            </h1>
            <p className="text-base text-slate-300 font-bold mt-1">
              "{currentQuestion.meaning}"
            </p>
          </div>

          {/* Score Awarded Box */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4">
            <span className="text-[11px] text-slate-400 block font-semibold">이번 문제 획득 점수</span>
            <span
              className={`font-game text-3xl font-extrabold ${
                isCorrect ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              +{scoreAwarded.toLocaleString()}점
            </span>
            {isCorrect && lastRes?.responseTimeMs && (
              <span className="text-[11px] text-indigo-300 block mt-1">
                기본 1,000점 + 속도 보너스 {scoreAwarded - 1000}점
              </span>
            )}
          </div>

          {/* Current Total Standings */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 font-semibold block">현재 총점</span>
              <span className="font-game text-xl font-extrabold text-amber-300">
                {(myParticipant?.totalScore ?? 0).toLocaleString()}점
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 font-semibold block">현재 순위</span>
              <span className="font-game text-xl font-extrabold text-white">
                {myParticipant?.rank ?? 1}위 / {participants.length}명
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          선생님이 다음 문제로 이동하면 화면이 자동으로 전환됩니다.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 5: FINAL GAME OVER SCREEN (학생 개인 최종 성적표)
  // -------------------------------------------------------------
  if (roomData.status === 'finished') {
    const totalQ = questions.length;
    const correctQ = myParticipant?.correctCount ?? 0;
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
    const rank = myParticipant?.rank ?? 1;

    return (
      <div className="max-w-md mx-auto px-4 pt-6 text-center space-y-4">
        <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 animate-bounce">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
              최종 성적표
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-2">{name} 학생의 결과</h2>
            <p className="text-xs text-slate-400">{studentNum}</p>
          </div>

          {/* Final Rank & Total Score */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-inner">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
              최종 랭킹
            </span>
            <div className="font-game text-5xl font-extrabold text-white">
              {rank}위
            </div>
            <span className="text-xs text-slate-400">전체 {participants.length}명 중</span>

            <hr className="my-3 border-slate-800" />

            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">총 획득 점수</span>
                <span className="font-game text-2xl font-extrabold text-amber-300">
                  {(myParticipant?.totalScore ?? 0).toLocaleString()}점
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">정답률</span>
                <span className="font-game text-2xl font-extrabold text-emerald-400">
                  {accuracy}% ({correctQ}/{totalQ})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setJoinedRoomId('');
              setRoomData(null);
            }}
            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition"
          >
            새 게임 입장하기
          </button>
        </div>
      </div>
    );
  }

  return null;
};
