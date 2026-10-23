import { useEffect, useState } from 'react';
import { Field } from '../components/Field';
import { SideNav } from '../components/Settings/Sidenav';
import { SearchResults } from '../components/Settings/SearchResults';
import { Panel } from '../components/Settings/Panel';
import { usePlayer } from "../hooks/player";

export default function Settings() {
    const { settingCat: cat, setSettingCat: setCat } = usePlayer();
    const [q, setQ] = useState('');
    const searching = q.trim().length > 0;
    const [isSearching, setSearching] = useState<boolean>(searching)
    useEffect(()=>{
        setSearching(searching)
    }, [q])

    return (
        <div className="flex h-full min-h-0 select-none">
            <SideNav
                cat={cat}
                setCat={setCat}
                disabled={false}
            />

            <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="p-4 px-7.5 pt-4 max-w-[720px]">
                    <Field
                        icon="search"
                        placeholder="Search settings…"
                        value={q}
                        onValue={setQ}
                        className='select-text'
                    />
                </div>

                <div className="px-7.5 pb-15 max-w-[720px]">
                    {isSearching ? <SearchResults query={q} cat={cat} setCat={setCat} setSearching={setSearching} /> : <Panel cat={cat} />}
                </div>
            </div>
        </div>
    );
}
