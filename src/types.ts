import type {
  AgentEditEvent,
  AICredits,
  AICreditsPurchaseRequest,
  AssetsCustomConfig,
  DesignChangeEvent,
  DezigneeEditor as DezigneeEditorInstance,
  EditorSelection,
  EditorTheme,
  DocumentKind,
  DocumentsOptions,
  NavigationStyle,
  InitOptions,
  NewCollectionOptions,
  PostAuthor,
  SaveState,
} from 'dezignee-plugin';

export type { DezigneeEditorInstance };

export interface SharedProps {
  sessionToken: string;
  refreshToken?: () => Promise<string>;
  onReady?: () => void;
  onSessionRefreshFailed?: () => void;
  onAgentEdit?: (event: AgentEditEvent) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onSaveStateChange?: (state: SaveState) => void;
  onChange?: (event: DesignChangeEvent) => void;
  onRateLimited?: () => void;
  onCreditsExhausted?: (credits: AICredits) => void;
  onPurchaseCredits?: (request: AICreditsPurchaseRequest) => void | Promise<void>;
  onLoad?: (editor: DezigneeEditorInstance) => void;
  onError?: (error: Error) => void;
  editorUrl?: string;
  collectionId?: string;
  blockId?: string;
  libraryEntryId?: string;
  newCollection?: NewCollectionOptions;
  userId?: string;
  customerId?: string;
  customerName?: string;
  apiUrl?: string;
  initialPrompt?: string;
  assets?: AssetsCustomConfig;
  theme?: EditorTheme;
  themeMode?: 'light' | 'dark' | 'system';
  documents?: DocumentsOptions;
  /** How people move between the items, per kind: `{ post: 'rail', presentation: 'filmstrip' }`. Unlike `documents`, a change is applied live with `editor.setNavigation()` and does not restart the editor. */
  navigation?: Partial<Record<DocumentKind, NavigationStyle>>;
  autoSave?: InitOptions['autoSave'];
  controls?: InitOptions['controls'];
  addData?: InitOptions['addData'];
  toast?: InitOptions['toast'];
  author?: PostAuthor;
  sidebar?: InitOptions['sidebar'];
  fonts?: InitOptions['fonts'];
  displayConditions?: InitOptions['displayConditions'];
  brandColors?: InitOptions['brandColors'];
  mergeTags?: InitOptions['mergeTags'];
  dataSources?: InitOptions['dataSources'];
  id?: string;
}

export interface DezigneeEditorHandle {
  readonly editor: DezigneeEditorInstance | null;
}

export type DezigneeEditorProps = SharedProps;

type Classified =
  | Exclude<keyof SharedProps, 'onReady' | 'onLoad' | 'onError'>
  | 'ready';
type Assert<T extends true> = T;
export type EveryInitOptionIsClassified = Assert<
  [Exclude<keyof InitOptions, Classified>] extends [never] ? true : false
>;
