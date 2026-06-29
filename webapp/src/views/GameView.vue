<script setup lang="ts">
import { computed } from 'vue';
import { useDinoRunner } from '../state/dinoRunner';
import type { DinoDifficulty } from '../types';

const store = useDinoRunner();
const difficulties: Array<{ id: DinoDifficulty; label: string }> = [
  { id: 'easy', label: '轻松' },
  { id: 'normal', label: '标准' },
  { id: 'hard', label: '暴走' },
];

const pauseLabel = computed(() => (store.state.gameState === 'paused' ? '继续' : '暂停'));
</script>

<template>
  <main class="game-page">
    <section class="score-strip">
      <div>
        <span>当前</span>
        <strong>{{ store.state.score }}</strong>
      </div>
      <div>
        <span>最高</span>
        <strong>{{ store.state.bestScore }}</strong>
      </div>
      <div>
        <span>状态</span>
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

    <section class="difficulty-control" aria-label="难度">
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
      JUMP
    </button>

    <section class="game-actions">
      <button @click="store.restart">重开</button>
      <button @click="store.togglePause">{{ pauseLabel }}</button>
    </section>

    <p v-if="store.statusText.value" :class="store.state.status === 'error' ? 'game-message error' : 'game-message'">
      {{ store.statusText.value }}
    </p>
  </main>
</template>
