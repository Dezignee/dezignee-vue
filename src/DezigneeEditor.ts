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
import type { DezigneeEditorInstance } from './types';

let nextContainerId = 0;

const noop = () => {};

function shallowEqual(a: EditorTheme | undefined, b: EditorTheme | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => key in b && a[key] === b[key]);
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

export const DezigneeEditor = defineComponent({
  name: 'DezigneeEditor',
  props: {
    sessionToken: { type: String, required: true },
    refreshToken: Function as PropType<() => Promise<string>>,
    onReady: Function as PropType<() => void>,
    onSessionRefreshFailed: Function as PropType<() => void>,
    onAgentEdit: Function as PropType<(event: AgentEditEvent) => void>,
    onSelectionChange: Function as PropType<(selection: EditorSelection | null) => void>,
    onSaveStateChange: Function as PropType<(state: SaveState) => void>,
    onChange: Function as PropType<(event: DesignChangeEvent) => void>,
    onRateLimited: Function as PropType<() => void>,
    onCreditsExhausted: Function as PropType<(credits: AICredits) => void>,
    onPurchaseCredits: Function as PropType<(request: AICreditsPurchaseRequest) => void | Promise<void>>,
    onLoad: Function as PropType<(editor: DezigneeEditorInstance) => void>,
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
    themeMode: String as PropType<'light' | 'dark' | 'system'>,
    documents: Object as PropType<DocumentsOptions>,
    navigation: Object as PropType<Navigation>,
    autoSave: Object as PropType<InitOptions['autoSave']>,
    controls: Object as PropType<InitOptions['controls']>,
    addData: Object as PropType<InitOptions['addData']>,
    toast: Object as PropType<InitOptions['toast']>,
    author: Object as PropType<PostAuthor>,
    sidebar: Object as PropType<InitOptions['sidebar']>,
    fonts: Object as PropType<InitOptions['fonts']>,
    displayConditions: Array as PropType<InitOptions['displayConditions']>,
    brandColors: Array as PropType<InitOptions['brandColors']>,
    mergeTags: Object as PropType<InitOptions['mergeTags']>,
    dataSources: Array as PropType<InitOptions['dataSources']>,
    id: String,
  },
  setup(props, { expose }) {
    const container = ref<HTMLElement | null>(null);
    const editor = shallowRef<DezigneeEditorInstance | null>(null);
    let generation = 0;
    let editorReady = false;
    let applied: { theme?: EditorTheme; themeMode?: 'light' | 'dark' | 'system' } = {};
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
      const { theme, themeMode } = props;
      const themeChanged = !shallowEqual(theme, applied.theme);
      const modeChanged = themeMode !== applied.themeMode;
      if (!themeChanged && !modeChanged) return;
      applied = { theme, themeMode };
      const nextTheme = themeChanged ? theme : undefined;
      const nextMode = modeChanged ? themeMode : undefined;
      if (nextTheme === undefined && nextMode === undefined) return;
      current.setTheme(nextTheme, nextMode);
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
          onSessionRefreshFailed: () => props.onSessionRefreshFailed?.(),
          onAgentEdit: props.onAgentEdit ? (event) => props.onAgentEdit?.(event) : undefined,
          onSelectionChange: (selection) => props.onSelectionChange?.(selection),
          onSaveStateChange: (state) => props.onSaveStateChange?.(state),
          onChange: (event) => props.onChange?.(event),
          onRateLimited: () => props.onRateLimited?.(),
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
          themeMode: props.themeMode,
          documents: withNavigation(props.documents, props.navigation),
          autoSave: props.autoSave,
          controls: props.controls,
          addData: props.addData,
          toast: props.toast,
          author: props.author,
          sidebar: props.sidebar,
          fonts: props.fonts,
          displayConditions: props.displayConditions,
          brandColors: props.brandColors,
          mergeTags: props.mergeTags,
          dataSources: props.dataSources,
        };
        applied = { theme: props.theme, themeMode: props.themeMode };
        appliedNavigation = { ...props.navigation };
        editorReady = false;

        const pending = init(options);
        settled = pending.then(noop, noop);
        let instance: DezigneeEditorInstance;
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
        props.assets ? `${props.assets.deleteAsset ? 'd' : '-'}${props.assets.listAssets ? 'l' : '-'}` : '',
        props.documents,
        props.newCollection,
        props.autoSave,
        props.controls,
        props.addData,
        props.toast,
        props.author,
        props.sidebar,
        props.fonts,
        props.displayConditions,
        props.brandColors,
      ]),
    );

    onMounted(start);
    onBeforeUnmount(stop);
    watch(remountKey, () => {
      stop();
      start();
    });
    watch(() => [props.themeMode, props.theme && { ...props.theme }], syncTheme);
    watch(() => props.navigation && { ...props.navigation }, syncNavigation);

    expose({ editor });
    return () => h('div', { ref: container, id: props.id });
  },
});
