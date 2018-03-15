import jsonFile from 'jsonfile';
import path from 'path';
import fs from 'fs';
import Server from './server';
import Events from 'events';

export default class BotManager extends Events.EventEmitter {
    constructor(server) {
        super();

        this._server = server;

        // Hardcoded default channels to join
        this.channels = [
            '#73cn0109y'
        ];
        this.channelsFilePath = path.resolve(process.cwd(), 'channels.json');

        this._loadChannels();
    }

    // Private
    // Self explanitory :P
    _loadChannels() {
        // Check if the file exists and we can Read/Write from/to it
        fs.access(this.channelsFilePath, fs.constants.R_OK | fs.constants.W_OK, error => {
            if (error) {
                if (error.code !== 'ENOENT') // If the error isn't saying the file doesn't exist
                    throw error;
                else { // File doesn't exist... create it 
                    // Because we are creating it
                    // We don't need to write read it again later
                    jsonFile.writeFile(this.channelsFilePath, this.channels, error => {
                        if (error) {
                            console.error(error);
                            throw error;
                        }

                        this.emit('channelsLoaded', data);
                    });
                }
            }

            jsonFile.readFile(this.channelsFilePath, (error, data) => {
                if (error) {
                    console.error(error);
                    throw error; // Throw to restart the bot and try again
                }

                this.channels = data;
                this.emit('channelsLoaded', data);
            });
        });
    }

    // Writes current channels array to json file
    _updateJsonFile() {
        jsonFile.writeFile(this.channelsFilePath, this.channels, error => {
            if (error)
                console.error(error);
        });
    }

    // Public
    // Join a channel if the bot isn't already in it
    joinChannel(channel) {
        return new Promise((resolve, reject) => {
            if (this.isInChannel(channel)) return reject('Already in channel!');

            this._server.client.join(channel)
                .then(data => {
                    this.channels.push(channel);
                    this._updateJsonFile();
                    resolve(`Joined channel ${channel}.`);
                })
                .catch(error => {
                    console.error(error);
                    reject('Error joining channel!');
                });
        });
    }

    // Leave a channel if the bot is in it
    // and the channel owner is using the command
    leaveChannel(channel, username) {
        return new Promise((resolve, reject) => {
            if (!this.isInChannel(channel)) return reject('Not in channel!');
            if (channel !== username) return reject('Only the channel owner can remove me!');

            this._server.client.part(channel)
                .then(data => {
                    const channelIndex = this.channels.indexOf(channel);

                    if (channelIndex !== -1)
                        this.channels.splice(channelIndex, 1);

                    this._updateJsonFile();
                    resolve(`Left channel ${channel}.`);
                })
                .catch(error => {
                    console.error(error);
                    reject('Error leaving channel.');
                });
        });
    }

    // Check if the bot is in the channel
    isInChannel(channel) {
        return (this.channels.indexOf(channel) !== -1);
    }
}