import { Group, Row } from './Shared';
import { Button } from '../Button';
import { Switch } from '../Switch';
import { usePlayer } from '../../state/PlayerContext';

export function LibraryPanel() {
    const { settings, setSetting, isChanged, resetSetting, toast } = usePlayer();

    return (
        <>
            <Group>Sources</Group>
            <Row
                title="Indexed folders"
                desc="2 folders · 8 412 items"
                control={
                    <>
                        <Button size="sm" onClick={() => toast('Manage folders is not implemented yet')}>Manage…</Button>
                        <Button size="sm" icon="plus" onClick={() => toast('Add folder is not implemented yet')}>Add folder</Button>
                    </>
                }
            />
            <Row
                title="Watch for changes"
                changed={isChanged('watchFolders')}
                onReset={() => resetSetting('watchFolders')}
                desc="Updates the index when files are added, moved, or removed. Falls back to a periodic rescan on filesystems without watch support."
                control={
                    <Switch
                        on={settings.watchFolders}
                        onChange={v => setSetting('watchFolders', v)}
                        label="Watch for changes"
                    />
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
                desc="Deletes and recreates the search index. Play history and play counts are preserved."
                control={<Button size="sm" onClick={() => toast('Rebuilding index…')}>Rebuild</Button>}
            />
            <Row
                title="Remove library"
                desc="Removes the index entirely. Your files are not touched."
                control={<Button size="sm" onClick={() => toast('Remove library is not implemented yet')}>Remove…</Button>}
            />
        </>
    );
}
