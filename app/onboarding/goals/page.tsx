import { redirect } from "next/navigation";
import { getSession, getUserDetails, } from "../../supabase-server";
import { GoalInput } from "@/app/dashboard/GoalInput";



export default async function Onboarding() {
    const session = await getSession()
    const userDetails = await getUserDetails();

    if (!session?.user?.id) {
        return redirect('/signin');
    }


    return (
        // center stuff vertically and horizontally
        <div className="flex flex-col items-center justify-center min-w-screen min-h-[70vh] gap-2">
            <div className="m-auto flex flex-col items-center justify-center gap-2">
                <p className="text-center text-lg font-bold mb-4">
                    Setting a goal will allow Mediar to personalize its behavior to help you get closer to your goal. 🎯🚀
                </p>
                <GoalInput userDetails={userDetails} />
            </div>
        </div>
    )
}

