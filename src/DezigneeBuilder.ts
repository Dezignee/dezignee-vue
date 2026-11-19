import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { PropType } from 'vue';
import {
  init,
  type AgentEditEvent,
  type AICredits,
  type AICreditsPurchaseRequest,
  type AssetsCustomConfig,
  type DesignChangeEvent,
  type EditorSelection,
  type EditorTheme,
  type DocumentKind,
  type DocumentsOptions,
  type NavigationStyle,
  type InitOptions,
  type NewCollectionOptions,
  type PostAuthor,
  type SaveState,
} from 'dezignee-plugin';
import type { DezigneeBuilderInstance } from './types';

let nextContainerId = 0;

const noop = () => {};

/** Whether two themes hold the same settings. The theme is nested, so the compare goes all the way down: a changed colour is sent, a new object with the same values is not. */
function sameTheme(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => key in right && sameTheme(left[key], right[key]));
}

/** A copy that shares nothing with the prop, so a change made inside the same object is seen. */
function snapshot<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

type Navigation = Partial<Record<DocumentKind, NavigationStyle>>;

/** `documents` with the `navigation` prop's styles in, so the editor opens in them. The prop wins over `documents.<kind>.navigation`. */
function withNavigation(documents: DocumentsOptions | undefined, navigation: Navigation | undefined): DocumentsOptions | undefined {
  if (!navigation) return documents;
  const merged: Record<string, unknown> = { ...documents };
  for (const [kind, style] of Object.entries(navigation)) {
    if (style === undefined) continue;
    const current = (merged[kind] ?? {}) as Record<string, unknown>;
    merged[kind] = { ...current, navigation: { ...(current.navigation as object | undefined), style } };
  }
  return merged as DocumentsOptions;
}

export const DezigneeBuilder = defineComponent({
  name: 'DezigneeBuilder',
  props: {
    sessionToken: { type: String, required: true },
    refreshToken: Function as PropType<() => Promise<string>>,
    onReady: Function as PropType<() => void>,
    onCollectionCreated: Function as PropType<(collectionId: string) => void>,
    onSessionRefreshFailed: Function as PropType<() => void>,
    onAgentEdit: Function as PropType<(event: AgentEditEvent) => void>,
    onSelectionChange: Function as PropType<(selection: EditorSelection | null) => void>,
    onSaveStateChange: Function as PropType<(state: SaveState) => void>,
    onChange: Function as PropType<(event: DesignChangeEvent) => void>,
    onRateLimited: Function as PropType<() => void>,
    onUpdateAvailable: Function as PropType<() => void>,
    onCreditsExhausted: Function as PropType<(credits: AICredits) => void>,
    onPurchaseCredits: Function as PropType<(request: AICreditsPurchaseRequest) => void | Promise<void>>,
    onLoad: Function as PropType<(editor: DezigneeBuilderInstance) => void>,
    onError: Function as PropType<(error: Error) => void>,
    editorUrl: String,
    collectionId: String,
    blockId: String,
    libraryEntryId: String,
    newCollection: Object as PropType<NewCollectionOptions>,
    userId: String,
    customerId: String,
    customerName: String,
    apiUrl: String,
    initialPrompt: String,
    assets: Object as PropType<AssetsCustomConfig>,
    theme: Object as PropType<EditorTheme>,
    documents: Object as PropType<DocumentsOptions>,
    navigation: Object as PropType<Navigation>,
    autoSave: Object as PropType<InitOptions['autoSave']>,
    controls: Object as PropType<InitOptions['controls']>,
    data: Object as PropType<InitOptions['data']>,
    toast: Object as PropType<InitOptions['toast']>,
    strings: Object as PropType<InitOptions['strings']>,
    author: Object as PropType<PostAuthor>,
    sidebar: Object as PropType<InitOptions['sidebar']>,
    fonts: Object as PropType<InitOptions['fonts']>,
    displayConditions: Array as PropType<InitOptions['displayConditions']>,
    variables: Object as PropType<InitOptions['variables']>,
    brand: Object as PropType<InitOptions['brand']>,
    direction: String as PropType<InitOptions['direction']>,
    initialView: String as PropType<InitOptions['initialView']>,
    id: String,
  },
  setup(props, { expose }) {
    const container = ref<HTMLElement | null>(null);
    const editor = shallowRef<DezigneeBuilderInstance | null>(null);
    let generation = 0;
    let editorReady = false;
    let applied: EditorTheme | undefined;
    let appliedNavigation: Navigation = {};
    let settled: Promise<unknown> = Promise.resolve();

    const syncNavigation = () => {
      const current = editor.value;
      if (!current || !editorReady) return;
      const wanted = props.navigation;
      if (!wanted) return;
      for (const kind of Object.keys(wanted) as DocumentKind[]) {
        const style = wanted[kind];
        if (style === undefined || style === appliedNavigation[kind]) continue;
        appliedNavigation = { ...appliedNavigation, [kind]: style };
        current.setNavigation(kind, style);
      }
    };

    const syncTheme = () => {
      const current = editor.value;
      if (!current || !editorReady) return;
      const theme = snapshot(props.theme);
      if (sameTheme(theme, applied)) return;
      applied = theme;
      // An empty theme is sent too: it clears what the page had set.
      current.setTheme(theme ?? {});
    };

    const start = (): void => {
      const mine = ++generation;
      void (async () => {
        await settled;
        const el = container.value;
        if (mine !== generation || !el) return;
        if (!el.id) el.id = `dezignee-editor-${++nextContainerId}`;

        const options: InitOptions = {
          id: el.id,
          sessionToken: props.sessionToken,
          refreshToken: props.refreshToken
            ? () => props.refreshToken?.() ?? Promise.reject(new Error('Dezignee: refreshToken was removed'))
            : undefined,
          ready: () => {
            editorReady = true;
            syncTheme();
            syncNavigation();
            props.onReady?.();
          },
          onCollectionCreated: (collectionId) => props.onCollectionCreated?.(collectionId),
          onSessionRefreshFailed: () => props.onSessionRefreshFailed?.(),
          onAgentEdit: props.onAgentEdit ? (event) => props.onAgentEdit?.(event) : undefined,
          onSelectionChange: (selection) => props.onSelectionChange?.(selection),
          onSaveStateChange: (state) => props.onSaveStateChange?.(state),
          onChange: (event) => props.onChange?.(event),
          onRateLimited: () => props.onRateLimited?.(),
          onUpdateAvailable: props.onUpdateAvailable ? () => props.onUpdateAvailable?.() : undefined,
          onCreditsExhausted: (credits) => props.onCreditsExhausted?.(credits),
          onPurchaseCredits: props.onPurchaseCredits ? (request) => props.onPurchaseCredits?.(request) : undefined,
          editorUrl: props.editorUrl,
          collectionId: props.collectionId,
          blockId: props.blockId,
          libraryEntryId: props.libraryEntryId,
          newCollection: props.newCollection,
          userId: props.userId,
          customerId: props.customerId,
          customerName: props.customerName,
          apiUrl: props.apiUrl,
          initialPrompt: props.initialPrompt,
          assets: props.assets && {
            provider: 'custom',
            upload: (file) => props.assets!.upload(file),
            deleteAsset: props.assets.deleteAsset
              ? (assetId, src) => props.assets!.deleteAsset!(assetId, src)
              : undefined,
            listAssets: props.assets.listAssets
              ? (params) => props.assets!.listAssets!(params)
              : undefined,
          },
          theme: props.theme,
          documents: withNavigation(props.documents, props.navigation),
          autoSave: props.autoSave,
          controls: props.controls,
          data: props.data,
          toast: props.toast,
          strings: props.strings,
          author: props.author,
          sidebar: props.sidebar,
          fonts: props.fonts,
          displayConditions: props.displayConditions,
          variables: props.variables,
          brand: props.brand,
          direction: props.direction,
          initialView: props.initialView,
        };
        applied = snapshot(props.theme);
        appliedNavigation = { ...props.navigation };
        editorReady = false;

        const pending = init(options);
        settled = pending.then(noop, noop);
        let instance: DezigneeBuilderInstance;
        try {
          instance = await pending;
        } catch (error) {
          if (mine !== generation) return;
          const failure = error instanceof Error ? error : new Error(String(error));
          if (props.onError) props.onError(failure);
          else console.error('[dezignee] the editor failed to start:', failure);
          return;
        }
        if (mine !== generation) {
          instance.destroy();
          el.innerHTML = '';
          return;
        }
        editor.value = instance;
        props.onLoad?.(instance);
      })();
    };

    const stop = (): void => {
      generation++;
      editorReady = false;
      const current = editor.value;
      if (!current) return;
      current.destroy();
      editor.value = null;
      if (container.value) container.value.innerHTML = '';
    };

    const remountKey = computed(() =>
      JSON.stringify([
        props.sessionToken,
        props.collectionId,
        props.blockId,
        props.libraryEntryId,
        props.editorUrl,
        props.apiUrl,
        props.userId,
        props.customerId,
        props.customerName,
        props.id,
        props.refreshToken !== undefined,
        props.onAgentEdit !== undefined,
        props.onPurchaseCredits !== undefined,
        props.onUpdateAvailable !== undefined,
        props.assets ? `${props.assets.deleteAsset ? 'd' : '-'}${props.assets.listAssets ? 'l' : '-'}` : '',
        props.documents,
        props.newCollection,
        props.autoSave,
        props.controls,
        props.data?.show,
        props.data?.links,
        props.toast,
        props.strings,
        props.author,
        props.sidebar,
        props.fonts,
        props.displayConditions,
        props.direction,
      ]),
    );

    onMounted(start);
    onBeforeUnmount(stop);
    watch(remountKey, () => {
      stop();
      start();
    });
    watch(() => snapshot(props.theme), syncTheme);
    watch(() => props.navigation && { ...props.navigation }, syncNavigation);

    expose({ editor });
    return () => h('div', { ref: container, id: props.id });
  },
});
