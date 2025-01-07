import { redirect } from "next/navigation";
import { getSession, getSubscription, getUserDetails, saveOnboarding } from "../../supabase-server";
import WhatsappConnect from "@/components/ui/WhatsappConnect";
import { checkWhatsAppVerification, startWhatsAppVerification } from "@/app/whatsapp-server";


export default async function Onboarding() {
    const session = await getSession()
    if (!session?.user?.id) {
        return redirect('/signin');
    }
    const [subscription, userDetails] = await Promise.all([
        getSubscription(),
        getUserDetails()
    ]);
    const startVerificationServer = async (to: string) => {
        'use server'
        return startWhatsAppVerification(to)
    }
    const checkVerificationServer = async (to: string, code: string) => {
        'use server'
        return checkWhatsAppVerification(to, code)
    }
    const onFinished = async () => {
        'use server'
        await saveOnboarding(session.user.id);
    }
    return (
        // center stuff vertically and horizontally
        <div className="flex flex-col items-center justify-center mt-20 gap-20">

            <WhatsappConnect session={session} subscription={subscription || undefined} userDetails={userDetails || undefined}
                startVerification={startVerificationServer} verifyOtp={checkVerificationServer}
                className='w-3/5 shadow-none'
            />

        </div>
    )
}

