import { NextResponse } from 'next/server';
import { MetriportDevicesApi } from "@metriport/api-sdk";
import { syncHealthData } from '@/app/metriport';

// export const runtime = 'edge'
export const maxDuration = 200


export async function POST(req: Request) {
  const { userId, timezone, metriportUserId } = await req.json()
  try {

    const metriportClient = new MetriportDevicesApi(process.env.METRIPORT_API_KEY!, {
      sandbox: false, // set to true to use the sandbox environment
    });

    // use user timezone
    // Error: Error: date must be in format YYYY-MM-DD!
    const usersDate = new Date(new Date().toLocaleDateString('en-US', { timeZone: timezone })).toISOString().split('T')[0];
    console.log('User date:', usersDate, timezone);

    const activitiesPromise = metriportClient.getActivityData(metriportUserId, usersDate);
    const biometricsPromise = metriportClient.getBiometricsData(metriportUserId, usersDate);
    const bodiesPromise = metriportClient.getBodyData(metriportUserId, usersDate);
    const nutritionPromise = metriportClient.getNutritionData(metriportUserId, usersDate);
    const sleepPromise = metriportClient.getSleepData(metriportUserId, usersDate);

    const [activities, biometrics, bodies, nutrition, sleep] = await Promise.all([activitiesPromise, biometricsPromise, bodiesPromise, nutritionPromise, sleepPromise]);

    await syncHealthData(activities, biometrics, bodies, nutrition, sleep, userId);

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.log("Error:", error);
    return NextResponse.json({ message: "Error" }, { status: 200 });
  }
}


