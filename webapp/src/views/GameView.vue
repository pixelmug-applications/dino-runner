<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';
import { useDinoRunner } from '../state/dinoRunner';
import type { DinoDifficulty } from '../types';

const store = useDinoRunner();
const difficulties = computed<Array<{ id: DinoDifficulty; label: string }>>(() => [
  { id: 'easy', label: t('game.easy') },
  { id: 'normal', label: t('game.normal') },
  { id: 'hard', label: t('game.hard') },
]);

const pauseLabel = computed(() => (store.state.gameState === 'paused' ? t('game.resume') : t('game.pause')));
</script>

<template>
  <main class="game-page">
    <section class="score-strip">
      <div>
        <span>{{ t('game.current') }}</span>
        <strong>{{ store.state.score }}</strong>
      </div>
      <div>
        <span>{{ t('game.best') }}</span>
        <strong>{{ store.state.bestScore }}</strong>
      </div>
      <div>
        <span>{{ t('game.status') }}</span>
        <strong>{{ store.stateLabel.value }}</strong>
      </div>
    </section>

    <section class="pixel-stage" aria-hidden="true">
      <div class="stage-sky">
        <span class="stage-cloud cloud-a" />
        <span class="stage-cloud cloud-b" />
      </div>
      <span class="stage-dino" />
      <span class="stage-cactus cactus-a" />
      <span class="stage-cactus cactus-b" />
      <span class="stage-ground" />
    </section>

    <section class="difficulty-control" :aria-label="t('game.difficulty')">
      <button
        v-for="item in difficulties"
        :key="item.id"
        :class="{ selected: store.state.difficulty === item.id }"
        @click="store.setDifficulty(item.id)"
      >
        {{ item.label }}
      </button>
    </section>

    <button class="jump-pad" :disabled="!store.canSend.value" @click="store.jump">
      {{ t('game.jump') }}
    </button>

    <section class="game-actions">
      <button @click="store.restart">{{ t('game.restart') }}</button>
      <button @click="store.togglePause">{{ pauseLabel }}</button>
    </section>

    <p v-if="store.statusText.value" :class="store.state.status === 'error' ? 'game-message error' : 'game-message'">
      {{ store.statusText.value }}
    </p>
  </main>
</template>
