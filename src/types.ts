import type {
  AgentEditEvent,
  AICredits,
  AICreditsPurchaseRequest,
  AssetsCustomConfig,
  DesignChangeEvent,
  DezigneeBuilder as DezigneeBuilderInstance,
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

export type { DezigneeBuilderInstance };

export interface SharedProps {
  sessionToken: string;
  refreshToken?: () => Promise<string>;
  onReady?: () => void;
  onCollectionCreated?: (collectionId: string) => void;
  onSessionRefreshFailed?: () => void;
  onAgentEdit?: (event: AgentEditEvent) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onSaveStateChange?: (state: SaveState) => void;
  onChange?: (event: DesignChangeEvent) => void;
  onRateLimited?: () => void;
  /** Called once when the editor finds that this page was updated while it stayed open. Passing it turns the editor's own notice off: show yours. */
  onUpdateAvailable?: () => void;
  onCreditsExhausted?: (credits: AICredits) => void;
  onPurchaseCredits?: (request: AICreditsPurchaseRequest) => void | Promise<void>;
  onLoad?: (editor: DezigneeBuilderInstance) => void;
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
  documents?: DocumentsOptions;
  /** How people move between the items, per kind: `{ post: 'rail', presentation: 'filmstrip' }`. Unlike `documents`, a change is applied live with `editor.setNavigation()` and does not restart the editor. */
  navigation?: Partial<Record<DocumentKind, NavigationStyle>>;
  autoSave?: InitOptions['autoSave'];
  controls?: InitOptions['controls'];
  data?: InitOptions['data'];
  toast?: InitOptions['toast'];
  /** Your own words for the editor's screens, by key. Sent once when the editor starts; changing it remounts the editor. */
  strings?: InitOptions['strings'];
  author?: PostAuthor;
  sidebar?: InitOptions['sidebar'];
  fonts?: InitOptions['fonts'];
  displayConditions?: InitOptions['displayConditions'];
  variables?: InitOptions['variables'];
  /** A brand for this session only: the parts it names replace the customer's saved brand while the session lasts. Saved once when the editor starts; change it later with `editor.setBrand()` on the exposed editor. */
  brand?: InitOptions['brand'];
  /** The direction your page reads, `'ltr'` (the default) or `'rtl'`. Sent once when the editor starts; changing it remounts the editor. */
  direction?: InitOptions['direction'];
  /** `'board'` opens the collection on its board instead of its first email or page. Read once when the editor starts. */
  initialView?: InitOptions['initialView'];
  id?: string;
}

export interface DezigneeBuilderHandle {
  readonly editor: DezigneeBuilderInstance | null;
}

export type DezigneeBuilderProps = SharedProps;

type Classified =
  | Exclude<keyof SharedProps, 'onReady' | 'onLoad' | 'onError'>
  | 'ready';
type Assert<T extends true> = T;
export type EveryInitOptionIsClassified = Assert<
  [Exclude<keyof InitOptions, Classified>] extends [never] ? true : false
>;
