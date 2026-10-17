import { useRef, useState } from 'react';

const TRACKS = [
  { title: 'I love You', url: '/music/i-love-you.mp3' },
  { title: 'Atlantis (Alphasvara Lo-Fi Remix)', url: '/music/atlantis-lofi-remix.mp3' },
  { title: 'Fly, My Wings (lofi)', url: '/music/fly-my-wings-lofi.mp3' },
  { title: 'Line Without A Hook (Alphasvara Lo-Fi Remix)', url: '/music/line-without-a-hook-lofi-remix.mp3' },
  { title: '12:51 (lofi ver. + rain)', url: '/music/12-51-lofi-rain.mp3' },
];

export default function MusicToggle() {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');

  const selectTrack = async event => {
    const nextIndex = Number(event.target.value);
    const audio = audioRef.current;
    const resumePlayback = playing;
    audio?.pause();
    setPlaying(false);
    setError('');
    setTrackIndex(nextIndex);

    if (resumePlayback && audio) {
      audio.src = TRACKS[nextIndex].url;
      try {
        await audio.play();
        setPlaying(true);
      } catch (playError) {
        console.error('Music playback failed:', playError.message);
        setError('Could not play the selected track.');
        setMenuOpen(true);
      }
    }
  };

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
      if (audio.getAttribute('src') !== TRACKS[trackIndex].url) {
        audio.src = TRACKS[trackIndex].url;
      }
      await audio.play();
      setPlaying(true);
      setError('');
    } catch (playError) {
      console.error('Music playback failed:', playError.message);
      setError('Could not play the music file.');
      setMenuOpen(true);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <audio
        ref={audioRef}
        src={TRACKS[trackIndex].url}
        preload="none"
        loop
        className="hidden"
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError('Could not load the music file.');
          setMenuOpen(true);
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
      <button
        type="button"
        onClick={() => setMenuOpen(open => !open)}
        aria-label="Choose music track"
        aria-expanded={menuOpen}
        title="Choose music track"
        className="ml-1 h-9 rounded border border-gray-300 px-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        ▾
      </button>
      {menuOpen && (
        <section
          aria-label="Music selection"
          className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="fitforge-music-track" className="text-sm font-semibold">
              Choose a track
            </label>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close music menu"
            >
              Close
            </button>
          </div>
          <select
            id="fitforge-music-track"
            value={trackIndex}
            onChange={selectTrack}
            className="mt-2 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            {TRACKS.map((track, index) => (
              <option key={track.url} value={index}>{track.title}</option>
            ))}
          </select>
          <p className={`mt-2 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`} role="status">
            {error || (playing ? 'Playing' : 'Music is off')}
          </p>
        </section>
      )}
    </div>
  );
}
