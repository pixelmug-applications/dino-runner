<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { LOADING_IMAGE } from '../assets';
import { t } from '../i18n';
import { useDinoRunner } from '../state/dinoRunner';

const store = useDinoRunner();
const showStartText = computed(() => store.state.gameState === 'gameover');
const isPressed = ref(false);
let pressTimer: number | undefined;

function clearPressTimer() {
  if (pressTimer === undefined) return;
  window.clearTimeout(pressTimer);
  pressTimer = undefined;
}

function setPressed(value: boolean) {
  if (!store.canSend.value) return;
  clearPressTimer();
  isPressed.value = value;
}

function releasePressed(delay = 120) {
  clearPressTimer();
  pressTimer = window.setTimeout(() => {
    isPressed.value = false;
    pressTimer = undefined;
  }, delay);
}

function handleJump() {
  if (!store.canSend.value) return;
  setPressed(true);
  releasePressed(160);
  store.jump();
}

onBeforeUnmount(clearPressTimer);
</script>

<template>
  <main class="game-page">
    <section class="jump-hero">
      <button
        class="jump-icon-button"
        :class="{ 'is-text': showStartText, 'is-pressed': isPressed }"
        :disabled="!store.canSend.value"
        :aria-label="showStartText ? 'Press to Start' : t('game.jump')"
        @pointerdown="setPressed(true)"
        @pointerup="releasePressed()"
        @pointercancel="releasePressed(0)"
        @pointerleave="releasePressed(0)"
        @click="handleJump"
      >
        <span v-if="showStartText" class="start-words">
          <span>Press</span>
          <span>to</span>
          <span>Start</span>
        </span>
        <img v-else :src="LOADING_IMAGE" alt="" />
      </button>
    </section>

    <section class="score-strip game-score-strip">
      <div>
        <span>{{ t('game.last') }}</span>
        <strong class="last-score-value">{{ store.state.lastScore }}</strong>
      </div>
      <div>
        <span>{{ t('game.best') }}</span>
        <strong class="best-score-value">{{ store.state.bestScore }}</strong>
      </div>
    </section>
  </main>
</template>