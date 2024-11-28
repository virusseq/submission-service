import { migrate } from '@overture-stack/lyric'

import { env } from '@/common/envConfig.js';

try {
    migrate({
        database: env.DB_NAME,
        host: env.DB_HOST,
        password: env.DB_PASSWORD,
        port: env.DB_PORT,
        user: env.DB_USER
    });
} catch (error) {
    console.error(error);
    process.exit(1);
}
