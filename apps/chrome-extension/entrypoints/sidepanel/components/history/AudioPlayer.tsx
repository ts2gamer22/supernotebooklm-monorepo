/**
 * Audio Player Component
 * Plays downloaded NotebookLM Audio Overviews with controls
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';
import type { AudioOverview } from '@/src/types/search';

interface AudioPlayerProps {
  audio: AudioOverview;
  onDelete: (id: string) => void;
}

export function AudioPlayer({ audio, onDelete }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Create blob URL on mount and cleanup on unmount
  useEffect(() => {
    const url = URL.createObjectURL(audio.audioBlob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audio.audioBlob]);

  // Update current time
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const newTime = parseFloat(e.target.value);
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    audioElement.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleDelete = () => {
    if (confirm('Delete this audio? This cannot be undone.')) {
      // Pause before deleting
      if (audioRef.current) {
        audioRef.current.pause();
      }
      onDelete(audio.id);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-3 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm mb-1">{audio.title}</h4>
          <p className="text-gray-400 text-xs">
            {formatDate(audio.createdAt)} · {formatFileSize(audio.fileSize || 0)} · {formatTime(audio.duration)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-300 ml-2"
          aria-label="Delete audio"
          title="Delete audio"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} src={audioUrl} />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="text-white hover:text-blue-400 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Seek Bar */}
        <input
          type="range"
          min="0"
          max={audio.duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-blue-500
                     [&::-webkit-slider-thumb]:cursor-pointer"
          aria-label="Seek"
        />

        {/* Time Display */}
        <span className="text-gray-400 text-xs whitespace-nowrap min-w-[70px]">
          {formatTime(currentTime)} / {formatTime(audio.duration)}
        </span>

        {/* Playback Speed */}
        <select
          value={playbackSpeed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="bg-gray-700 text-white rounded px-2 py-1 text-xs border border-gray-600 cursor-pointer"
          aria-label="Playback speed"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </div>
  );
}
