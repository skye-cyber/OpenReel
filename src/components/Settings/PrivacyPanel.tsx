import { useState } from "react";
import { Group, Row } from "./Shared";
import { Switch } from "../Switch";

export function PrivacyPanel() {
    const [updateCheck, setUpdateCheck] = useState(true);
    const [netPlugins, setNetPlugins] = useState(true);

    return (
        <>
            <Group>Network</Group>
            <Row
                title="Check for application updates"
                desc="Contacts the release server at most once per day. No identifier is sent."
                control={<Switch on={updateCheck} onChange={setUpdateCheck} label="Check for updates" />}
            />
            <Row
                title="Allow plugins to use the network"
                desc="Individual plugins still declare their own network permission. Turning this off overrides all of them."
                control={<Switch on={netPlugins} onChange={setNetPlugins} label="Allow plugin network access" />}
            />

            <Group>What OpenReel stores</Group>
            <div className="rounded-md p-[12px_16px] bg-surface-2 border border-border text-[12px] leading-relaxed text-text-2">
                Settings, plugin state, the library index, thumbnails, and the log file — all on this
                computer, under your config folder. OpenReel does not collect usage data, does not create
                an account, and does not send anything to a server unless you enable a feature that needs it.
            </div>
        </>
    );
}
