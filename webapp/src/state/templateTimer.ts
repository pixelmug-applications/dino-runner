import { computed, reactive, watch } from 'vue';
import { hasJeeWebBridge, loadPixelMug } from '../template/bubbleClient';
import { openMpsApp } from '../template/mpsLaunch';
import { useBleSession } from '../template/bleSession';
import { createPreset, loadPresets, savePresets } from '../presets';
import type { AppStatus, DeviceInfo, TimerPreset } from '../types';

type LaunchPhase = 'idle' | 'requesting' | 'preparing' | 'switching' | 'ready' | 'failed';

const state = reactive({
  status: 'idle' as AppStatus,
  message: '',
  device: null as DeviceInfo | null,
  bleState: 'idle',
  launchPhase: 'idle' as LaunchPhase,
  businessStatus: 'idle' as AppStatus,
  businessMessage: '',
  presets: loadPresets(),
  quick: {
    id: 'quick',
    name: 'Quick Timer',
    min: 10,
    sec: 0,
    style: 'radar',
  } as TimerPreset,
});

let bleSession: ReturnType<typeof useBleSession> | null = null;

function getBle() {
  if (!bleSession) {
    bleSession = useBleSession();
  }
  return bleSession;
}

const busy = computed(() => ['loading', 'installing', 'connecting', 'syncing'].includes(state.status));
const canSend = computed(() => Boolean(state.device) && getBle().isReady.value);
const statusText = computed(() => {
  if (!state.message) return '';
  return hasJeeWebBridge() ? state.message : `${state.message} Browser mock mode.`;
});
const businessStatusText = computed(() => state.businessMessage);
const canEnter = computed(() => state.launchPhase === 'ready');
const openButtonLabel = computed(() => {
  if (busy.value) return 'Opening...';
  if (state.launchPhase === 'ready') return 'Click to Enter';
  if (state.launchPhase === 'failed') return 'Try Again';
  return 'Open on PixelMug';
});

watch(
  () => state.presets,
  (presets) => savePresets(presets),
  { deep: true },
);

export function useTemplateTimer() {
  async function refreshDevice() {
    state.status = 'loading';
    state.message = 'Loading PixelMug...';
    try {
      const result = await loadPixelMug();
      state.device = result;
      state.status = result ? 'ready' : 'error';
      state.message = result ? 'PixelMug ready.' : 'No PixelMug is bound.';
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
      state.message = 'No PixelMug is bound.';
      return false;
    }

    state.device = target;
    state.status = 'installing';
    state.launchPhase = 'requesting';
    state.message = 'Opening on PixelMug...';
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
      state.message = 'No PixelMug is bound.';
      return;
    }

    state.device = target;
    state.status = 'connecting';
    state.message = 'Connecting BLE...';
    const ble = getBle();
    try {
      await ble.ensureConnected(target);
      state.bleState = ble.state.connection;
      state.status = 'connected';
      state.message = 'BLE connected.';
    } catch (error) {
      state.status = 'error';
      state.message = errorMessage(error);
    }
  }

  async function showTimer(preset: TimerPreset) {
    if (!state.device) return;
    if (preset.min === 0 && preset.sec === 0) {
      state.businessStatus = 'error';
      state.businessMessage = 'Please set a duration.';
      return;
    }

    state.status = 'syncing';
    state.businessStatus = 'syncing';
    state.businessMessage = `Starting ${preset.name}...`;
    const ble = getBle();
    try {
      await ble.send(state.device, {
        method: 'mpySetPixelTimer',
        id: `timer_${Date.now()}`,
        params: {
          min: preset.min,
          sec: preset.sec,
          style: preset.style,
        },
      });
      state.status = 'connected';
      state.businessStatus = 'connected';
      state.businessMessage = `${preset.name} started.`;
    } catch (error) {
      state.status = 'error';
      if (ble.isReady.value) {
        state.businessStatus = 'error';
        state.businessMessage = errorMessage(error);
      } else {
        state.businessMessage = '';
      }
    }
  }

  function savePreset(next: TimerPreset) {
    const index = state.presets.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      state.presets[index] = next;
    } else {
      state.presets.push(next);
    }
  }

  function deletePreset(id: string) {
    state.presets = state.presets.filter((item) => item.id !== id);
  }

  function makeDraft(id?: string) {
    if (!id || id === 'new') return createPreset();
    return state.presets.find((item) => item.id === id) || createPreset();
  }

  function bindBleState() {
    refreshDevice();
    return getBle().bindState();
  }

  return {
    state,
    busy,
    canSend,
    canEnter,
    openButtonLabel,
    statusText,
    businessStatusText,
    bindBleState,
    connectDevice,
    deletePreset,
    makeDraft,
    openOnDevice,
    refreshDevice,
    savePreset,
    showTimer,
  };
}

function markLaunchReady() {
  state.status = 'ready';
  state.launchPhase = 'ready';
  state.message = 'Ready on PixelMug.';
}

function updateLaunchPhase(phase: LaunchPhase) {
  state.launchPhase = phase;
  if (phase === 'requesting') {
    state.message = 'Opening on PixelMug...';
  } else if (phase === 'preparing') {
    state.message = 'Preparing app...';
  } else if (phase === 'switching') {
    state.message = 'Switching app...';
  } else if (phase === 'ready') {
    state.message = 'Ready on PixelMug.';
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown error');
}
