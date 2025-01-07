'use client'
import { FC, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Label } from '../../components/ui/label'
import { getURL } from '@/utils/helpers'
import posthog from 'posthog-js'
import { Icons } from '@/components/ui/icons'
import toast, { Toaster } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { H } from '@highlight-run/next/client';

interface Props { }

const SignUpForm: FC<Props> = () => {
    const supabase = createClientComponentClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [checkMail, setCheckMail] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const baseUrl = getURL().replace(/\/$/, '')

    console.log(baseUrl + '/auth/callback')
    const signUp = async () => {
        setIsLoading(true)
        const id = toast.loading('Signing up...')
        // remove trailing slash
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: baseUrl + '/auth/callback',
            }
        })
        if (error) {
            console.log(error)
            H.consumeError(error)
            return toast.error(error.message, { id })
        }
        setIsLoading(false)

        toast.success('Signed up successfully, check your email for confirmation', { id })

        setCheckMail(true)

        posthog.capture('sign up', {
            email: data.user?.email,
        })

    }

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: baseUrl + '/auth/callback',
            }
        })

        if (error) {
            H.consumeError(error)
            return toast.error(error.message)
        }
    }

    return (
        <div className="flex flex-col justify-between max-w-lg p-6 mx-auto w-80">
            <Toaster />

            <div className="flex flex-col">

                {/* <form className="w-full"> */}
                <div className="flex flex-col space-y-2">

                    <div className="flex flex-col space-y-1">
                        <Label className="block font-medium text-gray-600">Email</Label>
                        <Input
                            type="email"
                            placeholder="Email"
                            className="border p-2 rounded w-full text-black"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <Label className="block font-medium text-gray-600">Password</Label>
                        <Input
                            type="password"
                            placeholder="Password"
                            className="border p-2 rounded w-full text-black"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                </div>

                <Button
                    type="submit"
                    className='w-full mt-4'
                    onClick={signUp}
                >
                    {
                        isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    }
                    Sign Up
                </Button>

                <div className="flex items-center justify-between">
                    <div className="border-b w-full" />
                    <div className="text-xs text-gray-500 px-2">or</div>
                    <div className="border-b w-full" />
                </div>

                <a
                    href="/signin"
                    className="block text-center text-gray-500 hover:underline"
                >
                    Already have an account? Sign in
                </a>
                {checkMail &&
                    <p className="text-sm text-center text-red-500">
                        Check email for confirmation
                    </p>
                }
                {/* </form> */}

                <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground text-gray-500">
                            Or continue with
                        </span>
                    </div>
                </div>
                <Button
                    className="text-black p-0 m-0 bg-white"
                    variant="outline"
                    disabled={isLoading} onClick={signInWithGoogle}>
                    {isLoading ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Icons.google className="h-4 w-4" />
                    )}{" "}
                </Button>

            </div>
        </div>
    )
}

export default SignUpForm