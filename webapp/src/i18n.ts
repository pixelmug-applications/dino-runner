import { computed, reactive } from 'vue';

export type AppLocale = 'zh-CN' | 'en-US';

type MessageKey =
  | 'app.title'
  | 'landing.subtitle'
  | 'landing.opening'
  | 'landing.enter'
  | 'landing.retry'
  | 'landing.install'
  | 'status.browserMock'
  | 'status.findingDevice'
  | 'status.deviceReady'
  | 'status.deviceMissing'
  | 'status.launching'
  | 'status.preparing'
  | 'status.switching'
  | 'status.launchReady'
  | 'status.connectingBle'
  | 'status.bleConnected'
  | 'status.commandSent'
  | 'status.unknownError'
  | 'game.last'
  | 'game.best'
  | 'game.status'
  | 'game.difficulty'
  | 'game.easy'
  | 'game.normal'
  | 'game.hard'
  | 'game.jump'
  | 'game.restart'
  | 'game.pause'
  | 'game.resume'
  | 'game.state.running'
  | 'game.state.paused'
  | 'game.state.gameover'
  | 'game.state.ready'
  | 'game.state.unknown'
  | 'ble.connected'
  | 'ble.connecting'
  | 'ble.disconnected'
  | 'ble.retry';

const messages: Record<AppLocale, Record<MessageKey, string>> = {
  'zh-CN': {
    'app.title': '\u6050\u9f99\u66b4\u8d70',
    'landing.subtitle': '\u63a7\u5236\u4e00\u53ea\u5c0f\u6050\u9f99\u8df3\u8dc3\u969c\u788d\uff0c\u6a21\u62df chrome://dino \u6e38\u620f',
    'landing.opening': '\u6b63\u5728\u6253\u5f00...',
    'landing.enter': '\u8fdb\u5165\u6e38\u620f',
    'landing.retry': '\u91cd\u8bd5',
    'landing.install': '\u5728 PixelMug \u4e0a\u5b89\u88c5',
    'status.browserMock': '\u6d4f\u89c8\u5668\u6a21\u62df\u6a21\u5f0f\u3002',
    'status.findingDevice': '\u6b63\u5728\u67e5\u627e PixelMug...',
    'status.deviceReady': 'PixelMug \u5df2\u5c31\u7eea\u3002',
    'status.deviceMissing': '\u8fd8\u6ca1\u6709\u7ed1\u5b9a PixelMug\u3002',
    'status.launching': '\u6b63\u5728\u542f\u52a8\u6050\u9f99\u66b4\u8d70...',
    'status.preparing': '\u6b63\u5728\u51c6\u5907\u811a\u672c...',
    'status.switching': '\u6b63\u5728\u5207\u6362\u5e94\u7528...',
    'status.launchReady': '\u6050\u9f99\u5df2\u7ecf\u8dd1\u8d77\u6765\u4e86\u3002',
    'status.connectingBle': '\u6b63\u5728\u8fde\u63a5 BLE...',
    'status.bleConnected': 'BLE \u5df2\u8fde\u63a5\u3002',
    'status.commandSent': '\u547d\u4ee4\u5df2\u53d1\u9001\u3002',
    'status.unknownError': '\u672a\u77e5\u9519\u8bef',
    'game.last': '\u4e0a\u6b21',
    'game.best': '\u6700\u9ad8',
    'game.status': '\u72b6\u6001',
    'game.difficulty': '\u96be\u5ea6',
    'game.easy': '\u8f7b\u677e',
    'game.normal': '\u6807\u51c6',
    'game.hard': '\u66b4\u8d70',
    'game.jump': '\u8df3\u8dc3',
    'game.restart': '\u91cd\u5f00',
    'game.pause': '\u6682\u505c',
    'game.resume': '\u7ee7\u7eed',
    'game.state.running': '\u66b4\u8d70\u4e2d',
    'game.state.paused': '\u5df2\u6682\u505c',
    'game.state.gameover': '\u649e\u4e0a\u4e86',
    'game.state.ready': '\u51c6\u5907\u597d\u4e86',
    'game.state.unknown': '\u7b49\u5f85\u8fde\u63a5',
    'ble.connected': 'BLE \u5df2\u8fde\u63a5',
    'ble.connecting': '\u6b63\u5728\u8fde\u63a5 BLE ({seconds}s)',
    'ble.disconnected': 'BLE \u672a\u8fde\u63a5',
    'ble.retry': '\u91cd\u8bd5',
  },
  'en-US': {
    'app.title': 'Dino Runner',
    'landing.subtitle': 'Control a tiny dino on PixelMug and jump over obstacles, inspired by chrome://dino.',
    'landing.opening': 'Opening...',
    'landing.enter': 'Enter game',
    'landing.retry': 'Retry',
    'landing.install': 'Install on PixelMug',
    'status.browserMock': 'Browser mock mode.',
    'status.findingDevice': 'Finding PixelMug...',
    'status.deviceReady': 'PixelMug is ready.',
    'status.deviceMissing': 'No PixelMug is bound yet.',
    'status.launching': 'Launching Dino Runner...',
    'status.preparing': 'Preparing script...',
    'status.switching': 'Switching app...',
    'status.launchReady': 'The dino is running.',
    'status.connectingBle': 'Connecting BLE...',
    'status.bleConnected': 'BLE connected.',
    'status.commandSent': 'Command sent.',
    'status.unknownError': 'Unknown error',
    'game.last': 'Last',
    'game.best': 'Best',
    'game.status': 'Status',
    'game.difficulty': 'Difficulty',
    'game.easy': 'Easy',
    'game.normal': 'Normal',
    'game.hard': 'Hard',
    'game.jump': 'Jump',
    'game.restart': 'Restart',
    'game.pause': 'Pause',
    'game.resume': 'Resume',
    'game.state.running': 'Running',
    'game.state.paused': 'Paused',
    'game.state.gameover': 'Game over',
    'game.state.ready': 'Ready',
    'game.state.unknown': 'Waiting',
    'ble.connected': 'BLE connected',
    'ble.connecting': 'Connecting BLE ({seconds}s)',
    'ble.disconnected': 'BLE disconnected',
    'ble.retry': 'Retry',
  },
};

const state = reactive({
  locale: detectLocale(),
});

export const currentLocale = computed(() => state.locale);

export function setLocale(locale: string | null | undefined) {
  state.locale = normalizeLocale(locale);
}

export function t(key: MessageKey, params: Record<string, string | number> = {}) {
  const template = messages[state.locale][key] || messages['en-US'][key] || key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}

function detectLocale(): AppLocale {
  const query = new URLSearchParams(globalThis.location?.search || '');
  return normalizeLocale(
    query.get('lang') ||
      query.get('language') ||
      query.get('locale') ||
      globalThis.navigator?.language,
  );
}

function normalizeLocale(value: string | null | undefined): AppLocale {
  const text = String(value || '').toLowerCase();
  if (text.startsWith('zh')) return 'zh-CN';
  return 'en-US';
}
