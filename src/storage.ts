import type { Preset } from './types';

export type PersistedState = {
  presets: Preset[];
  activeId: string;
};

const STORAGE_KEY = 'dinner-skip:state:v1';

export function buildDefaultState(): PersistedState {
  const id = crypto.randomUUID();
  return {
    presets: [{ id, label: '夕食不要', content: '今日は夕食いらない' }],
    activeId: id,
  };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const data = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(data.presets)) return buildDefaultState();
    return {
      presets: data.presets,
      activeId: typeof data.activeId === 'string' ? data.activeId : data.presets[0]?.id ?? '',
    };
  } catch {
    return buildDefaultState();
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled in private mode; nothing actionable
  }
}
