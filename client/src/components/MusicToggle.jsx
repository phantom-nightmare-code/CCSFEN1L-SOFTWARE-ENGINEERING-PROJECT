import { useRef, useState } from 'react';

const TRACKS = [
  {
    title: 'Music for when you need to escape reality',
    url: import.meta.env.VITE_MUSIC_TRACK_ESCAPE_URL,
  },
  {
    title: 'Endless Dream',
    url: import.meta.env.VITE_MUSIC_TRACK_ENDLESS_URL,
  },
];

export default function MusicToggle() {
  const audioRef = useRef(null);
  const loadedTrack = useRef(null);
  const playRequest = useRef(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState('');

  const startPlayback = async (index) => {
    const requestId = ++playRequest.current;
    const track = TRACKS[index];
    const audio = audioRef.current;
    if (!audio) return;

    if (!track.url) {
      setError('Add this track’s public R2 URL in the Cloudflare Pages environment variables.');
      setPanelOpen(true);
      setPlaying(false);
      return;
    }

    if (loadedTrack.current !== index) {
      audio.pause();
      audio.src = track.url;
      audio.load();
      loadedTrack.current = index;
    }

    try {
      await audio.play();
      if (playRequest.current !== requestId) {
        audio.pause();
        return;
      }
      setError('');
      setPlaying(true);
    } catch (playError) {
      if (playRequest.current !== requestId) return;
      console.error('Music playback failed:', playError.message);
      setError('Could not play this track. Check its R2 URL and public access.');
      setPlaying(false);
      setPanelOpen(true);
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (playing) {
      playRequest.current += 1;
      audio?.pause();
      setPlaying(false);
      setError('');
      return;
    }

    setPanelOpen(true);
    startPlayback(trackIndex);
  };

  const selectTrack = event => {
    const nextIndex = Number(event.target.value);
    const resumePlayback = playing;
    const audio = audioRef.current;
    playRequest.current += 1;
    audio?.pause();
    setPlaying(false);
    setError('');
    setTrackIndex(nextIndex);
    loadedTrack.current = null;
    if (resumePlayback) startPlayback(nextIndex);
  };

  return (
    <>
      <audio ref={audioRef} preload="none" loop onError={() => {
        setPlaying(false);
        setError('Could not load this track. Check its R2 URL and public access.');
        setPanelOpen(true);
      }} />
      <div className="relative">
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

        {panelOpen && (
          <section
            aria-label="Music selection"
            className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="fitforge-music-track" className="text-sm font-semibold">
                FitForge music
              </label>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
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
                <option key={track.title} value={index}>{track.title}</option>
              ))}
            </select>
            <p className={`mt-2 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`} role="status">
              {error || (playing ? 'Playing' : 'Music is off')}
            </p>
          </section>
        )}
      </div>
    </>
  );
}
