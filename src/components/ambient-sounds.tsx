"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AmbientSound {
  id: string;
  name: string;
  description: string;
  color: string;
  frequency?: number;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    description: "Gentle rainfall ambience",
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Peaceful forest sounds",
    color: "from-green-400 to-green-600",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    description: "Calming ocean waves",
    color: "from-cyan-400 to-cyan-600",
  },
  {
    id: "coffee",
    name: "Coffee Shop",
    description: "Cozy café ambience",
    color: "from-amber-400 to-amber-600",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    description: "Crackling fireplace",
    color: "from-orange-400 to-orange-600",
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    description: "Dramatic storm sounds",
    color: "from-slate-400 to-slate-600",
  },
  {
    id: "birds",
    name: "Birds Chirping",
    description: "Morning bird songs",
    color: "from-yellow-400 to-yellow-600",
  },
  {
    id: "wind",
    name: "Wind Chimes",
    description: "Gentle wind chimes",
    color: "from-purple-400 to-purple-600",
  },
];

export function AmbientSounds() {
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());

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

    // Stop previous sound
    if (playingSound) {
      stopSound(playingSound);
    }

    const sound = AMBIENT_SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;

    // Create master gain node
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = isMuted ? 0 : volume;

    // Create different sounds based on ID
    switch (soundId) {
      case "rain":
        createRainSound(audioContext, masterGain);
        break;
      case "forest":
        createForestSound(audioContext, masterGain);
        break;
      case "ocean":
        createOceanSound(audioContext, masterGain);
        break;
      case "coffee":
        createCoffeeSound(audioContext, masterGain);
        break;
      case "fireplace":
        createFireplaceSound(audioContext, masterGain);
        break;
      case "thunderstorm":
        createThunderstormSound(audioContext, masterGain);
        break;
      case "birds":
        createBirdsSound(audioContext, masterGain);
        break;
      case "wind":
        createWindSound(audioContext, masterGain);
        break;
    }

    gainNodesRef.current.set(soundId, masterGain);
    setPlayingSound(soundId);
  };

  const stopSound = (soundId: string) => {
    const oscillators = oscillatorsRef.current.get(soundId);
    if (oscillators) {
      oscillators.stop();
      oscillatorsRef.current.delete(soundId);
    }
  };

  const createRainSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create multiple noise sources for rain effect
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
    }
  };

  const createForestSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create bird-like chirps
    const frequencies = [800, 1200, 1600, 2000];
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
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
      }, index * 500);
    });
  };

  const createOceanSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create wave-like sound with low frequency
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
  };

  const createCoffeeSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create ambient café noise
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
  };

  const createFireplaceSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create crackling fire effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
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
      }, i * 300);
    }
  };

  const createThunderstormSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create low rumbling thunder
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
  };

  const createBirdsSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create chirping birds
    const chirpFrequencies = [1600, 1800, 2000, 1400, 1900];
    chirpFrequencies.forEach((freq, index) => {
      setTimeout(() => {
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
      }, index * 400);
    });
  };

  const createWindSound = (
    audioContext: AudioContext,
    masterGain: GainNode,
  ) => {
    // Create gentle wind chime effect
    const chimeFrequencies = [1046, 1318, 1568, 1976, 2093];
    chimeFrequencies.forEach((freq, index) => {
      setTimeout(() => {
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
      }, index * 600);
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
    setVolume(newVolume);

    // Update all active gain nodes
    gainNodesRef.current.forEach((gainNode) => {
      gainNode.gain.value = isMuted ? 0 : newVolume;
    });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    // Update all active gain nodes
    gainNodesRef.current.forEach((gainNode) => {
      gainNode.gain.value = newMuted ? 0 : volume;
    });
  };

  return (
    <div className="space-y-6">
      {/* Volume Control */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-4">
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
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </Card>

      {/* Ambient Sounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {AMBIENT_SOUNDS.map((sound) => (
          <Card
            key={sound.id}
            className={`bg-card border-border p-6 cursor-pointer transition-all hover:shadow-lg ${
              playingSound === sound.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => playSound(sound.id)}
          >
            <div
              className={`bg-gradient-to-br ${sound.color} rounded-lg p-8 mb-4 flex items-center justify-center`}
            >
              {playingSound === sound.id ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </div>
            <h3 className="font-semibold text-foreground mb-1">{sound.name}</h3>
            <p className="text-sm text-muted-foreground">{sound.description}</p>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="bg-secondary/10 border-border p-4">
        <p className="text-sm text-muted-foreground">
          Click any sound to play or pause. Adjust the volume slider to control
          the audio level. Only one sound can play at a time.
        </p>
      </Card>
    </div>
  );
}
