
export default ({ env }: any) => ({
    email: {
      logger: {
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      },
        config: {
          provider: 'mailgun',
          providerOptions: {
            key: env('MAILGUN_API_KEY'), // Required
            domain: env('MAILGUN_DOMAIN'), // Required
          },
          settings: {
            defaultFrom: env('MAILGUN_DEFAULT_FROM'),
            defaultReplyTo: env('MAILGUN_DEFAULT_REPLY_TO'),
          },
        },
    },
    meilisearch: {
      config: {
        // Your meili host
        host: 'http://localhost:7700',
        // Your master key or private key
        apiKey: 'masterKey',
      },
    },
});
