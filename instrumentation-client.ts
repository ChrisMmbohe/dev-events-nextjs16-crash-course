import posthog from 'posthog-js'

// Only initialize PostHog if required environment variables are present
if (
    typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string' && 
    typeof process.env.NEXT_PUBLIC_POSTHOG_HOST === 'string'
) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24'
    });
} else {
    console.warn('PostHog not initialized: Missing required environment variables');
}
            