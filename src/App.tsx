import { useEffect, useRef, useState } from 'react';
import EditView from './EditView';
import { loadState, saveState, type PersistedState } from './storage';

type Status = 'idle' | 'sending' | 'sent' | 'error';
type View = 'main' | 'edit';

const RESET_AFTER_SENT_MS = 5000;

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [view, setView] = useState<View>('main');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const activePreset =
    state.presets.find((p) => p.id === state.activeId) ?? state.presets[0];

  const send = async () => {
    if (status === 'sending' || status === 'sent') return;
    if (!activePreset || !activePreset.content.trim()) return;

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SHARED_TOKEN ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: activePreset.content }),
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

  if (view === 'edit') {
    return (
      <EditView
        state={state}
        onChange={setState}
        onClose={() => setView('main')}
      />
    );
  }

  const isBusy = status === 'sending' || status === 'sent';
  const canSend =
    !!activePreset && !!activePreset.content.trim() && !isBusy;

  return (
    <main className="flex h-full w-full flex-col px-6 py-8">
      <header className="w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-slate-300">
            夕食スキップ
          </h1>
          <button
            type="button"
            onClick={() => setView('edit')}
            aria-label="プリセットを編集"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <PencilIcon />
          </button>
        </div>

        {state.presets.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {state.presets.map((p) => {
              const isActive = p.id === state.activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setState({ ...state, activeId: p.id })}
                  disabled={isBusy}
                  className={[
                    'whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                  ].join(' ')}
                >
                  {p.label || '(無題)'}
                </button>
              );
            })}
          </div>
        )}

        {activePreset && (
          <p className="mt-4 text-center text-sm text-slate-400 break-words">
            {activePreset.content || '(本文なし — 編集してください)'}
          </p>
        )}
      </header>

      <div className="flex w-full flex-1 items-center justify-center">
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className={[
            'aspect-square w-[80vw] max-w-[360px] rounded-full shadow-2xl',
            'text-2xl font-bold transition-all duration-200',
            'active:scale-95 disabled:opacity-50 disabled:active:scale-100',
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
        {state.presets.length === 0 && (
          <p className="text-sm text-slate-500">
            右上の編集ボタンからプリセットを追加してください
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-rose-400 break-all">
            エラー: {errorMessage}
          </p>
        )}
        {status === 'sent' && (
          <p className="text-sm text-emerald-400">Discordに送信完了</p>
        )}
      </footer>
    </main>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
