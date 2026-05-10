const required = ['MONGO_URI', 'JWT_SECRET', 'OPENROUTER_API_KEY', 'CLIENT_URL'];

exports.validateEnv = () => {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
};