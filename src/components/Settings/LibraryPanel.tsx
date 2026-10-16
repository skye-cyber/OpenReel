import { useState } from "react";
import { Group, Row } from "./Shared";
import { Switch } from "../Switch";
import { Button } from "../Button";

export function LibraryPanel() {
    const [watch, setWatch] = useState(true);
    const [thumbs, setThumbs] = useState(true);

    return (
        <>
            <Group>Sources</Group>
            <Row
                title="Indexed folders"
                desc="2 folders · 8 412 items"
                control={
                    <>
                        <Button size="sm">Manage…</Button>
                        <Button size="sm" icon="plus">Add folder</Button>
                    </>
                }
            />
            <Row
                title="Watch for changes"
                changed
                desc="Updates the index when files are added, moved, or removed. Falls back to a periodic rescan on filesystems without watch support."
                control={<Switch on={watch} onChange={setWatch} label="Watch for changes" />}
            />

            <Group>Thumbnails</Group>
            <Row
                title="Generate thumbnails"
                desc="Creates preview images for grid view. Runs at low priority in the background."
                control={<Switch on={thumbs} onChange={setThumbs} label="Generate thumbnails" />}
            />
            <Row
                title="Thumbnail cache"
                desc="184 MB used of 500 MB."
                control={
                    <>
                        <Button size="sm" icon="trash">Clear cache</Button>
                    </>
                }
            />

            <Group>Maintenance</Group>
            <Row
                title="Rebuild index"
                desc="Deletes and recreates the search index. Play history and play counts are preserved."
                control={<Button size="sm">Rebuild</Button>}
            />
            <Row
                title="Remove library"
                desc="Removes the index entirely. Your files are not touched."
                control={<Button size="sm">Remove…</Button>}
            />
        </>
    );
}
