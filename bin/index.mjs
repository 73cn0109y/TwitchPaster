import Server from './server';
import dotenv from 'dotenv';

dotenv.config();

const server = new Server({
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: `oauth:${process.env.TWITCH_PASSWORD}`
    }
});

server.on('ready', () => {
    const serverStartStatus = server.start();

    if (serverStartStatus !== 0)
        console.error(`Server failed to connect! (Code: ${serverStartStatus})`);
});