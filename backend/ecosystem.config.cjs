module.exports = {
    apps: [{
        name: 'ecommerce-app',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
            DB_TYPE: 'sqlite'
        },
        env_production: {
            NODE_ENV: 'production',
            DB_TYPE: 'postgres',
            // Ensure DATABASE_URL and PHONEPE keys are set in the environment or here
        }
    }]
};
