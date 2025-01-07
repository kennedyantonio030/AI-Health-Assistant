import { redirect } from "next/navigation";
import { getSession } from "../../supabase-server";
import OuraConnect from "@/components/OuraConnect";
import { getOuraAccessTokenServer } from "@/app/oura-server";



export default async function Onboarding() {
    const session = await getSession()
    if (!session?.user?.id) {
        return redirect('/signin');
    }
    const getOuraAccessTokenServerServer = async (code: string, scopes: string[], redirectUri: string) => {
        'use server'
        return getOuraAccessTokenServer(code, scopes, redirectUri)
    }

    return (
        // center stuff vertically and horizontally
        <div className="flex flex-col items-center justify-center mt-20 gap-2">
            <OuraConnect session={session} onboarding={true}
                // remove shadow
                className='w-4/5 shadow-none'
                getOuraAccessToken={getOuraAccessTokenServerServer} />
            {/* <OuraImport session={session} /> */}
        </div>
    )
}

