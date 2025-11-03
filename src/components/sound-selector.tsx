"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, X } from "lucide-react";

interface AmbientSound {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    description: "Gentle rainfall",
    color: "from-blue-400 to-blue-600",
    icon: "🌧️",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Forest sounds",
    color: "from-green-400 to-green-600",
    icon: "🌲",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    description: "Ocean waves",
    color: "from-cyan-400 to-cyan-600",
    icon: "🌊",
  },
  {
    id: "coffee",
    name: "Coffee Shop",
    description: "Café ambience",
    color: "from-amber-400 to-amber-600",
    icon: "☕",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    description: "Crackling fire",
    color: "from-orange-400 to-orange-600",
    icon: "🔥",
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    description: "Storm sounds",
    color: "from-slate-400 to-slate-600",
    icon: "⚡",
  },
  {
    id: "birds",
    name: "Birds Chirping",
    description: "Bird songs",
    color: "from-yellow-400 to-yellow-600",
    icon: "🐦",
  },
  {
    id: "wind",
    name: "Wind Chimes",
    description: "Wind chimes",
    color: "from-purple-400 to-purple-600",
    icon: "🎐",
  },
];

interface SoundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SoundSelector({ isOpen, onClose }: SoundSelectorProps) {
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const audioSourcesRef = useRef<
    Map<string, (AudioBufferSourceNode | OscillatorNode)[]>
  >(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout[]>>(new Map());

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    return audioContextRef.current;
  };

  const playSound = (soundId: string) => {
    const audioContext = initAudioContext();

    if (playingSound === soundId) {
      stopSound(soundId);
      setPlayingSound(null);
      return;
    }

    if (playingSound) {
      stopSound(playingSound);
    }

    const sound = AMBIENT_SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;

    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = isMuted ? 0 : volume;

    switch (soundId) {
      case "rain":
        createRainSound(audioContext, masterGain, soundId);
        break;
      case "forest":
        createForestSound(audioContext, masterGain, soundId);
        break;
      case "ocean":
        createOceanSound(audioContext, masterGain, soundId);
        break;
      case "coffee":
        createCoffeeSound(audioContext, masterGain, soundId);
        break;
      case "fireplace":
        createFireplaceSound(audioContext, masterGain, soundId);
        break;
      case "thunderstorm":
        createThunderstormSound(audioContext, masterGain, soundId);
        break;
      case "birds":
        createBirdsSound(audioContext, masterGain, soundId);
        break;
      case "wind":
        createWindSound(audioContext, masterGain, soundId);
        break;
    }

    gainNodesRef.current.set(soundId, masterGain);
    setPlayingSound(soundId);
  };

  const stopSound = (soundId: string) => {
    const sources = audioSourcesRef.current.get(soundId) || [];
    sources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source already stopped
      }
    });
    audioSourcesRef.current.delete(soundId);

    // Clear any pending timeouts
    const timeouts = timeoutsRef.current.get(soundId) || [];
    timeouts.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.delete(soundId);
  };

  const addSource = (
    soundId: string,
    source: AudioBufferSourceNode | OscillatorNode,
  ) => {
    const sources = audioSourcesRef.current.get(soundId) || [];
    sources.push(source);
    audioSourcesRef.current.set(soundId, sources);
  };

  const addTimeout = (soundId: string, timeout: NodeJS.Timeout) => {
    const timeouts = timeoutsRef.current.get(soundId) || [];
    timeouts.push(timeout);
    timeoutsRef.current.set(soundId, timeouts);
  };

  const createRainSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    for (let i = 0; i < 3; i++) {
      const bufferSize = audioContext.sampleRate * 2;
      const noiseBuffer = audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate,
      );
      const output = noiseBuffer.getChannelData(0);

      for (let j = 0; j < bufferSize; j++) {
        output[j] = Math.random() * 2 - 1;
      }

      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2000 + i * 500;

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();
      addSource(soundId, noiseSource);
    }
  };

  const createForestSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const frequencies = [800, 1200, 1600, 2000];
    frequencies.forEach((freq, index) => {
      const timeout = setTimeout(() => {
        if (playingSound !== soundId) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.frequency.value = freq;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3,
        );

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
        addSource(soundId, osc);
      }, index * 500);
      addTimeout(soundId, timeout);
    });
  };

  const createOceanSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const bufferSize = audioContext.sampleRate * 4;
    const noiseBuffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate,
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] =
        Math.sin((i / audioContext.sampleRate) * Math.PI * 2 * 0.5) *
        (Math.random() * 0.5 + 0.5);
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    noiseSource.connect(filter);
    filter.connect(masterGain);
    noiseSource.start();
    addSource(soundId, noiseSource);
  };

  const createCoffeeSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const bufferSize = audioContext.sampleRate * 2;
    const noiseBuffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate,
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 0.5;

    noiseSource.connect(filter);
    filter.connect(masterGain);
    noiseSource.start();
    addSource(soundId, noiseSource);
  };

  const createFireplaceSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    for (let i = 0; i < 5; i++) {
      const timeout = setTimeout(() => {
        if (playingSound !== soundId) return;

        const bufferSize = audioContext.sampleRate * 0.1;
        const crackleBuffer = audioContext.createBuffer(
          1,
          bufferSize,
          audioContext.sampleRate,
        );
        const output = crackleBuffer.getChannelData(0);

        for (let j = 0; j < bufferSize; j++) {
          output[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
        }

        const crackleSource = audioContext.createBufferSource();
        crackleSource.buffer = crackleBuffer;

        const gain = audioContext.createGain();
        gain.gain.value = 0.2;

        crackleSource.connect(gain);
        gain.connect(masterGain);
        crackleSource.start();
        addSource(soundId, crackleSource);
      }, i * 300);
      addTimeout(soundId, timeout);
    }
  };

  const createThunderstormSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.setValueAtTime(150, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      50,
      audioContext.currentTime + 2,
    );
    osc.type = "sine";

    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioContext.currentTime + 2);
    addSource(soundId, osc);
  };

  const createBirdsSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const chirpFrequencies = [1600, 1800, 2000, 1400, 1900];
    chirpFrequencies.forEach((freq, index) => {
      const timeout = setTimeout(() => {
        if (playingSound !== soundId) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.frequency.value = freq;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2,
        );

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + 0.2);
        addSource(soundId, osc);
      }, index * 400);
      addTimeout(soundId, timeout);
    });
  };

  const createWindSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
    soundId: string,
  ) => {
    const chimeFrequencies = [1046, 1318, 1568, 1976, 2093];
    chimeFrequencies.forEach((freq, index) => {
      const timeout = setTimeout(() => {
        if (playingSound !== soundId) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.frequency.value = freq;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 1,
        );

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + 1);
        addSource(soundId, osc);
      }, index * 600);
      addTimeout(soundId, timeout);
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
    setVolume(newVolume);

    gainNodesRef.current.forEach((gainNode) => {
      gainNode.gain.value = isMuted ? 0 : newVolume;
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    gainNodesRef.current.forEach((gainNode) => {
      gainNode.gain.value = newMuted ? 0 : volume;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-28">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-70 w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-300">
        {/* Header */}
        <div className=" border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Ambient Sounds
              </h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="rounded-full h-10 w-10 p-0 hover:bg-foreground/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-96 overflow-y-auto">
          {/* Volume Control Section */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground">
              Volume
            </label>
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleMute}
                variant="outline"
                size="sm"
                className="shrink-0 h-10 w-10 p-0 bg-transparent"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm font-medium text-foreground w-12 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Sounds Grid - 4 columns for desktop */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-4">
              Select Sound
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AMBIENT_SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => playSound(sound.id)}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                    playingSound === sound.id
                      ? "ring-2 ring-primary shadow-lg scale-105"
                      : "hover:shadow-md hover:scale-102"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${sound.color} opacity-90 group-hover:opacity-100 transition-opacity`}
                  />

                  {/* Content */}
                  <div className="relative p-4 flex flex-col items-center justify-center min-h-32 text-center">
                    <div className="text-4xl mb-3">{sound.icon}</div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-black/40 rounded-full p-3">
                        {playingSound === sound.id ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-white mt-2">
                      {sound.name}
                    </p>
                    <p className="text-xs text-white/80">{sound.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
