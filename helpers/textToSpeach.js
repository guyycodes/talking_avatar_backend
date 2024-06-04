require('dotenv').config({ path: '../.env' })
const AWS = require('aws-sdk');
const fs = require('fs');

// Configure AWS Polly
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const polly = new AWS.Polly();

const params = {
    OutputFormat: 'mp3', // You can also choose other formats like OGG or PCM
    Text: 'Hello, I am your Talking Toaster!',
    VoiceId: 'Joanna' // You can choose different voices
  };

/**
 * Node.js server code to convert text to speech using AWS Polly
 * @returns {Promise<string>} Path to the generated MP3 file
 * @param {string} text - text to convert to audio/speech
 */
const textToSpeech = async (text) => {
    return new Promise((resolve, reject) => {
        let ssml = SSML.replace("__TEXT__", text);
        let params = {
            'Text': ssml,
            'OutputFormat': 'mp3',
            'VoiceId': 'Joanna',
            'TextType': 'ssml'
        };

        let randomString = Math.random().toString(36).substring(2, 7);
        let filename = `./public/speech-${randomString}.mp3`;

        polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                fs.writeFile(filename, data.AudioStream, (err) => {
                    if (err) {
                        reject(err);
                    }
                resolve(`/speech-${randomString}.mp3`);
                console.log('Audio stream created, play it with a suitable player');
                // You can save the audio stream to a file, send it to a speaker, etc.
                });
            }
        });
    });
};

module.exports = textToSpeech;
