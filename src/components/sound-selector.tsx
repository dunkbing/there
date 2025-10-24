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
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    description: "Gentle rainfall",
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Forest sounds",
    color: "from-green-400 to-green-600",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    description: "Ocean waves",
    color: "from-cyan-400 to-cyan-600",
  },
  {
    id: "coffee",
    name: "Coffee Shop",
    description: "Café ambience",
    color: "from-amber-400 to-amber-600",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    description: "Crackling fire",
    color: "from-orange-400 to-orange-600",
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    description: "Storm sounds",
    color: "from-slate-400 to-slate-600",
  },
  {
    id: "birds",
    name: "Birds Chirping",
    description: "Bird songs",
    color: "from-yellow-400 to-yellow-600",
  },
  {
    id: "wind",
    name: "Wind Chimes",
    description: "Wind chimes",
    color: "from-purple-400 to-purple-600",
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

      <div className="relative z-[70] w-80 max-h-96 overflow-y-auto backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Ambient Sounds</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
              className="flex-shrink-0 bg-transparent"
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
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-white/70 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Sounds Grid */}
          <div className="grid grid-cols-2 gap-3">
            {AMBIENT_SOUNDS.map((sound) => (
              <button
                key={sound.id}
                onClick={() => playSound(sound.id)}
                className={`p-3 rounded-lg transition-all duration-300 border-2 ${
                  playingSound === sound.id
                    ? "border-white/40 bg-white/15"
                    : "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div
                  className={`bg-gradient-to-br ${sound.color} rounded-md p-3 mb-2 flex items-center justify-center`}
                >
                  {playingSound === sound.id ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </div>
                <p className="text-xs font-medium text-white/90">
                  {sound.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
