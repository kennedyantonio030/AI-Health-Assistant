
import { Neurosity } from '@neurosity/sdk';
import { useState, useEffect } from 'react';
import { Session, createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types_db';
import { neurosity } from '@/utils/neurosity-client';

export function useSyncFocus(session: Session) {
    const supabase = createClientComponentClient<Database>()

    const [isLogged, setIsLogged] = useState(false);

    useEffect(() => {
        neurosity.focus().subscribe((r) => {
            setIsLogged(r !== null)
        })
    }, [])

    useEffect(() => {
        if (!isLogged) return
        console.log("listening to focus now");
        const { unsubscribe } = neurosity.focus().subscribe(async (focus: { probability: any; label: any; }) => {
            console.log("focus", focus);
            const nf = {
                // created_at: focus.timestamp?.toString(),
                probability: focus.probability,
                metadata: {
                    label: focus.label,
                },
                user_id: session.user.id,
            }
            const { error } = await supabase.from('states').insert(nf)
            if (error) {
                console.log("error", error);
                try {
                    unsubscribe();
                } catch { }
            }
        });

        return () => {
            try {
                unsubscribe();
            } catch { }
        }
    }, [isLogged]);
}



function listenToBrain(neurosity: Neurosity, callback: (brainwaves: PowerByBand) => Promise<void>) {
    const { unsubscribe } = neurosity.brainwaves("powerByBand").subscribe((brainwaves) => {
        callback(brainwaves as PowerByBand);
    });

    return unsubscribe
}