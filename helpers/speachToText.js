require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const AWS = require('aws-sdk');
const { EventStreamCodec } = require('@smithy/eventstream-codec');
const splitMessage = require('@smithy/eventstream-codec')

const utf8Decoder = (buffer) => new TextDecoder("utf-8").decode(buffer);
const utf8Encoder = (text) => new TextEncoder().encode(text);
const codec = new EventStreamCodec(utf8Encoder, utf8Decoder);

const WebSocket = require('ws');
const aws4 = require('aws4');
const fs = require('fs');  // Make sure fs is defined by requiring it
const path = require('path');

// Path to the recorded audio file and where to save the transcript
const audioFilePath = path.join(__dirname, 'output.wav');
const transcriptFilePath = path.join(__dirname, 'transcription.txt');
const dataFilePath = path.join(__dirname, 'data.txt');

// Date must be in ISO-8601 'basic format
const amzDate = new Date().toISOString().replace(/[-:]/g, '').slice(0, -5) + 'Z' // fix this
const dateStamp = amzDate.substring(0, 8);
const payload = hashSha256AndHexDigest("");

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-2'
});

const canonicalRequestData = {
    body:'',
    method: 'GET',
    service: 'transcribe',
    region: AWS.config.region,
    endpoint: "wss://transcribestreaming." + AWS.config.region + ".amazonaws.com:8443",
    host: "transcribestreaming." + AWS.config.region + ".amazonaws.com:8443",
    date: `${amzDate}`,
    canonical_uri: "/stream-transcription-websocket",
    datestamp: dateStamp,
    algorithm: "AWS4-HMAC-SHA256",
    // this path is just for reference
    // path: `/stream-transcription-websocket?language-code=en-US&media-encoding=pcm&sample-rate=16000&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(process.env.AWS_ACCESS_KEY_ID + '/' + credentialScope)}&X-Amz-Date=${amzDate}&X-Amz-Expires=300&X-Amz-SignedHeaders=host`,
};
// build the url string
const credentialScope = `${dateStamp}/${AWS.config.region}/transcribe/aws4_request`;
const canonicalHeaders = `${"host".toLowerCase()}:${`transcribestreaming.${AWS.config.region}.amazonaws.com:8443`.trim()}`;
const signedHeaders = 'host';
const algorithm = "AWS4-HMAC-SHA256"
const payloadHash = payload

let canonical_querystring = urlEncode("X-Amz-Algorithm") + "=" + urlEncode(algorithm);
canonical_querystring += "&" + urlEncode("X-Amz-Credential") + "=" + urlEncode(process.env.AWS_ACCESS_KEY_ID + "/" + credentialScope);
canonical_querystring += "&" + urlEncode("X-Amz-Date") + "=" + urlEncode(amzDate);
canonical_querystring += "&" + urlEncode("X-Amz-Expires") + "=" +urlEncode("300");
// canonical_querystring += "&X-Amz-Security-Token=" + ""
canonical_querystring += "&" + urlEncode("X-Amz-SignedHeaders") + "=" + urlEncode(signedHeaders);
canonical_querystring += "&" + urlEncode("language-code") + "=" + urlEncode("en-US");
canonical_querystring += "&" + urlEncode("media-encoding") + "=" + urlEncode("flac");
canonical_querystring += "&" + urlEncode("sample-rate") + "=" + urlEncode("16000");

const canonicalRequest = 'GET' + '\n' 
    + "/stream-transcription-websocket" + '\n'
    + canonical_querystring + '\n'
    + canonicalHeaders + '\n'
    + '\n'
    + signedHeaders + '\n'
    + payloadHash;

const stringToSign =  algorithm + "\n"
    + amzDate + "\n"
    + credentialScope + "\n"
    + hashSha256AndHexDigest(canonicalRequest);

const signingKey = getSignatureKey(process.env.AWS_SECRET_ACCESS_KEY, dateStamp, AWS.config.region, 'transcribe');
const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex').toLowerCase();

// add the signed request to the query string
canonical_querystring += "&X-Amz-Signature=" + signature

// create the url for the request
const signedUrl = canonicalRequestData.endpoint + canonicalRequestData.canonical_uri + "?" + canonical_querystring
const authHeader = `${algorithm} Credential=${process.env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders};x-amz-date, Signature=${signature}`;

console.log('canonicalRequest '+ canonicalRequest + '\n')
console.log('stringToSign '+ stringToSign + '\n')

const webSocketHeaders = {
    'Host': `transcribestreaming.${AWS.config.region}.amazonaws.com:8443`,
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Origin': 'http://localhost', // Replace with the actual origin of your client
    'Sec-WebSocket-Version': '13',
    'Sec-WebSocket-Key': generateWebSocketKey(),
    // 'Authorization': authHeader
};

console.log("Signed URL:", signedUrl);
// return;
const ws = new WebSocket(signedUrl, { headers: webSocketHeaders });

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update("aws4_request").digest();
    return kSigning;
}

// Function to generate a random Sec-WebSocket-Key
function generateWebSocketKey() {
    return crypto.randomBytes(16).toString('base64');
}

function hashSha256AndHexDigest(inputString) {
    const hash = crypto.createHash('sha256');
    hash.update(inputString, 'utf-8');
    return hash.digest('hex');
}

function urlEncode(value, path = false) {
    if (value === null) {
        return "";
    }

    // Unreserved characters that should not be percent-encoded
    const unreserved = /[A-Za-z0-9\-\._~]/;

    // Encode each character of the string, using character checking and handling specific exceptions
    return Array.from(value).map(char => {
        if (unreserved.test(char)) {
            return char;  // Return unreserved characters as-is
        } else if (char === ' ') {
            return '%20'; // Encode spaces as %20
        } else if (char === '+') {
            return '%20'
        } else if (char === '/' && path) {
            return '/';   // Do not encode '/' if it's a path component
        } else if (char === '=') {
            return '%253D'
        } else {
            // Special handling for characters left intact by encodeURIComponent but needing encoding for AWS
            switch (char) {
                case '!': return '%21';
                case '\'': return '%27';
                case '(': return '%28';
                case ')': return '%29';
                case '*': return '%2A';
                default:
                    // Percent-encode other characters
                    return '%' + char.charCodeAt(0).toString(16).toUpperCase();
            }
        }
    }).join('');
}

function decodeHeaderKeys(headerObject) {
    const decodedHeaders = {};
    for (const key in headerObject) {
        const readableKey = convertUint8ArrayToString(key.split(',').map(Number));
        // Decode each value in the header
        if (headerObject[key].type === 'string' && headerObject[key].value instanceof Uint8Array) {
            decodedHeaders[readableKey] = convertUint8ArrayToString(headerObject[key].value);
        } else {
            decodedHeaders[readableKey] = headerObject[key];
        }
    }
    return decodedHeaders;
}

function decodeBody(bodyArray) {
    const bodyString = new TextDecoder("utf-8").decode(bodyArray);
    try {
        return JSON.parse(bodyString);
    } catch (error) {
        console.error("Failed to parse body:", error);
        return null;
    }
}

function convertUint8ArrayToString(array) {
    return String.fromCharCode(...array);
}

function startStreamingTranscription() {

    ws.on('open', () => {
        console.log('Successfully connected to AWS Transcribe with a valid signature.');
        // Stream the audio file
        const readStream = fs.createReadStream(audioFilePath);
        readStream.on('data', (chunk) => {
            ws.send(chunk);
        });
        readStream.on('end', () => {
            ws.send(JSON.stringify({ 'action': 'end' }));
        });
    });

    
    ws.on('message', (data) => {
        codec.feed(data);  // Decode and store the message
        const messages = codec.getAvailableMessages();
        messages.getMessages().forEach((decodedMessage) => {
            const headers = decodeHeaderKeys(decodedMessage.headers);
            const body = decodeBody(decodedMessage.body);
            console.log('Readable Headers:', headers);
            console.log('Readable Body:', body);
            // Further processing...
        });
    });
    
    // this need to be a decoder function to interprut aws transcribes binary data format

    // const messageDecoder = new MessageDecoderStream({
    //     inputStream: generateWebSocketMessages(),
    //     decoder: {
    //         decode: (bytes) => {
    //             const { headers, body } = splitMessage({
    //                 byteLength: bytes.byteLength,
    //                 byteOffset: 0,
    //                 buffer: bytes.buffer
    //             });
    //              // Decode the headers
    //             const decodedHeaders = headerMarshaller.parse(headers);
    //             const decodedPayload = extractPayload(body); // Hypothetical function to extract payload based on headers
    //             return { headers: decodedHeaders, payload: decodedPayload }; 
    //         }
    //     }
    // });

    ws.on('error', error => console.error('WebSocket error:', error));
    ws.on('close', () => {
        codec.endOfStream();
        // Handle any remaining messages
        const remainingMessages = codec.getAvailableMessages();
        remainingMessages.getMessages().forEach((decodedMessage) => {
            console.log('Final Message:', decodedMessage);
        });
    });

    
//// decode the dataframe
    // ws.on('message', async (data) => {
    //     console.log('Data received:', data);
    
    //     // Check if data is a buffer and handle it
    //     if (Buffer.isBuffer(data)) {
    //         try {
    //             // Decode the event stream
    //             const decodedData = await decodeEventStream(data);
    //             console.log('Decoded data:', decodedData);
    
    //             // Assuming the decoded data structure follows what AWS sends
    //             if (decodedData && decodedData.Transcript && decodedData.Transcript.Results.length > 0) {
    //                 const results = decodedData.Transcript.Results;
    //                 results.forEach(result => {
    //                     if (result.Alternatives.length > 0) {
    //                         const transcript = result.Alternatives[0].Transcript;
    //                         console.log('Transcribed Text:', transcript);
    //                         fs.appendFileSync(transcriptFilePath, transcript + '\n');
    //                     }
    //                 });
    //             }
    //         } catch (error) {
    //             console.error('Error decoding event stream:', error);
    //         }
    //     } else {
    //         console.error('Received data is not a buffer.');
    //     }
    // });

}
// Start the transcription process
startStreamingTranscription();
