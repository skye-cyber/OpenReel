import { useState } from 'react';
import { Field } from '../components/Field';
import { SideNav } from '../components/Settings/Sidenav';
import { SearchResults } from '../components/Settings/SearchResults';
import { Panel } from '../components/Settings/Panel';
import type { Cat } from '../types/settings';


/* ============================================================
 *  Settings view
 *  ============================================================ */
export default function Settings() {
    const [cat, setCat] = useState<Cat>('video');
    const [q, setQ] = useState('');

    const searching = q.trim().length > 0;

    return (
        <div className="flex h-full min-h-0">
            <SideNav
                cat={cat}
                setCat={setCat}
                disabled={searching}
            />

            <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="p-4 px-7.5 pt-4 max-w-[720px]">
                    <Field
                        icon="search"
                        placeholder="Search settings…"
                        value={q}
                        onValue={setQ}
                    />
                </div>

                <div className="px-7.5 pb-15 max-w-[720px]">
                    {searching ? <SearchResults query={q} cat={cat} setCat={setCat} /> : <Panel cat={cat} />}
                </div>
            </div>
        </div>
    );
}
