import tmi from 'tmi.js';
import dotenv from 'dotenv';
import channels from './channels';
import UTIL from './util';

dotenv.config();

const options = {
    options: {
        debug: process.env.NODE_ENV === 'development'
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: `oauth:${process.env.TWITCH_PASSWORD}`
    },
    channels
};

const userPasteHistory = {};
const userWarningHistory = {};

const client = new tmi.client(options);

client.on('chat', (channel, userstate, message, self) => {
    if (self || !UTIL.isCodeBlock(message)) return;

    // Impose a limit of 1 minute to prevent PasteBin creation spam
    if (userPasteHistory.hasOwnProperty(userstate.username) && userPasteHistory[userstate.username] > Date.now()) {
        // If they try to spam pastebins, don't spam a response
        // We wait 5 seconds between responses if they are spamming
        if (!userWarningHistory.hasOwnProperty(userstate.username) ||
            userWarningHistory[userstate.username] < Date.now()) {
            userWarningHistory[userstate.username] = Date.now() + (5 * 1000);
            client.say(channel, `@${userstate.username}, You can only create Pastebins once every minute!`);
        }

        return;
    }

    userPasteHistory[userstate.username] = Date.now() + (60 * 1000);

    // Create the PastBin
    UTIL.createPaste(message, userstate['display-name'], channel.substring(1))
        .then(response => {
            client.say(channel, `@${userstate.username}, Here is your PasteBin link: ${response}`);
        })
        .catch(error => {
            console.error(error);

            if (userWarningHistory[userstate.username] < Date.now())
                client.say(channel, `@${userstate.username}, There was an issue generating your PasteBin link!`);
        });
});

client.connect();