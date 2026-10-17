import { useRef, useState } from 'react';

const TRACK_URL = '/music/i-love-you.mp3';

export default function MusicToggle() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      setError('');
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
      setError('');
    } catch (playError) {
      console.error('Music playback failed:', playError.message);
      setError('Could not play the music file.');
    }
  };

  return (
    <div className="relative">
      <audio
        ref={audioRef}
        src={TRACK_URL}
        preload="none"
        loop
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError('Could not load the music file.');
        }}
      />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? 'Turn music off' : 'Turn music on'}
        aria-pressed={playing}
        title={playing ? 'Turn music off' : 'Turn music on'}
        className={`w-9 h-9 rounded border flex items-center justify-center transition ${
          playing
            ? 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-900/30'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
          <path d="M12 3v12.28A4 4 0 1 0 14 19V7h6V3h-8Z" />
          {!playing && <path d="m3 4.4 1.4-1.4L21 19.6 19.6 21 3 4.4Z" />}
        </svg>
      </button>
      {error && (
        <span
          role="status"
          className="absolute right-0 top-11 z-50 w-56 rounded-lg bg-red-600 p-2 text-xs text-white shadow-lg"
        >
          {error}
        </span>
      )}
    </div>
  );
}
