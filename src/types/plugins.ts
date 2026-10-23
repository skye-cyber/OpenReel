import type {
  PluginPermissionId,
} from '../types';

/**
 * A plugin entry in a repository catalog. Structurally similar to Plugin
 * but without installation state — the repository doesn't know whether you
 * have this plugin installed.
 */
export interface RepositoryPlugin {
  /** Stable identifier — usually `provider:name`. */
  id: string;
  /** Display name. */
  name: string;
  /** Provider / author. */
  provider: string;
  /** Version of the entry in the repository. */
  version: string;
  /** Short category label — "Visualiser", "Codec", "Subtitle provider", etc. */
  category: string;
  /** One-line description shown in the Available list. */
  description: string;
  /** Paragraph-length description shown in the install confirmation. */
  longDescription?: string;
  /** Provider homepage. */
  homepage?: string;
  /** Permissions this entry requests. */
  permissions: PluginPermissionId[];
  /** Plugin API version this entry targets. */
  apiVersion: string;
  /** Hooks this entry registers. */
  hooks?: string[];
  /** Install size, human-formatted. */
  size?: string;
  /** Package signature status from the repository. */
  signed: boolean;
  /** Compatibility with the current OpenReel version. */
  compatibility: {
    ok: boolean;
    reason?: string;
  };
}

export interface Repository {
  id: string;
  label: string;
  url: string;
  /** Last successful fetch, epoch ms. Null if never fetched. */
  lastFetchedAt: number | null;
}

export interface RepositoryCatalog {
  repository: Repository;
  plugins: RepositoryPlugin[];
  fetchedAt: number;
}

export type AvailableEntry = RepositoryPlugin & {
  repositoryId: string;
  repositoryLabel: string;
  installed: boolean;
  installedVersion?: string;
};
