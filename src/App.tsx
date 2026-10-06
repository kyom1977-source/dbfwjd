import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Columns,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Award,
  GraduationCap
} from 'lucide-react';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { soundManager } from './utils/sound';

type ViewMode = 'teacher' | 'student' | 'split';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activePin, setActivePin] = useState<string>('');

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundManager.enabled = nextState;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  English Word Quiz Show
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  중학생 영어 단어 퀴즈
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                초성 힌트 & 알파벳 블록 실시간 스피드 퀴즈 쇼
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80 flex items-center shadow-inner">
              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>교사 화면</span>
              </button>

              <button
                onClick={() => setViewMode('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === 'student'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>학생 화면</span>
              </button>

              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewMode === 'split'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="한 화면에서 교사와 학생을 동시에 테스트할 수 있는 듀얼 분할 모드"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>동시 테스트 (분할)</span>
              </button>
            </div>

            {/* Sound Mute/Unmute Button */}
            <button
              onClick={toggleSound}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={soundEnabled ? '효과음 켜짐' : '효과음 꺼짐'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-indigo-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Mode 1: Teacher Projector Screen Only */}
        {viewMode === 'teacher' && (
          <TeacherView
            initialRoomId={activePin}
            onRoomCreated={(pin) => setActivePin(pin)}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
          />
        )}

        {/* Mode 2: Student Screen Only */}
        {viewMode === 'student' && (
          <StudentView
            initialPin={activePin}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
          />
        )}

        {/* Mode 3: Split Preview Screen (Teacher + Student Testing Side by Side) */}
        {viewMode === 'split' && (
          <div className="space-y-4">
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3 text-center text-xs text-indigo-300 flex items-center justify-center gap-2">
              <Columns className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>동시 테스트 모드:</strong> 왼쪽 화면에서 방을 생성하면 오른쪽 학생 화면에 PIN이 자동 연동되어 바로 실시간 퀴즈 쇼를 시뮬레이션할 수 있습니다.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Teacher View */}
              <div className="lg:col-span-7 bg-slate-900/50 rounded-3xl p-2 sm:p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    교사 화면 (빔프로젝터 전광판)
                  </span>
                </div>
                <TeacherView
                  initialRoomId={activePin}
                  onRoomCreated={(pin) => setActivePin(pin)}
                  soundEnabled={soundEnabled}
                  onToggleSound={toggleSound}
                />
              </div>

              {/* Right Column: Student View (Tablet Mockup Frame) */}
              <div className="lg:col-span-5 bg-slate-900/50 rounded-3xl p-2 sm:p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    학생 태블릿 화면 (터치 인터페이스)
                  </span>
                </div>
                <div className="bg-slate-950 border-4 border-slate-800 rounded-3xl p-2 sm:p-4 shadow-2xl min-h-[580px]">
                  <StudentView
                    initialPin={activePin}
                    soundEnabled={soundEnabled}
                    onToggleSound={toggleSound}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 px-4 text-center text-xs text-slate-300">
        <p>
          Real-time English Word Quiz Show for Middle School | Firebase Cloud Firestore Real-time Engine & Gemini AI Powered
        </p>
      </footer>
    </div>
  );
}
