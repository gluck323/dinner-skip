import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const DEFAULT_MESSAGE = '今日は夕食いらない';
const RESET_AFTER_SENT_MS = 5000;

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const send = async () => {
    if (status === 'sending' || status === 'sent') return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SHARED_TOKEN ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
      }

      setStatus('sent');
      resetTimerRef.current = window.setTimeout(() => {
        setStatus('idle');
        resetTimerRef.current = null;
      }, RESET_AFTER_SENT_MS);
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main className="flex h-full w-full flex-col items-center justify-between px-6 py-10">
      <header className="w-full text-center">
        <h1 className="text-xl font-bold tracking-wide text-slate-300">夕食スキップ</h1>
        <p className="mt-2 text-sm text-slate-500">{DEFAULT_MESSAGE}</p>
      </header>

      <div className="flex w-full flex-1 items-center justify-center">
        <button
          type="button"
          onClick={send}
          disabled={status === 'sending' || status === 'sent'}
          className={[
            'aspect-square w-[80vw] max-w-[360px] rounded-full shadow-2xl',
            'text-2xl font-bold transition-all duration-200',
            'active:scale-95',
            status === 'idle' && 'bg-rose-600 hover:bg-rose-500 text-white',
            status === 'sending' && 'bg-amber-500 text-white cursor-wait',
            status === 'sent' && 'bg-emerald-500 text-white',
            status === 'error' && 'bg-rose-700 text-white',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {status === 'idle' && '送信'}
          {status === 'sending' && '送信中...'}
          {status === 'sent' && '送信しました ✓'}
          {status === 'error' && 'もう一度送信'}
        </button>
      </div>

      <footer className="min-h-[3rem] w-full text-center">
        {status === 'error' && (
          <p className="text-sm text-rose-400 break-all">エラー: {errorMessage}</p>
        )}
        {status === 'sent' && (
          <p className="text-sm text-emerald-400">Discordに送信完了</p>
        )}
      </footer>
    </main>
  );
}
