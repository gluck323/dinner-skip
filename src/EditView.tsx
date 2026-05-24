import type { PersistedState } from './storage';
import type { Preset } from './types';

type Props = {
  state: PersistedState;
  onChange: (next: PersistedState) => void;
  onClose: () => void;
};

const MAX_LABEL = 12;
const MAX_CONTENT = 200;

export default function EditView({ state, onChange, onClose }: Props) {
  const updatePreset = (id: string, patch: Partial<Preset>) => {
    onChange({
      ...state,
      presets: state.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const deletePreset = (id: string) => {
    if (!window.confirm('このプリセットを削除しますか？')) return;
    const remaining = state.presets.filter((p) => p.id !== id);
    onChange({
      presets: remaining,
      activeId:
        state.activeId === id ? remaining[0]?.id ?? '' : state.activeId,
    });
  };

  const addPreset = () => {
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      label: '',
      content: '',
    };
    onChange({
      ...state,
      presets: [...state.presets, newPreset],
      activeId: state.activeId || newPreset.id,
    });
  };

  return (
    <main className="flex h-full w-full flex-col px-6 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide text-slate-300">
          プリセット編集
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          完了
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {state.presets.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">
            プリセットがありません。下のボタンから追加してください。
          </p>
        )}

        {state.presets.map((preset, idx) => (
          <div key={preset.id} className="rounded-2xl bg-slate-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => deletePreset(preset.id)}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                削除
              </button>
            </div>

            <label className="mb-1 block text-xs text-slate-400">タブ名</label>
            <input
              type="text"
              value={preset.label}
              onChange={(e) =>
                updatePreset(preset.id, {
                  label: e.target.value.slice(0, MAX_LABEL),
                })
              }
              maxLength={MAX_LABEL}
              placeholder="例: 夕食不要"
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
            />

            <label className="mb-1 mt-3 block text-xs text-slate-400">
              メッセージ本文
            </label>
            <textarea
              value={preset.content}
              onChange={(e) =>
                updatePreset(preset.id, {
                  content: e.target.value.slice(0, MAX_CONTENT),
                })
              }
              maxLength={MAX_CONTENT}
              rows={3}
              placeholder="例: 今日は夕食いらない"
              className="w-full resize-none rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {preset.content.length} / {MAX_CONTENT}
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={addPreset}
          className="w-full rounded-2xl border-2 border-dashed border-slate-700 py-4 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300"
        >
          + プリセット追加
        </button>
      </div>
    </main>
  );
}
