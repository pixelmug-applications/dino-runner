import { computed, reactive, watch } from 'vue';
import { hasJeeWebBridge, loadPixelMug } from '../template/bubbleClient';
import { openMpsApp } from '../template/mpsLaunch';
import { useBleSession } from '../template/bleSession';
import type { AppStatus, DeviceInfo, DinoDifficulty, DinoGameState } from '../types';

type LaunchPhase = 'idle' | 'requesting' | 'preparing' | 'switching' | 'ready' | 'failed';
type DinoEventMessage = {
  event?: string;
  state?: DinoGameState;
  score?: number;
  bestScore?: number;
  difficulty?: DinoDifficulty;
};

const BEST_SCORE_KEY = 'mps-dino-runner-best-score';

const state = reactive({
  status: 'idle' as AppStatus,
  message: '',
  device: null as DeviceInfo | null,
  bleState: 'idle',
  launchPhase: 'idle' as LaunchPhase,
  gameState: 'unknown' as DinoGameState,
  score: 0,
  bestScore: loadBestScore(),
  difficulty: 'normal' as DinoDifficulty,
  lastEvent: '',
});

let bleSession: ReturnType<typeof useBleSession> | null = null;
let dataCleanup: (() => void) | null = null;

function getBle() {
  if (!bleSession) {
    bleSession = useBleSession();
  }
  return bleSession;
}

const busy = computed(() => ['loading', 'installing', 'connecting', 'syncing'].includes(state.status));
const canSend = computed(() => Boolean(state.device) && getBle().isReady.value);
const canEnter = computed(() => state.launchPhase === 'ready');
const statusText = computed(() => {
  if (!state.message) return '';
  return hasJeeWebBridge() ? state.message : `${state.message} Browser mock mode.`;
});
const openButtonLabel = computed(() => {
  if (busy.value) return '正在打开...';
  if (state.launchPhase === 'ready') return '进入游戏';
  if (state.launchPhase === 'failed') return '重试';
  return '在 PixelMug 上安装';
});
const stateLabel = computed(() => {
  if (state.gameState === 'running') return '暴走中';
  if (state.gameState === 'paused') return '已暂停';
  if (state.gameState === 'gameover') return '撞上了';
  if (state.gameState === 'ready') return '准备好了';
  return '等待连接';
});

watch(
  () => state.bestScore,
  (score) => {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.max(0, score || 0)));
  },
);

export function useDinoRunner() {
  async function refreshDevice() {
    state.status = 'loading';
    state.message = '正在查找 PixelMug...';
    try {
      const result = await loadPixelMug();
      state.device = result;
      state.status = result ? 'ready' : 'error';
      state.message = result ? 'PixelMug 已就绪。' : '还没有绑定 PixelMug。';
    } catch (error) {
      state.status = 'error';
      state.message = errorMessage(error);
    }
  }

  async function openOnDevice() {
    if (!state.device) {
      await refreshDevice();
    }

    const target = state.device || (await loadPixelMug());
    if (!target) {
      state.status = 'error';
      state.message = '还没有绑定 PixelMug。';
      return false;
    }

    state.device = target;
    state.status = 'installing';
    state.launchPhase = 'requesting';
    state.message = '正在启动恐龙暴走...';
    try {
      await openMpsApp(target, undefined, {
        onPhase: updateLaunchPhase,
      });
      markLaunchReady();
      return true;
    } catch (error) {
      state.status = 'error';
      state.launchPhase = 'failed';
      state.message = errorMessage(error);
      return false;
    }
  }

  async function connectDevice() {
    const target = state.device || (await loadPixelMug());
    if (!target) {
      state.status = 'error';
      state.message = '还没有绑定 PixelMug。';
      return;
    }

    state.device = target;
    state.status = 'connecting';
    state.message = '正在连接 BLE...';
    const ble = getBle();
    try {
      await ble.ensureConnected(target);
      state.bleState = ble.state.connection;
      state.status = 'connected';
      state.message = 'BLE 已连接。';
      await sendConfig();
    } catch (error) {
      state.status = 'error';
      state.message = errorMessage(error);
    }
  }

  async function jump() {
    await sendCommand('dinoJump');
    if (!hasJeeWebBridge()) {
      mockRunning();
    }
  }

  async function restart() {
    state.score = 0;
    state.gameState = 'running';
    await sendCommand('dinoRestart');
  }

  async function togglePause() {
    if (state.gameState === 'paused') {
      state.gameState = 'running';
      await sendCommand('dinoResume');
    } else {
      state.gameState = 'paused';
      await sendCommand('dinoPause');
    }
  }

  async function setDifficulty(difficulty: DinoDifficulty) {
    state.difficulty = difficulty;
    state.score = 0;
    state.gameState = 'running';
    await sendConfig();
  }

  function bindBleState() {
    refreshDevice();
    const cleanupState = getBle().bindState();
    dataCleanup?.();
    dataCleanup = getBle().bindData(handleBleData);
    return () => {
      cleanupState();
      dataCleanup?.();
      dataCleanup = null;
    };
  }

  return {
    state,
    busy,
    canSend,
    canEnter,
    openButtonLabel,
    stateLabel,
    statusText,
    bindBleState,
    connectDevice,
    jump,
    openOnDevice,
    refreshDevice,
    restart,
    setDifficulty,
    togglePause,
  };
}

async function sendConfig() {
  await sendCommand('dinoSetConfig', {
    difficulty: state.difficulty,
  });
}

async function sendCommand(method: string, params?: Record<string, unknown>) {
  const target = state.device;
  if (!target) return;

  state.status = 'syncing';
  const ble = getBle();
  try {
    await ble.send(target, {
      method,
      id: `dino_${Date.now()}`,
      params,
    });
    state.status = 'connected';
    state.message = '命令已发送。';
  } catch (error) {
    state.status = 'error';
    state.message = errorMessage(error);
  }
}

function handleBleData(event: { message?: unknown }) {
  const message = event.message as DinoEventMessage | undefined;
  if (!message || !message.event) return;

  state.lastEvent = message.event;
  if (message.state) state.gameState = message.state;
  if (typeof message.score === 'number') state.score = Math.max(0, message.score);
  if (typeof message.bestScore === 'number') {
    state.bestScore = Math.max(state.bestScore, message.bestScore);
  }
  if (message.difficulty) state.difficulty = message.difficulty;
  if (message.event === 'dinoGameOver') {
    state.bestScore = Math.max(state.bestScore, state.score);
  }
}

function mockRunning() {
  state.gameState = 'running';
  state.score += 1;
  state.bestScore = Math.max(state.bestScore, state.score);
}

function markLaunchReady() {
  state.status = 'ready';
  state.launchPhase = 'ready';
  state.message = '恐龙已经跑起来了。';
}

function updateLaunchPhase(phase: LaunchPhase) {
  state.launchPhase = phase;
  if (phase === 'requesting') {
    state.message = '正在启动恐龙暴走...';
  } else if (phase === 'preparing') {
    state.message = '正在准备脚本...';
  } else if (phase === 'switching') {
    state.message = '正在切换应用...';
  } else if (phase === 'ready') {
    state.message = '恐龙已经跑起来了。';
  }
}

function loadBestScore() {
  const value = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown error');
}
