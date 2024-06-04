const AudioRecorder = require('node-audiorecorder');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const randNum = Math.floor(Math.random() * 1000) +1;
// Configuration settings from environment variables or defaults
const config = {
    rate: process.env.RECORD_RATE || 16000,
    channels: process.env.RECORD_CHANNELS || 1,
    bits: process.env.RECORD_BITS || 16,
    silenceDuration: process.env.RECORD_SILENCE || 3  // This now correctly reflects the desired 3 seconds of silence
};

const flacDirectory = path.join(__dirname, 'sendToTranscribe');
if (!fs.existsSync(flacDirectory)) {
    fs.mkdirSync(flacDirectory, { recursive: true });
}

const wavDirectory = path.join(__dirname, 'oldRecordings');
if (!fs.existsSync(wavDirectory)) {
    fs.mkdirSync(wavDirectory, { recursive: true });
}

// Initialize audio recorder with specified configuration
const recorder = new AudioRecorder({
    program: 'sox',
    device: null,  // Specify a device if necessary
    bits: config.bits,
    channels: config.channels,
    encoding: 'signed-integer',
    format: 'S16_LE',
    rate: config.rate,
    type: 'wav',
    silence: config.silenceDuration
});

// File paths
const wavOutput = path.join(wavDirectory, `output${randNum}.wav`);
const flacOutput = path.join(flacDirectory, `output${randNum}.flac`);

// Set up the output file stream
const outputStream = fs.createWriteStream(wavOutput);
outputStream.on('error', (err) => {
    console.error('Error writing to file:', err);
});

// Handle the recording process
const audioStream = recorder.start().stream();
audioStream.on('error', (err) => {
    console.error('Error during recording:', err);
});
audioStream.on('start', () => console.log('Recording started'));
audioStream.on('stop', () => console.log('Recording stopped'));
audioStream.on('pause', () => console.log('Recording paused'));
audioStream.on('resume', () => console.log('Recording resumed'));
audioStream.on('close', () => {
    console.log('Recording stream closed.');
    outputStream.end();  // Ensure to close the file stream as well
    convertToFlac();
});

// Pipe audio stream to output file
audioStream.pipe(outputStream);

// Handle SIGINT to stop recording gracefully
process.on('SIGINT', () => {
    console.log('Received SIGINT. Stopping recorder.');
    recorder.stop();
});

function convertToFlac() {
    const command = `sox ${wavOutput} ${flacOutput}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error converting file: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error during conversion: ${stderr}`);
            return;
        }
        console.log(`Conversion successful: ${stdout}`);
    });
}

