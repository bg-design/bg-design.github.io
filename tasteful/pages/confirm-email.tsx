import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../lib/supabase'

export default function ConfirmEmail() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the access token from the URL
        const { access_token, refresh_token } = router.query

        if (access_token && refresh_token) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          })

          if (error) {
            setError('Invalid or expired confirmation link. Please try signing up again.')
          } else {
            setSuccess(true)
            // Redirect to home page after 3 seconds
            setTimeout(() => {
              router.push('/')
            }, 3000)
          }
        } else {
          setError('Invalid confirmation link. Please check your email and try again.')
        }
      } catch (error) {
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (router.isReady) {
      handleEmailConfirmation()
    }
  }, [router.isReady, router.query])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-bold text-gray-900">Tasteful</h1>
            <div className="mt-6 text-center">
              <div className="text-xl">Confirming your email...</div>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Tasteful</h1>
          
          {success ? (
            <div className="mt-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Email Confirmed!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your account has been successfully created and confirmed. You'll be redirected to the app in a few seconds...
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to App Now
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Confirmation Failed</h2>
              <p className="mt-2 text-sm text-gray-600">
                {error}
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Signing Up Again
                </button>
                <button
                  onClick={() => router.push('/signin')}
                  className="w-full text-blue-600 hover:text-blue-500 text-sm"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 