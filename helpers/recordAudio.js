const AudioRecorder = require('node-audiorecorder');
const fs = require('fs');

// Configuration settings from environment variables or defaults
const config = {
    rate: process.env.RECORD_RATE || 16000,
    channels: process.env.RECORD_CHANNELS || 1,
    bits: process.env.RECORD_BITS || 16,
    silenceDuration: process.env.RECORD_SILENCE || 3  // This now correctly reflects the desired 3 seconds of silence
};

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

// Set up the output file stream
const outputStream = fs.createWriteStream('output.wav');
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
});

// Pipe audio stream to output file
audioStream.pipe(outputStream);

// Handle SIGINT to stop recording gracefully
process.on('SIGINT', () => {
    console.log('Received SIGINT. Stopping recorder.');
    recorder.stop();
});
