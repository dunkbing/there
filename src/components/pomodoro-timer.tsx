"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Settings } from "lucide-react";

interface TimerSettings {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
}

export function PomodoroTimer() {
  const [settings, setSettings] = useState<TimerSettings>({
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
  });

  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("pomodoroSettings");
    const savedSessions = localStorage.getItem("sessionsCompleted");

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTimeLeft(parsed.workDuration * 60);
    }

    if (savedSessions) {
      setSessionsCompleted(Number.parseInt(savedSessions));
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("sessionsCompleted", sessionsCompleted.toString());
    }
  }, [sessionsCompleted, isLoaded]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (isWorkSession) {
            setSessionsCompleted((s) => s + 1);
            const isLongBreak = (sessionsCompleted + 1) % 4 === 0;
            setTimeLeft(
              (isLongBreak
                ? settings.longBreakDuration
                : settings.breakDuration) * 60,
            );
          } else {
            setTimeLeft(settings.workDuration * 60);
          }
          setIsWorkSession(!isWorkSession);
          playNotification();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isWorkSession, sessionsCompleted, settings]);

  const playNotification = () => {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(settings.workDuration * 60);
    setIsWorkSession(true);
    setSessionsCompleted(0);
  };

  const handleSettingsChange = (key: keyof TimerSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (!isRunning) {
      setTimeLeft(newSettings.workDuration * 60);
    }
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl bg-linear-to-br from-primary/15 via-accent/10 to-secondary/15 shadow-2xl shadow-primary/20 p-12">
        <div className="text-center">
          <div className="mb-8">
            <p className="text-lg font-semibold text-primary mb-3">
              {isWorkSession ? "🎯 Focus Time" : "☕ Break Time"}
            </p>
            <div className="text-8xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent font-mono tracking-tight">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mb-10">
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-10 rounded-full transition-all duration-300 ease-out ${
                    i < sessionsCompleted % 4
                      ? "bg-linear-to-r from-primary to-accent shadow-lg shadow-primary/50"
                      : "bg-white/20 dark:bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {sessionsCompleted} sessions completed
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              size="lg"
              className="bg-linear-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 text-primary-foreground rounded-full w-20 h-20 p-0 transition-all duration-300 ease-out shadow-lg shadow-primary/20"
            >
              {isRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full w-20 h-20 p-0 transition-all duration-300 ease-out hover:bg-white/20 dark:hover:bg-white/10"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="lg"
              className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full w-20 h-20 p-0 transition-all duration-300 ease-out hover:bg-white/20 dark:hover:bg-white/10"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border dark:border-white/10 rounded-2xl border-white/30 p-8">
          <h3 className="text-xl font-bold mb-6">Timer Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-3">
                Work Duration (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) =>
                  handleSettingsChange(
                    "workDuration",
                    Number.parseInt(e.target.value),
                  )
                }
                className="w-full px-4 py-3 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 ease-out"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-3">
                Break Duration (min)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.breakDuration}
                onChange={(e) =>
                  handleSettingsChange(
                    "breakDuration",
                    Number.parseInt(e.target.value),
                  )
                }
                className="w-full px-4 py-3 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 ease-out"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-3">
                Long Break (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakDuration}
                onChange={(e) =>
                  handleSettingsChange(
                    "longBreakDuration",
                    Number.parseInt(e.target.value),
                  )
                }
                className="w-full px-4 py-3 backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-lg text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 ease-out"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
