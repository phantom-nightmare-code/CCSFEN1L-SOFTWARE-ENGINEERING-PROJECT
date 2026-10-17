import { useEffect, useId, useState } from 'react';

const VIDEO_ID = 'g33LSGLwLzo';
const IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

let iframeApiPromise;

function loadIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube player API did not initialize'));
    };

    let script = document.querySelector(`script[src="${IFRAME_API_URL}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = IFRAME_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('error', () => {
      iframeApiPromise = null;
      script.remove();
      reject(new Error('Could not load the YouTube player'));
    }, { once: true });
  });

  return iframeApiPromise;
}

export default function MusicToggle() {
  const playerId = `fitforge-music-${useId().replace(/:/g, '')}`;
  const [enabled, setEnabled] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let player;

    loadIframeApi()
      .then(YT => {
        if (disposed) return;
        player = new YT.Player(playerId, {
          width: '100%',
          height: '200',
          videoId: VIDEO_ID,
          playerVars: {
            autoplay: 1,
            controls: 1,
            loop: 1,
            playlist: VIDEO_ID,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: event => {
              setPlayerReady(true);
              event.target.playVideo();
            },
            onError: () => {
              setError('YouTube could not play this video. Check that the video is available and try again.');
              setEnabled(false);
            },
          },
        });
      })
      .catch(loadError => {
        if (!disposed) {
          console.error('Music player failed to load:', loadError.message);
          setError('Music player could not load. Check your connection and try again.');
          setEnabled(false);
        }
      });

    return () => {
      disposed = true;
      player?.destroy();
      setPlayerReady(false);
    };
  }, [enabled, playerId]);

  const toggleMusic = () => {
    setError('');
    setEnabled(value => !value);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleMusic}
        aria-label={enabled ? 'Turn music off' : 'Turn music on'}
        aria-pressed={enabled}
        title={enabled ? 'Turn music off' : 'Turn music on'}
        className={`w-9 h-9 rounded border flex items-center justify-center transition ${
          enabled
            ? 'border-brand-500 text-brand-600 bg-brand-50 dark:bg-brand-900/30'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
          <path d="M12 3v12.28A4 4 0 1 0 14 19V7h6V3h-8Z" />
          {!enabled && (
            <path d="m3 4.4 1.4-1.4L21 19.6 19.6 21 3 4.4Z" />
          )}
        </svg>
      </button>

      {(enabled || error) && (
        <section
          aria-label="FitForge music player"
          className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">FitForge music</p>
              <p className="truncate text-xs text-gray-500">
                {error || (playerReady ? 'YouTube' : 'Loading YouTube player…')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close music player"
            >
              Close
            </button>
          </div>
          {enabled && (
            <div id={playerId} className="h-[200px] w-full bg-black" />
          )}
          {error && (
            <button
              type="button"
              onClick={toggleMusic}
              className="m-3 rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
            >
              Try again
            </button>
          )}
        </section>
      )}
    </>
  );
}
