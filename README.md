# @dezignee/vue

Vue component that embeds the Dezignee email editor in your product. It wraps the `dezignee-plugin` SDK: it mounts the editor, tears it down when your component unmounts, and keeps the editor in step with your props.

```sh
npm install @dezignee/vue
```

npm 7 and later install the `dezignee-plugin` peer dependency for you. Vue 3.3 and later is supported.

## Usage

```vue
<template>
  <p v-if="!sessionToken">Loading...</p>
  <template v-else>
    <button @click="editor?.editor?.exportHTML()">Export</button>
    <DezigneeEditor
      ref="editor"
      :session-token="sessionToken"
      style="height: 600px"
      @ready="onReady"
    />
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DezigneeEditor, type DezigneeEditorHandle } from '@dezignee/vue';

const editor = ref<DezigneeEditorHandle | null>(null);
const sessionToken = ref<string | null>(null);
const onReady = () => console.log('editor ready');

onMounted(async () => {
  const response = await fetch('/api/dezignee-session', { method: 'POST' });
  sessionToken.value = (await response.json()).sessionToken;
});
</script>
```

The session token comes from your own backend. The component renders one empty container and the editor fills it, so give it a height with `class` or `style`.

## Props and events

`sessionToken` (`session-token` in a template) is required. The rest mirror the plugin's `init()` options (see the plugin's README for what each one does): `refreshToken`, `editorUrl`, `collectionId`, `blockId`, `libraryEntryId`, `newCollection`, `userId`, `customerId`, `customerName`, `apiUrl`, `initialPrompt`, `assets`, `theme`, `themeMode`, `navigation`, `autoSave`, `controls`, `addData`, `toast`, `author`, `sidebar`, `fonts`, `documents`, `displayConditions`, `brandColors`, `mergeTags`, `dataSources`, plus an `id` for the container.

The callbacks are listeners: `@ready`, `@session-refresh-failed`, `@agent-edit`, `@selection-change`, `@save-state-change` and `@rate-limited`. Two more belong to the component: `@load` runs with the editor instance once it has started, and `@error` runs with the error when it could not (a bad token, a failed collection creation, a rate limit). Without an `@error` listener the failure is logged with `console.error`.

What happens when a prop changes after mount:

| | props | behaviour |
|---|---|---|
| applied live | `theme`, `themeMode` | one `setTheme` call, no remount. `theme` is compared by value. Removing `theme` does not reset the editor's colours. Pass a new object rather than mutating a non-reactive one. |
| applied live | `navigation` | `{ post: 'rail', presentation: 'filmstrip' }`: how people move between pages and slides. The editor opens in it, and a change calls `editor.setNavigation(kind, style)`, no remount (`documents` itself is read once, so `documents.<kind>.navigation` would restart the editor). The prop wins over `documents`. Removing a kind does not reset it. |
| always current | the listeners above, and the functions inside `refreshToken`, `agent-edit` and `assets` | the latest function is used from then on, no remount |
| remount | `sessionToken`, `collectionId`, `blockId`, `libraryEntryId`, `editorUrl`, `apiUrl`, `userId`, `customerId`, `customerName`, `id`, `newCollection`, `autoSave`, `controls`, `addData`, `toast`, `author`, `sidebar`, `fonts`, `documents`, `displayConditions`, `brandColors` (by value); `refreshToken`, an `@agent-edit` listener or `assets` appearing, disappearing or changing shape | the editor is destroyed and a fresh one starts in the same container, because the plugin reads these once |
| ignored | `initialPrompt`, `mergeTags`, `dataSources` | `initialPrompt` is a one-shot prompt at startup; `mergeTags` and `dataSources` are sent once at start, change them later with `editor.value.editor.setMergeTags(…)` and `editor.value.editor.setDataSources(…)` |

A remount without `collectionId` creates a new collection. A host that rotates tokens should pass `refreshToken` and leave `sessionToken` alone.

## Calling the editor

`editor.value.editor` (the exposed handle on the component ref) is the plugin's `DezigneeEditor` instance, so every method of the plugin is there (`exportHTML()`, `chat()`, `undo()`, `setTheme()` and the rest). It is `null` until the editor has started and again while it remounts.

## Nuxt and server rendering

`onMounted` never runs on the server, so Nuxt renders only the empty container and mounts the editor on the client. You do not need `<ClientOnly>`; wrapping the component in it is optional.

## Types

The package re-exports every type of `dezignee-plugin`. The plugin's `DezigneeEditor` class is exported as `DezigneeEditorInstance`, because `DezigneeEditor` here is the component.
