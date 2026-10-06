import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Play,
  SkipForward,
  Users,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Award,
  Crown,
  ChevronRight,
  BookOpen,
  Settings,
  HelpCircle,
  Flame,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import {
  RoomData,
  ParticipantData,
  createQuizRoom,
  updateQuizRoomStatus,
  subscribeToRoom,
  subscribeToParticipants,
  getRoomQuestions,
  saveGameHistory,
  generateRoomPin
} from '../services/quizService';
import { PRESET_WORD_PACKS, QuizQuestion, WordPackPreset } from '../data/wordPacks';
import { runRealFirestoreCrudTest, CrudTestResult } from '../firebase';
import { soundManager } from '../utils/sound';

interface TeacherViewProps {
  initialRoomId?: string;
  onRoomCreated?: (roomId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  initialRoomId,
  onRoomCreated,
  soundEnabled,
  onToggleSound
}) => {
  // Screen state
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // Room creation state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('middle2_core');
  const [roomTitle, setRoomTitle] = useState<string>('중2 영어 퀴즈 쇼 1교시');
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [customPrompt, setCustomPrompt] = useState<string>('중학교 2학년 필수 어휘 - 여행 및 환경');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [pinCopied, setPinCopied] = useState<boolean>(false);

  // Firestore Live CRUD Probe State
  const [crudResult, setCrudResult] = useState<CrudTestResult | null>(null);
  const [isTestingCrud, setIsTestingCrud] = useState<boolean>(false);

  // Round Timer & Progress
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [showExampleSentence, setShowExampleSentence] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Initial Firestore real CRUD test
  useEffect(() => {
    executeCrudTest();
  }, []);

  const executeCrudTest = async () => {
    setIsTestingCrud(true);
    const result = await runRealFirestoreCrudTest();
    setCrudResult(result);
    setIsTestingCrud(false);
  };

  // Subscriptions when in a room
  useEffect(() => {
    if (!roomId) return;

    const unsubRoom = subscribeToRoom(roomId, (data) => {
      setRoomData(data);
    });

    const unsubParticipants = subscribeToParticipants(roomId, (list) => {
      setParticipants(list);
    });

    // Load questions once
    getRoomQuestions(roomId).then((qList) => {
      if (qList && qList.length > 0) {
        setQuestions(qList);
      }
    });

    return () => {
      unsubRoom();
      unsubParticipants();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [roomId]);

  // Current Question
  const currentQIndex = roomData?.currentQuestionIndex ?? 0;
  const currentQuestion: QuizQuestion | undefined = questions[currentQIndex];

  // In-Round Countdown Timer Controller (Teacher Screen authoritative clock)
  useEffect(() => {
    if (!roomData || roomData.status !== 'playing' || !currentQuestion) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const roundDuration = currentQuestion.limitTime || roomData.timeLimit || 20;
    const startTime = roomData.questionStartTime || Date.now();

    const updateTimer = () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(roundDuration - elapsedSeconds));
      setTimeLeft(remaining);

      // Sound ticking
      if (remaining <= 5 && remaining > 0) {
        soundManager.playUrgentTick();
      } else if (remaining > 5) {
        soundManager.playTick();
      }

      // Check if all joined participants submitted
      const allSubmitted =
        participants.length > 0 &&
        participants.every(
          (p) => p.lastResponse && p.lastResponse.qIndex === currentQIndex
        );

      if (remaining <= 0 || allSubmitted) {
        clearInterval(timerIntervalRef.current);
        handleEndRound();
      }
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [roomData?.status, roomData?.currentQuestionIndex, roomData?.questionStartTime, participants.length]);

  // Create room with preset or AI generated questions
  const handleCreateRoom = async (overrideQuestions?: QuizQuestion[]) => {
    setIsCreatingRoom(true);
    try {
      const pin = generateRoomPin();
      let questionsToUse: QuizQuestion[] = [];

      if (overrideQuestions && overrideQuestions.length > 0) {
        questionsToUse = overrideQuestions;
      } else {
        const preset = PRESET_WORD_PACKS.find((p) => p.id === selectedPresetId);
        questionsToUse = preset ? preset.questions : PRESET_WORD_PACKS[0].questions;
      }

      const newRoomId = await createQuizRoom(
        pin,
        roomTitle || '실시간 영어 단어 퀴즈',
        selectedPresetId,
        questionsToUse,
        timeLimit
      );

      setRoomId(newRoomId);
      onRoomCreated?.(newRoomId);
      soundManager.playRoundStart();
    } catch (err) {
      console.error('Room create error:', err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Generate words via Gemini API
  const handleGenerateAiWords = async () => {
    setIsGeneratingAi(true);
    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: customPrompt,
          count: 5,
          grade: '중2'
        })
      });

      const data = await response.json();
      if (data.success && data.words && data.words.length > 0) {
        soundManager.playFanfare();
        await handleCreateRoom(data.words);
      } else {
        // Fallback to preset
        await handleCreateRoom();
      }
    } catch (err) {
      console.error('Gemini Generate failed:', err);
      await handleCreateRoom();
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Start Game (transition from waiting to playing first question)
  const handleStartGame = async () => {
    if (!roomId) return;
    soundManager.playRoundStart();
    setShowExampleSentence(false);
    await updateQuizRoomStatus(roomId, {
      status: 'playing',
      currentQuestionIndex: 0,
      questionStartTime: Date.now()
    });
  };

  // End Round (transition from playing to round_result)
  const handleEndRound = async () => {
    if (!roomId) return;
    soundManager.playCorrect();
    if (currentQuestion) {
      soundManager.speakWord(currentQuestion.word);
    }
    await updateQuizRoomStatus(roomId, {
      status: 'round_result'
    });
  };

  // Proceed to next question or conclude game
  const handleNextRound = async () => {
    if (!roomId || !roomData) return;

    const nextIndex = roomData.currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      soundManager.playRoundStart();
      setShowExampleSentence(false);
      await updateQuizRoomStatus(roomId, {
        status: 'playing',
        currentQuestionIndex: nextIndex,
        questionStartTime: Date.now()
      });
    } else {
      // Conclude game
      soundManager.playFanfare();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
      await saveGameHistory(roomId, roomData.title, questions.length, participants);
      await updateQuizRoomStatus(roomId, {
        status: 'finished'
      });
    }
  };

  // Force close current question immediately
  const handleForceCloseQuestion = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    handleEndRound();
  };

  // Copy PIN to clipboard
  const handleCopyPin = () => {
    if (!roomData?.pin) return;
    navigator.clipboard.writeText(roomData.pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  // Export report to CSV
  const handleExportCsv = () => {
    if (!participants.length) return;
    const header = '등수,학번,이름,총점,정답수,응답수\n';
    const rows = participants
      .map(
        (p) =>
          `${p.rank},"${p.studentNum}","${p.name}",${p.totalScore},${p.correctCount},${p.answeredCount}`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${roomData?.title || '퀴즈쇼결과'}_${roomId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Count participants who submitted answer for current round
  const submittedCount = participants.filter(
    (p) => p.lastResponse && p.lastResponse.qIndex === currentQIndex
  ).length;

  // -------------------------------------------------------------
  // RENDER 1: CREATE ROOM SETUP SCREEN
  // -------------------------------------------------------------
  if (!roomId || !roomData) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Firestore Real CRUD Verification Banner */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl flex items-center justify-center ${
                  crudResult?.success
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : crudResult === null
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {crudResult?.success ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Firebase Cloud Firestore 실제 연동 상태
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      crudResult?.success
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {crudResult?.success ? '연결 및 CRUD 검증 완료' : '테스트 진행 중...'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {crudResult
                    ? crudResult.message
                    : 'Firebase Firestore에 실제 테스트 문서를 생성/읽기/수정/삭제하여 무결성을 검증합니다.'}
                </p>
                {crudResult?.stepsCompleted && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {crudResult.stepsCompleted.map((st, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-slate-900/60 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
                      >
                        ✓ {st}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={executeCrudTest}
              disabled={isTestingCrud}
              className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingCrud ? 'animate-spin' : ''}`} />
              CRUD 재검증
            </button>
          </div>
        </div>

        {/* Room Setup Header */}
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 rounded-3xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                선생님용 제어 센터 & 빔프로젝터 전광판
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                실시간 영어 단어 퀴즈 쇼 개설
              </h1>
              <p className="text-slate-300 text-sm mt-2 max-w-xl">
                PIN 번호를 발급하여 학생들을 입장시키고, 초성 힌트와 알파벳 블록으로 재미있게 어휘를 학습하세요.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onToggleSound}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
              </button>
            </div>
          </div>

          <hr className="my-6 border-slate-800" />

          {/* Form Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Left: Basic Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  퀴즈 세션 제목
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="예: 중2 영어 1단원 어휘 퀴즈"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  문제당 제한시간 (초)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimeLimit(sec)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                        timeLimit === sec
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    >
                      {sec}초
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Gemini AI Prompt Generation Option */}
            <div className="bg-slate-800/60 rounded-2xl border border-indigo-500/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                Gemini AI 단어 문제 자동 생성
              </div>
              <p className="text-xs text-slate-400">
                원하는 교과 주제나 단원을 입력하면 Gemini가 단어, 한국어 뜻, 초성 힌트, 알파벳 블록을 자동 생성합니다.
              </p>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 중2 2학기 - 기후변화와 지구환경 5개"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleGenerateAiWords}
                disabled={isGeneratingAi || isCreatingRoom}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Gemini 단어 문제 생성 및 방 개설 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI 단어로 퀴즈 방 즉시 개설하기
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Word Packs */}
          <div className="mt-8 relative z-10">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              또는 학년별 추천 교육과정 단어 세트 선택
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_WORD_PACKS.map((pack) => {
                const isSelected = selectedPresetId === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPresetId(pack.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                        {pack.badge}
                      </span>
                      <span className="text-xs text-slate-400">{pack.questions.length}문제</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">{pack.title}</h4>
                    <p className="text-xs text-slate-400 mb-3">{pack.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {pack.questions.slice(0, 4).map((q) => (
                        <span
                          key={q.qIndex}
                          className="text-[10px] bg-slate-900/80 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {q.word}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create Room Button */}
          <div className="mt-8 flex justify-end relative z-10">
            <button
              onClick={() => handleCreateRoom()}
              disabled={isCreatingRoom || isGeneratingAi}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base flex items-center gap-3 shadow-xl shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isCreatingRoom ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  게임 방 생성 중...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  선택한 단어셋으로 퀴즈 방 개설 (PIN 발급)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: WAITING LOBBY (빔프로젝터용 대형 PIN 및 참가자 대기)
  // -------------------------------------------------------------
  if (roomData.status === 'waiting') {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-slate-800/90 rounded-2xl border border-slate-700 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="font-bold text-white text-lg">{roomData.title}</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">
              총 {questions.length}문제 • 문제당 {roomData.timeLimit}초
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSound}
              className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 transition"
              title="효과음 토글"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={() => {
                if (confirm('현재 대기방을 종료하고 새 방을 만드시겠습니까?')) {
                  setRoomId('');
                  setRoomData(null);
                }
              }}
              className="text-xs px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
            >
              새 방 만들기
            </button>
          </div>
        </div>

        {/* Big Projector PIN Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 rounded-3xl border border-indigo-500/40 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/30">
            학생 접속 안내 (빔프로젝터 표출용)
          </div>

          <h3 className="text-slate-300 text-base sm:text-lg mb-2">
            학생 태블릿이나 스마트폰에서 아래 PIN 번호를 입력하고 접속하세요
          </h3>

          <div className="my-6 inline-flex flex-col sm:flex-row items-center gap-4 bg-slate-900/90 px-8 py-6 rounded-3xl border-2 border-indigo-500/50 shadow-2xl shadow-indigo-600/30">
            <div>
              <span className="text-xs uppercase font-extrabold text-indigo-400 tracking-widest block mb-1">
                GAME PIN
              </span>
              <span className="font-game text-5xl sm:text-7xl font-extrabold text-white tracking-wider">
                {roomData.pin}
              </span>
            </div>

            <button
              onClick={handleCopyPin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
            >
              {pinCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {pinCopied ? '복사됨!' : 'PIN 복사'}
            </button>
          </div>

          {/* Live Participant Count */}
          <div className="flex items-center justify-center gap-2 text-slate-300 text-sm mb-6">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>현재 입장한 학생: </span>
            <span className="font-extrabold text-white text-lg px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              {participants.length}명
            </span>
          </div>

          {/* Start Game Button */}
          <div>
            <button
              onClick={handleStartGame}
              disabled={participants.length === 0}
              className={`px-10 py-5 rounded-2xl font-extrabold text-xl flex items-center gap-3 mx-auto shadow-2xl transition transform hover:scale-105 active:scale-95 ${
                participants.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Play className="w-6 h-6 fill-current" />
              {participants.length > 0 ? '퀴즈 쇼 시작하기!' : '학생들의 입장을 기다리는 중...'}
            </button>
            {participants.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">
                * 오른쪽 학생 테스트 화면이나 다른 기기에서 PIN 번호({roomData.pin})를 입력해 입장해 보세요!
              </p>
            )}
          </div>
        </div>

        {/* Participant Roster Chips */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              참가자 명단 ({participants.length}명)
            </h4>
          </div>

          {participants.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              아직 입장한 학생이 없습니다. 화면에 표시된 PIN 번호로 접속을 안내해 주세요.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {participants.map((p, idx) => (
                <div
                  key={p.studentKey}
                  className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow transition transform hover:scale-105"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-white font-bold text-xs block">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{p.studentNum}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 3: ACTIVE PLAYING ROUND (문제 출제 중 대형 프로젝터 화면)
  // -------------------------------------------------------------
  if (roomData.status === 'playing' && currentQuestion) {
    const progressPercent = Math.max(
      0,
      Math.min(100, (timeLeft / (currentQuestion.limitTime || roomData.timeLimit || 20)) * 100)
    );

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-slate-800/90 rounded-2xl border border-slate-700 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-sm border border-indigo-500/30">
              Round {currentQIndex + 1} / {questions.length}
            </span>
            <span className="text-white font-bold text-base truncate max-w-xs">{roomData.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleForceCloseQuestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
            >
              <SkipForward className="w-4 h-4" />
              즉시 마감 및 정답 발표
            </button>
          </div>
        </div>

        {/* Big Projector Question Card */}
        <div className="bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-900 rounded-3xl border border-indigo-500/40 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          {/* Top Progress / Countdown Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-4 mb-8 overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-300 ${
                timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
            {/* Big Circular Countdown Display */}
            <div
              className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-xl transition-all ${
                timeLeft <= 5
                  ? 'border-rose-500 text-rose-400 animate-wiggle bg-rose-500/10'
                  : 'border-indigo-400 text-white bg-slate-800/90'
              }`}
            >
              <span className="text-4xl font-extrabold font-game">{timeLeft}</span>
              <span className="text-[10px] text-slate-400 font-semibold">SECONDS</span>
            </div>

            {/* Submission Status Visual */}
            <div className="bg-slate-800/80 border border-slate-700 px-6 py-4 rounded-2xl text-left">
              <span className="text-xs text-slate-400 block font-semibold">실시간 제출 현황</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white">{submittedCount}</span>
                <span className="text-sm text-slate-400">/ {participants.length}명 제출 완료</span>
              </div>
              <div className="w-40 bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      participants.length > 0 ? (submittedCount / participants.length) * 100 : 0
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Korean Meaning Prompt (The Main Question) */}
          <div className="mb-6">
            <span className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider block mb-2">
              [한국어 뜻 힌트]
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              "{currentQuestion.meaning}"
            </h2>
          </div>

          {/* Initial Letter & Consonant Hint Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto my-8">
            <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-400 block mb-1">
                ✨ 영어 첫글자 / 끝글자 힌트
              </span>
              <span className="font-mono text-2xl font-extrabold text-white tracking-widest">
                {currentQuestion.initialHint}
              </span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-teal-400 block mb-1">
                💡 한국어 초성 힌트
              </span>
              <span className="text-2xl font-extrabold text-teal-200 tracking-widest">
                {currentQuestion.koreanInitialHint}
              </span>
            </div>
          </div>

          {/* Alphabet Blocks Visual Pool (For projector viewing) */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="text-xs text-slate-400 block mb-3 font-semibold">
              학생 태블릿에 제공된 알파벳 블록 풀:
            </span>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {currentQuestion.alphabetBlocks.map((letter, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white font-extrabold text-lg flex items-center justify-center border border-slate-600 shadow"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Example Sentence Toggle */}
          <div className="mt-6">
            <button
              onClick={() => setShowExampleSentence(!showExampleSentence)}
              className="text-xs text-slate-400 hover:text-indigo-300 underline transition"
            >
              {showExampleSentence ? '예문 힌트 숨기기' : '🔍 추가 예문 힌트 표시하기'}
            </button>
            {showExampleSentence && (
              <p className="mt-2 text-sm text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-4 py-2.5 rounded-xl max-w-lg mx-auto italic">
                "{currentQuestion.exampleSentence}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 4: ROUND RESULT & LIVE LEADERBOARD (정답 대형 공개 및 랭킹)
  // -------------------------------------------------------------
  if (roomData.status === 'round_result' && currentQuestion) {
    // Sort participants to find top scorers
    const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore);
    const topRankers = sorted.slice(0, 7);

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-slate-800/90 rounded-2xl border border-slate-700 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-sm border border-emerald-500/30">
              Round {currentQIndex + 1} 결과 발표
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNextRound}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg transition"
            >
              <span>{currentQIndex + 1 < questions.length ? '다음 문제 진행' : '최종 결과 발표'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Word Answer Reveal Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 rounded-3xl border border-indigo-500/40 p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider block mb-2">
            CORRECT ANSWER
          </span>

          <div className="inline-flex items-center gap-4 my-2">
            <h1 className="font-game text-5xl sm:text-7xl font-extrabold text-white tracking-widest text-emerald-300 drop-shadow-lg">
              {currentQuestion.word}
            </h1>
            <button
              onClick={() => soundManager.speakWord(currentQuestion.word)}
              className="p-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition shadow"
              title="원어민 발음 듣기"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          <p className="text-xl sm:text-2xl font-bold text-slate-200 mt-2">
            "{currentQuestion.meaning}"
          </p>

          {currentQuestion.exampleSentence && (
            <p className="text-sm text-slate-400 italic mt-3 max-w-xl mx-auto bg-slate-800/60 py-2 px-4 rounded-xl border border-slate-700">
              "{currentQuestion.exampleSentence}"
            </p>
          )}
        </div>

        {/* Live Leaderboard Topboard */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              실시간 랭킹 리더보드 (TOP RANKERS)
            </h3>
            <span className="text-xs text-slate-400">정확도(1000점) + 응답속도(최대 500점)</span>
          </div>

          <div className="space-y-2.5">
            {topRankers.map((p, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={p.studentKey}
                  className={`flex items-center justify-between p-4 rounded-xl border transition ${
                    isFirst
                      ? 'bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10'
                      : isSecond
                      ? 'bg-slate-700/60 border-slate-500/40'
                      : isThird
                      ? 'bg-amber-900/20 border-amber-800/40'
                      : 'bg-slate-900/60 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm ${
                        isFirst
                          ? 'bg-amber-400 text-slate-900'
                          : isSecond
                          ? 'bg-slate-300 text-slate-900'
                          : isThird
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base">{p.name}</span>
                        <span className="text-xs text-slate-400">({p.studentNum})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        맞힌 문제: {p.correctCount} / {questions.length}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-game text-xl font-extrabold text-amber-300 block">
                      {p.totalScore.toLocaleString()}점
                    </span>
                    {p.lastResponse?.isCorrect && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        이번 라운드 +{p.lastResponse.scoreAwarded}점
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 5: FINAL GAME OVER SCREEN (명예의 전당 & 성적 보고서)
  // -------------------------------------------------------------
  if (roomData.status === 'finished') {
    const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore);
    const first = sorted[0];
    const second = sorted[1];
    const third = sorted[2];

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Victory Celebration Card */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 rounded-3xl border border-indigo-500/40 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-4 border border-amber-500/30">
            <Trophy className="w-4 h-4 text-amber-400" />
            최종 퀴즈 쇼 종료 및 시상식
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2">
            🎉 실시간 영어 퀴즈 쇼 명예의 전당 🎉
          </h1>
          <p className="text-slate-300 text-sm mb-8">
            참가한 모든 학생들 수고 많았습니다!
          </p>

          {/* Top 3 Podium Visual */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto items-end pt-8 pb-4">
            {/* 2nd Place */}
            {second && (
              <div className="bg-slate-800/90 border border-slate-600 rounded-2xl p-4 text-center order-1 shadow-lg transform translate-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-400 text-slate-900 font-extrabold text-lg flex items-center justify-center mx-auto mb-2 shadow">
                  2
                </div>
                <h4 className="font-bold text-white text-sm truncate">{second.name}</h4>
                <p className="text-xs text-slate-400">{second.studentNum}</p>
                <p className="font-game text-base font-extrabold text-slate-300 mt-2">
                  {second.totalScore.toLocaleString()}점
                </p>
              </div>
            )}

            {/* 1st Place */}
            {first && (
              <div className="bg-gradient-to-b from-amber-500/20 to-slate-800/90 border-2 border-amber-400 rounded-3xl p-6 text-center order-2 shadow-2xl shadow-amber-500/20 transform -translate-y-4">
                <Crown className="w-8 h-8 text-amber-400 mx-auto mb-1 animate-bounce" />
                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 font-extrabold text-xl flex items-center justify-center mx-auto mb-2 shadow">
                  1
                </div>
                <h4 className="font-extrabold text-white text-base sm:text-lg truncate">
                  {first.name}
                </h4>
                <p className="text-xs text-amber-300/80">{first.studentNum}</p>
                <p className="font-game text-xl sm:text-2xl font-extrabold text-amber-400 mt-2">
                  {first.totalScore.toLocaleString()}점
                </p>
              </div>
            )}

            {/* 3rd Place */}
            {third && (
              <div className="bg-slate-800/90 border border-amber-800/60 rounded-2xl p-4 text-center order-3 shadow-lg transform translate-y-6">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-2 shadow">
                  3
                </div>
                <h4 className="font-bold text-white text-sm truncate">{third.name}</h4>
                <p className="text-xs text-slate-400">{third.studentNum}</p>
                <p className="font-game text-base font-extrabold text-amber-500 mt-2">
                  {third.totalScore.toLocaleString()}점
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Report Export */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/90 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <div>
            <h4 className="font-bold text-white text-base">성적표 관리 및 새로운 퀴즈</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              전체 학생들의 성적 데이터를 엑셀(CSV) 파일로 저장하거나 새 퀴즈 방을 시작할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold border border-slate-600 transition shadow"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              CSV 성적표 다운로드
            </button>

            <button
              onClick={() => {
                setRoomId('');
                setRoomData(null);
                setParticipants([]);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              새로운 게임 방 개설
            </button>
          </div>
        </div>

        {/* Full Ranking Table */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-700 font-bold text-white text-sm">
            전체 참가자 최종 성적표 ({participants.length}명)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4">순위</th>
                  <th className="py-3 px-4">학번</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4">정답률</th>
                  <th className="py-3 px-4 text-right">최종 점수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {sorted.map((p, idx) => (
                  <tr key={p.studentKey} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{p.studentNum}</td>
                    <td className="py-3 px-4 font-bold text-white">{p.name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {p.correctCount} / {questions.length} (
                      {questions.length > 0
                        ? Math.round((p.correctCount / questions.length) * 100)
                        : 0}
                      %)
                    </td>
                    <td className="py-3 px-4 text-right font-game font-bold text-amber-300 text-sm">
                      {p.totalScore.toLocaleString()}점
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
