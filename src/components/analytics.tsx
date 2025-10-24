"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Flame, TrendingUp, Clock, Target, Calendar } from "lucide-react";

interface DailyStats {
  date: string;
  sessions: number;
  focusTime: number; // in minutes
}

interface AnalyticsData {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalFocusTime: number;
  dailyStats: DailyStats[];
  lastSessionDate: string | null;
}

export function Analytics() {
  const [stats, setStats] = useState<AnalyticsData>({
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    totalFocusTime: 0,
    dailyStats: [],
    lastSessionDate: null,
  });

  useEffect(() => {
    const savedStats = localStorage.getItem("pomodoroStats");
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pomodoroStats", JSON.stringify(stats));
  }, [stats]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getThisWeekSessions = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return stats.dailyStats
      .filter((day) => {
        const dayDate = new Date(day.date);
        return dayDate >= weekAgo && dayDate <= today;
      })
      .reduce((sum, day) => sum + day.sessions, 0);
  };

  const getWeeklyActivity = () => {
    const today = new Date();
    const weekDays = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayStats = stats.dailyStats.find((d) => d.date === dateStr);
      weekDays.push({
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
        sessions: dayStats?.sessions || 0,
        focusTime: dayStats?.focusTime || 0,
      });
    }

    return weekDays;
  };

  const weeklyActivity = getWeeklyActivity();
  const thisWeekSessions = getThisWeekSessions();
  const maxSessionsInWeek = Math.max(
    ...weeklyActivity.map((d) => d.sessions),
    5,
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Current Streak
              </p>
              <p className="text-3xl font-bold text-primary">
                {stats.currentStreak}
              </p>
              <p className="text-xs text-muted-foreground mt-2">days</p>
            </div>
            <Flame className="w-8 h-8 text-primary/60" />
          </div>
        </Card>

        {/* Longest Streak */}
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Longest Streak
              </p>
              <p className="text-3xl font-bold text-accent">
                {stats.longestStreak}
              </p>
              <p className="text-xs text-muted-foreground mt-2">days</p>
            </div>
            <TrendingUp className="w-8 h-8 text-accent/60" />
          </div>
        </Card>

        {/* Total Sessions */}
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Total Sessions
              </p>
              <p className="text-3xl font-bold text-secondary-foreground">
                {stats.totalSessions}
              </p>
              <p className="text-xs text-muted-foreground mt-2">completed</p>
            </div>
            <Target className="w-8 h-8 text-secondary-foreground/60" />
          </div>
        </Card>

        {/* Total Focus Time */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Total Focus Time
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatTime(stats.totalFocusTime)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">all time</p>
            </div>
            <Clock className="w-8 h-8 text-primary/60" />
          </div>
        </Card>
      </div>

      {/* Weekly Activity */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">This Week</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Sessions</span>
              <span className="text-sm font-semibold">{thisWeekSessions}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min((thisWeekSessions / 20) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-6">
            {weeklyActivity.map((day, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-muted-foreground mb-2">{day.day}</p>
                <div
                  className="h-12 bg-secondary/20 rounded-lg flex items-center justify-center transition-all hover:bg-secondary/40"
                  style={{
                    backgroundColor:
                      day.sessions > 0
                        ? `hsl(var(--primary) / ${0.2 + (day.sessions / maxSessionsInWeek) * 0.6})`
                        : "hsl(var(--secondary) / 0.2)",
                  }}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {day.sessions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-border p-6">
        <h3 className="text-lg font-semibold mb-3">Keep Your Streak Going</h3>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {stats.currentStreak === 0
              ? "Start your first session today to begin your streak!"
              : `You're on a ${stats.currentStreak}-day streak! Keep it up to reach your longest streak of ${stats.longestStreak} days.`}
          </p>
          <div className="flex gap-2 flex-wrap">
            <div className="px-3 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary">
              {stats.totalSessions} total sessions
            </div>
            <div className="px-3 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
              {formatTime(stats.totalFocusTime)} focused
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
