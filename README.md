# @dezignee/vue

Vue component that embeds the Dezignee document editor in your product. It wraps the `dezignee-plugin` SDK: it mounts the editor, tears it down when your component unmounts, and keeps the editor in step with your props.

```sh
npm install @dezignee/vue
```

npm 7 and later install the `dezignee-plugin` peer dependency for you. Vue 3.3 and later is supported.

## Usage

```vue
<template>
  <p v-if="!sessionToken">Loading...</p>
  <template v-else>
    <button :disabled="!ready" @click="editor?.editor?.exportHTML()">Export</button>
    <DezigneeBuilder
      ref="editor"
      :session-token="sessionToken"
      style="height: 600px"
      @ready="onReady"
    />
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DezigneeBuilder, type DezigneeBuilderHandle } from '@dezignee/vue';

const editor = ref<DezigneeBuilderHandle | null>(null);
const sessionToken = ref<string | null>(null);
const ready = ref(false);
const onReady = () => { ready.value = true; };

onMounted(async () => {
  const response = await fetch('/api/dezignee-session', { method: 'POST' });
  sessionToken.value = (await response.json()).sessionToken;
});
</script>
```

The session token comes from your own backend. The component renders one empty container and the editor fills it, so give it a height with `class` or `style`.

## Props and events

`sessionToken` (`session-token` in a template) is required. The rest mirror the plugin's `init()` options (see the plugin's README for what each one does): `refreshToken`, `editorUrl`, `collectionId`, `blockId`, `libraryEntryId`, `newCollection`, `userId`, `customerId`, `customerName`, `apiUrl`, `initialPrompt`, `assets`, `theme`, `navigation`, `autoSave`, `controls`, `data.show`, `data.links`, `toast`, `author`, `sidebar`, `fonts`, `documents`, `displayConditions`, `variables`, plus an `id` for the container.

### Listeners and what they receive

| Listener | Receives | When it is called |
|---|---|---|
| `@ready` | nothing | the editor has loaded and can answer; enable your Export button from here. Until then calls that ask the editor something answer at once |
| `@collection-created` | the new `collectionId` | the component made a new email (no `collectionId` was given), once per started editor |
| `@session-refresh-failed` | nothing | the session ended and `refreshToken` could not get a new one: show your sign-in |
| `@agent-edit` | `{ templateId, patch, collectionVersionId }` | an outside AI agent's edit reached this collection (not edits made in the editor, the dashboard or `chat()`) |
| `@selection-change` | `{ templateId, type, id, description }`, or `null` | the selection changed; `null` when nothing is selected |
| `@save-state-change` | `'saving'`, `'saved'` or `'not-saved'` | the editor starts or finishes holding unsent edits; `'not-saved'` means edits were dropped after the server kept failing |
| `@change` | `{ collectionId, documentType, platform, templateIds, source }` | the design changed, whoever changed it; `source` says who (`'editor'`, `'ai'`, `'undo'`, `'redo'`, `'restore'`, `'host'`, `'agent'` or `'other'`) |
| `@rate-limited` | nothing | the editor's request was refused for sending too many; it retries on its own |
| `@credits-exhausted` | `{ limit, used, remaining }` | the customer's AI credits reached 0, once each time |
| `@purchase-credits` | `{ reason: 'low' \| 'exhausted', credits }` | the person pressed "Get more credits"; resolve the promise you return when the credits are added |
| `@load` | the editor instance | the editor has started (the component's own) |
| `@error` | an `Error` | the editor could not start: a bad token, a failed collection creation, a rate limit (the component's own) |

Two of these belong to the component: `@load` runs with the editor instance once it has started (not that it is ready: enable your Export button from `@ready`), and `@error` runs with the error when it could not (a bad token, a failed collection creation, a rate limit). Without an `@error` listener the failure is logged with `console.error`.

What happens when a prop changes after mount:

| | props | behaviour |
|---|---|---|
| applied live | `theme` | one `setTheme` call, no remount. `theme` is compared by value all the way down. Removing `theme` sends an empty one, which clears what the page had set. Pass a new object rather than mutating a non-reactive one. |
| applied live | `navigation` | `{ post: 'rail', presentation: 'filmstrip' }`: how people move between pages and slides. The editor opens in it, and a change calls `editor.setNavigation(kind, style)`, no remount (`documents` itself is read once, so `documents.<kind>.navigation` would restart the editor). The prop wins over `documents`. Removing a kind does not reset it. |
| always current | the listeners above, and the functions inside `refreshToken`, `agent-edit` and `assets` | the latest function is used from then on, no remount |
| remount | `sessionToken`, `collectionId`, `blockId`, `libraryEntryId`, `editorUrl`, `apiUrl`, `userId`, `customerId`, `customerName`, `id`, `newCollection`, `autoSave`, `controls`, `data.show`, `data.links`, `toast`, `author`, `sidebar`, `fonts`, `documents`, `displayConditions` (by value); `refreshToken`, an `@agent-edit` listener or `assets` appearing, disappearing or changing shape | the editor is destroyed and a fresh one starts in the same container, because the plugin reads these once |
| ignored | `initialPrompt`, `variables`, `data.lists`, `brand` | `initialPrompt` is a one-shot prompt at startup; `variables`, `data.lists` and `brand` are sent once at start, change them later with `editor.value.editor.setVariables(…)`, `editor.value.editor.setLists(…)` and `editor.value.editor.setBrand(…)` |

A remount without `collectionId` creates a new collection. A host that rotates tokens should pass `refreshToken` and leave `sessionToken` alone.

## Reopen a customer's email

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { DezigneeBuilder } from '@dezignee/vue';
const session = ref(null);
onMounted(async () => { session.value = await fetch('/api/editor-session', { method: 'POST' }).then((r) => r.json()); });
</script>
<template>
  <DezigneeBuilder v-if="session" :session-token="session.sessionToken" :collection-id="session.collectionId" :customer-id="session.customerId" />
</template>
```

The server half (look up the saved id, else create one and save it) is in the `dezignee-plugin` README, under "Reopen a customer's email"; it answers `{ sessionToken, collectionId, customerId }`, so pass back the `customerId` the server used. Two things to know:

- Changing `collectionId` or `customerId` after the editor has mounted restarts it. Render the editor only once the id is known, and never feed an id back from the editor's own events.
- `@change` fires only when the design changes, so it is not where to learn the id. If you let the component make the email, keep the id from `@collection-created` (send it to your server and save it), and do not pass it back as `collection-id` to the same component: a changed `collectionId` restarts the editor.

```vue
<DezigneeBuilder :session-token="sessionToken" :customer-id="customerId" @collection-created="(id) => saveEmailId(id)" />
```

## Calling the editor

`editor.value.editor` (the exposed handle on the component ref) is the plugin's `DezigneeBuilder` instance, so every method of the plugin is there (`exportHTML()`, `chat()`, `undo()`, `setTheme()` and the rest). It is `null` until the editor has started and again while it remounts.

## Nuxt and server rendering

`onMounted` never runs on the server, so Nuxt renders only the empty container and mounts the editor on the client. You do not need `<ClientOnly>`; wrapping the component in it is optional.

## Types

The package re-exports every type of `dezignee-plugin`. The plugin's `DezigneeBuilder` class is exported as `DezigneeBuilderInstance`, because `DezigneeBuilder` here is the component.

## Upgrading from 0.1

0.2.0 is a breaking change. The component `DezigneeEditor` is renamed `DezigneeBuilder`, and its types `DezigneeEditorHandle`, `DezigneeEditorInstance` and `DezigneeEditorProps` are renamed `DezigneeBuilderHandle`, `DezigneeBuilderInstance` and `DezigneeBuilderProps`. The old names are gone, so rename them in your code when you upgrade. Nothing else changes, and `@dezignee/vue` now needs `dezignee-plugin` 0.2.0.
