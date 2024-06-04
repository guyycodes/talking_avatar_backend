const player = require('play-sound')(opts = {});

// Function to play the speech file
function playSpeech(file) {
    player.play(file, function(err){
        if (err) throw err;
        console.log('Audio playback finished.');
    });
}

// Example usage
playSpeech('/path/to/speech-file.mp3');  // Path to your generated MP3 file
