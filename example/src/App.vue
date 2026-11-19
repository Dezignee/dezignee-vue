<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DezigneeBuilder, type DezigneeBuilderHandle } from '../../src';

const editor = ref<DezigneeBuilderHandle | null>(null);
const sessionToken = ref<string | null>(null);

onMounted(async () => {
  const response = await fetch('/api/dezignee-session', { method: 'POST' });
  const data: { sessionToken: string } = await response.json();
  sessionToken.value = data.sessionToken;
});
</script>

<template>
  <p v-if="!sessionToken">Loading...</p>
  <template v-else>
    <button @click="editor?.editor?.exportHTML()">Export</button>
    <DezigneeBuilder ref="editor" :session-token="sessionToken" style="height: 600px" />
  </template>
</template>
