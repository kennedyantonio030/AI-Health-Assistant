'use client'

import { useEffect, useState } from 'react';
import { Session, createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { Input } from './input';
import toast, { Toaster } from 'react-hot-toast';
import { Database } from '@/types_db';
import { VerificationData, VerificationResponse } from '@/app/whatsapp-server';
import OtpInput from 'react-otp-input';
import PhoneInput from 'react-phone-number-input';

import 'react-phone-number-input/style.css';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type UserDetails = Database['public']['Tables']['users']['Row'];

interface Prop {
    session: Session;
    startVerification: (phoneNumber: string) => Promise<VerificationData>;
    verifyOtp: (phoneNumber: string, otp: string) => Promise<VerificationResponse>;
    subscription?: Subscription;
    userDetails?: UserDetails;
    className?: string;
}

export default function WhatsappConnect({ session, subscription, userDetails, startVerification, verifyOtp, className }: Prop) {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(userDetails?.phone || '');
    const [phoneNumberError, setPhoneNumberError] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);

    useEffect(() => {
        validatePhoneNumber(phoneNumber);
    }, [phoneNumber]);


    console.log(otp);

    const handlePaste = (e: any) => {
        e.preventDefault();

        const pastedData = e.clipboardData.getData('text/plain');
        const regex = /^\d{6}$/;

        const pastedDataNumeric = pastedData.replace(/\D/g, '').split('').slice(0, 6).join('')
        console.log(pastedDataNumeric);
        if (regex.test(pastedDataNumeric)) {
            console.log(pastedDataNumeric);
            setOtp(pastedDataNumeric);
        }
    };
    useEffect(() => {
        if (otp.length === 6) {
            const verifyOTP = async () => {
                const id = toast.loading('Verifying OTP...');
                try {
                    console.log('verify otp');
                    const response = await verifyOtp(phoneNumber, otp);
                    if (response.status !== 'approved') throw new Error('Invalid OTP:' + response);
                    setShowOtpInput(false);
                    const { error } = await supabase.from('users').update({
                        phone: phoneNumber,
                        phone_verified: true
                    }).eq('id', session.user?.id);

                    toast.success('WhatsApp connected successfully!', { id });
                    toast.success('You should receive a welcome message on WhatsApp shortly.', { id });
                } catch (error: any) {
                    console.error(error);
                    toast.error('Error verifying OTP. Please try again.', { id });
                }
            }

            verifyOTP();
        }
    }, [otp]);

    const validatePhoneNumber = (number: string) => {
        const regex = /^\+[1-9]\d{1,14}$/;
        if (!regex.test(number)) {
            setPhoneNumberError('Invalid phone number');
            return false;
        }
        setPhoneNumberError('');
        return true;
    }

    const handleConnect = async () => {
        if (!validatePhoneNumber(phoneNumber)) {
            return;
        }
        setLoading(true);

        const { error } = await supabase.from('users').update({
            phone: phoneNumber,
            phone_verified: false
        }).eq('id', session.user?.id);

        if (error) throw error;

        const toastId = toast.loading('Sending you a WhatsApp message...', { duration: 2000 });

        try {
            await startVerification(phoneNumber);
            setShowOtpInput(true);

        } catch (error: any) {
            console.error(error);
            toast.error('Error connecting WhatsApp. Please try again.', { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={"bg-white rounded-lg shadow p-6 flex flex-col items-center " + className}>
            <Toaster />

            <h2 className="text-2xl font-bold mb-4">Connect WhatsApp</h2>

            <p className="text-gray-500 mb-4">
                Connect your WhatsApp account to receive insights and send tags directly on WhatsApp.
            </p>

            <PhoneInput
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(n) => setPhoneNumber(n || '')}
                className="mb-4 text-black"
            />

            {phoneNumberError && <p className="text-red-500 my-2">{phoneNumberError}</p>}

            {
                showOtpInput && (
                    <div
                        // center   
                        className="flex justify-center mb-4 text-black "

                    >
                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            numInputs={6}
                            inputType='number'
                            renderSeparator={<span> | </span>}
                            inputStyle={{
                                width: '2rem',
                            }}
                            renderInput={(props, i) => <Input
                                {...props}
                                onPaste={handlePaste}
                                className="font-bold text-center w-16 m-0.5 p-1 rounded border flex justify-center  text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 border-gray-700"
                                maxLength={1}
                                type="tel"
                                pattern="[0-9]*"
                            />}
                        />
                    </div>
                )
            }

            <Button
                onClick={handleConnect}
                disabled={loading || phoneNumberError !== ''}
                className="mx-auto w-[200px] p-6"
            >
                {
                    loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                }
                Send me a WhatsApp code
            </Button>

            <p className="text-gray-500 mt-4">
                You will receive a WhatsApp message from "Verify" to confirm your number. <br></br>After verifying, you will receive a welcome message from Mediar AI. Any issues, <a href="mailto:louis@mediar.ai" className="text-blue-500 underline">please contact us 🙏</a>.
            </p>
        </div>
    );
}