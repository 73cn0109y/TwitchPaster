import tmi from 'tmi.js';
import UTIL from './util';
import BotManager from './botManager';
import Events from 'events';

const DEFAULT_OPTIONS = {
    options: {
        debug: process.env.NODE_ENV === 'development'
    },
    connection: {
        reconnect: true
    }
};

export default class Server extends Events.EventEmitter {
    constructor(_options = {}) {
        super();

        this.options = Object.assign({}, DEFAULT_OPTIONS, _options);

        this.userPasteHistory = {};
        this.userWarningHistory = {};
        this.pasteLinkHistory = {};
        this.client = null;
        this.botManager = null;

        this._initialize();
        this._bindEvents();
    }

    // Private Functions
    _initialize() {
        this.botManager = new BotManager(this);
        this.client = new tmi.client(this.options);
    }

    _bindEvents() {
        this.botManager.on('channelsLoaded', (channels) => {
            this.options.channels = channels;
            this.emit('ready');
        });

        this.client.on('chat', this._handleChatMessage.bind(this));
    }

    _handleChatMessage(channel, userstate, message, self) {
        if (self) return;

        if (message.startsWith('!pastebin'))
            return this._parseCommand(...arguments);

        if (!UTIL.isCodeBlock(message)) return;

        // Impose a limit of 1 minute to prevent PasteBin creation spam
        if (this._getUserPasteHistory(channel, userstate.username) > Date.now()) {
            // If they try to spam pastebins, don't spam a response
            // We wait 5 seconds between responses if they are spamming
            const userWarn = this._getUserWarningHistory(channel, userstate.username);
            if (!userWarn || userWarn < Date.now()) {
                this._setUserWarningHistory(channel, userstate.username);
                this.client.say(channel, `@${userstate.username}, You can only create Pastebins once every minute!`);
            }

            return;
        }

        this._setUserPasteHistory(channel, userstate.username);

        // Create the PastBin
        UTIL.createPaste(message, userstate['display-name'], channel.substring(1))
            .then(response => {
                this._updatePasteLinkHistory(UTIL.getChannel(channel), response);
                this.client.say(channel,
                    `@${userstate.username}, TwitchPaster has generated your PasteBin link: ${response}`);
            })
            .catch(error => {
                console.error(error);

                if (this._getUserWarningHistory(channel, userstate.username) < Date.now())
                    this.client.say(channel,
                        `@${userstate.username}, TwitchPaster had an issue generating you a PasteBin link!`);
            });
    }

    // Process the !pastebin command
    _parseCommand(channel, userstate, message, self) {
        channel = UTIL.getChannel(channel);
        message = message.split(' ');

        if (message.length < 2) return;

        switch (message[1].toLowerCase().trim()) {
            case 'join':
                this.botManager.joinChannel(channel)
                    .then(e => this.client.say(channel, e))
                    .catch(e => this.client.say(channel, e));
                break;
            case 'leave':
                this.botManager.leaveChannel(channel, userstate.username)
                    .then(e => this.client.say(channel, e))
                    .catch(e => this.client.say(channel, e));
                break;
            case 'lastlink':
                this.client.say(channel, this._getLastPastLink(channel));
                break;
        }
    }

    _updatePasteLinkHistory(channel, url) {
        if (!this.pasteLinkHistory.hasOwnProperty(channel))
            this.pasteLinkHistory[channel] = [];

        this.pasteLinkHistory[channel].push({
            url,
            expires: Date.now() + (60 * 60 * 1000) // PasteBin links expire in 1 hour
        });

        // Cleanup old PasteBin links that have expired
        new Promise(() => {
            const links = this.pasteLinkHistory[channel];

            for (let i = links.length - 1; i >= 0; i--) {
                if (links.expires <= Date.now())
                    links.splice(i, 1);
            }
        });
    }

    // Getters
    _getUserPasteHistory(channel, username) {
        channel = (channel.startsWith('#') ? channel.substring(1) : channel);

        if (!this.userPasteHistory.hasOwnProperty(channel))
            return null;

        return this.userPasteHistory[channel][username] || null;
    }

    _getUserWarningHistory(channel, username) {
        channel = (channel.startsWith('#') ? channel.substring(1) : channel);

        if (!this.userWarningHistory.hasOwnProperty(channel))
            return null;

        return this.userWarningHistory[channel][username] || null;
    }

    _getLastPastLink(channel) {
        if (!this.pasteLinkHistory.hasOwnProperty(channel))
            return 'TwitchPaster has no PasteBin links available for this channel!';

        const linkHistory = this.pasteLinkHistory[channel];
        let link = null;
        let index = linkHistory.length - 1;

        while (index >= 0 && link === null) {
            if (linkHistory[index].expires > Date.now()) {
                link = linkHistory[index];
                break;
            }

            index--;
        }

        return `The last PasteBin link generated by TwitchPaster was: ${link.url}`;
    }

    // Setters
    _setUserPasteHistory(channel, username) {
        channel = (channel.startsWith('#') ? channel.substring(1) : channel);

        if (!this.userPasteHistory.hasOwnProperty(channel))
            this.userPasteHistory[channel] = {};

        this.userPasteHistory[channel][username] = Date.now() + (60 * 1000); // Date.now() + 1 min
    }

    _setUserWarningHistory(channel, username) {
        channel = (channel.startsWith('#') ? channel.substring(1) : channel);

        if (!this.userWarningHistory.hasOwnProperty(channel))
            this.userWarningHistory[channel] = {};

        this.userWarningHistory[channel][username] = Date.now() + (5 * 1000); // Date.now() + 5 secs
    }

    // Public Functions
    // Non-Zero return is error
    start() {
        if (!this.client) return 1;

        this.client.connect();
        return 0;
    }
}