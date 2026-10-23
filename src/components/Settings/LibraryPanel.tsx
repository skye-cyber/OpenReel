import { useState } from 'react';
import { Group, Row } from './Shared';
import { Button } from '../Button';
import { Switch } from '../Switch';
import { usePlayer } from "../../hooks/player";
import Icon from '../../lib/Icons';

export function LibraryPanel() {
    const {
        settings, setSetting, isChanged, resetSetting,
        toast, watchAvailable,
        folders, removeFolder, removeLibrary,
        addFolderFromPicker, startScan, scan, libraryMeta,
    } = usePlayer();

    const [manageOpen, setManageOpen] = useState(false);
    const [confirmRemoveLibrary, setConfirmRemoveLibrary] = useState(false);

    const scanning = scan?.inProgress ?? false;

    const metaLine = scanning
        ? `Scanning ${scan?.currentFolder ?? ''} · ${(scan?.itemsFound ?? 0).toLocaleString()} items found`
        : libraryMeta.lastScanAt
            ? `${libraryMeta.folders} folder${libraryMeta.folders === 1 ? '' : 's'} · ${libraryMeta.itemCount.toLocaleString()} items`
            : `${libraryMeta.folders} folder${libraryMeta.folders === 1 ? '' : 's'} · not yet scanned`;

    return (
        <>
            <Group>Sources</Group>

            <Row
                title="Indexed folders"
                desc={metaLine}
                control={
                    <>
                        <Button
                            size="sm"
                            onClick={() => setManageOpen(o => !o)}
                            disabled={folders.length === 0}
                        >
                            {manageOpen ? 'Hide' : 'Manage…'}
                        </Button>
                        <Button
                            size="sm"
                            icon="plus"
                            disabled={scanning}
                            onClick={() => void addFolderFromPicker()}
                        >
                            Add folder
                        </Button>
                    </>
                }
            />

            {/* Inline folder list */}
            {manageOpen && (
                <div className="my-3 rounded-md border border-border bg-surface-2 overflow-hidden">
                    {folders.length === 0 ? (
                        <div className="px-3.5 py-4 text-[12px] text-text-3 text-center">
                            No folders are indexed yet.
                        </div>
                    ) : (
                        folders.map((f, i) => (
                            <div
                                key={f.id}
                                className={`flex items-center gap-3 px-3.5 py-2.5
                        ${i < folders.length - 1 ? 'border-b border-border' : ''}`}
                            >
                                <Icon name="folder" size={14} className="text-text-3 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-semibold truncate">{f.label}</div>
                                    <div className="text-[10.5px] text-text-3 font-mono truncate">{f.path}</div>
                                </div>
                                <div className="text-[10.5px] text-text-3 tabular-nums shrink-0">
                                    {f.itemCount.toLocaleString()} items
                                </div>
                                <button
                                    onClick={() => removeFolder(f.id)}
                                    disabled={scanning}
                                    className="w-6 h-6 rounded-sm flex items-center justify-center text-text-3 hover:text-danger hover:bg-hover transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
                                    aria-label={`Remove ${f.label}`}
                                    title={scanning ? 'Wait for the current scan to finish' : 'Remove folder'}
                                >
                                    <Icon name="x" size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <Row
                title="Watch for changes"
                changed={isChanged('watchFolders')}
                onReset={() => resetSetting('watchFolders')}
                desc={
                    watchAvailable
                        ? 'Updates the index when files are added, moved, or removed.'
                        : 'Not available on this build — a full rebuild is required to see new files. Available once the desktop integration lands.'
                }
                control={
                    <div className={watchAvailable ? '' : 'opacity-50 pointer-events-none'}>
                        <Switch
                            on={settings.watchFolders}
                            onChange={v => setSetting('watchFolders', v)}
                            label="Watch for changes"
                        />
                    </div>
                }
            />

            <Group>Thumbnails</Group>
            <Row
                title="Generate thumbnails"
                changed={isChanged('generateThumbnails')}
                onReset={() => resetSetting('generateThumbnails')}
                desc="Creates preview images for grid view. Runs at low priority in the background."
                control={
                    <Switch
                        on={settings.generateThumbnails}
                        onChange={v => setSetting('generateThumbnails', v)}
                        label="Generate thumbnails"
                    />
                }
            />
            <Row
                title="Thumbnail cache"
                desc="184 MB used of 500 MB."
                control={
                    <Button size="sm" icon="trash" onClick={() => toast('Cache cleared')}>
                        Clear cache
                    </Button>
                }
            />

            <Group>Maintenance</Group>
            <Row
                title="Rebuild index"
                desc="Walks every indexed folder again. Play history and play counts are preserved."
                control={
                    <Button
                        size="sm"
                        disabled={scanning || folders.length === 0}
                        onClick={() => startScan()}
                    >
                        {scanning ? 'Scanning…' : 'Rebuild'}
                    </Button>
                }
            />
            <Row
                title="Remove library"
                desc="Removes every indexed folder and the search index. Your files are not touched."
                control={
                    <Button
                        size="sm"
                        disabled={scanning || folders.length === 0}
                        onClick={() => setConfirmRemoveLibrary(true)}
                    >
                        Remove…
                    </Button>
                }
            />

            {confirmRemoveLibrary && (
                <div className="my-3 rounded-md p-3.5 bg-danger-dim border border-[rgba(224,100,92,.3)]">
                    <div className="text-[12.5px] font-semibold mb-1">Remove the library?</div>
                    <div className="text-[11.5px] text-text-2 leading-relaxed mb-3">
                        All {folders.length} indexed folder{folders.length === 1 ? '' : 's'} and their item
                        counts will be cleared. Your media files will not be touched.
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => setConfirmRemoveLibrary(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                                removeLibrary();
                                setConfirmRemoveLibrary(false);
                                setManageOpen(false);
                            }}
                        >
                            Remove library
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

