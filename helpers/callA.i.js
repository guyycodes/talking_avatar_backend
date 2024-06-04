const axios = require('axios');
require('dotenv').config({ path: '../.env' })
const { Conversation } = require('./conversation');

const systemMessage = { 
    "role": "system", "content": "You are the worlds smartest toaster, sound normal when you talk though!. Never break character unless I say abracadabra."
  }
let chat = new Conversation('userid', 'username', '')
let isTyping = false;
const CHAT_API_KEY = process.env.CHAT_API_KEY;

// process the message
const processMessage = async (message) => {

console.log("message:"+message)

const newMessage = {
    message: message,
    direction: 'outgoing',
    sender: "user"
};

// set the new message
chat.addMessage(newMessage)

isTyping = true;

await formatMessages(chat.getMessages());
}

// Format messages for API
const formatMessages = async (messages) => {

let apiMessages = messages.map((messageObject) => {
    let role = messageObject.sender === "ChatGPT"?"assistant":"user"
    return { role: role, content: messageObject.message}
});


const apiRequestBody = {
    model: "gpt-3.5-turbo",
    messages: [
    systemMessage, // The system message DEFINES the logic of our chat
    ...apiMessages // The messages from our chat with ChatGPT
    ],
    top_p: 0.9, // A value between 0 and 1, typically around 0.9
    temperature: 0.7, // A value between 0 and 1 where lower means more deterministic
    max_tokens: 150 // The maximum number of tokens to generate in the response
};

const config = {
    headers: {
    "Authorization": `Bearer sk-${CHAT_API_KEY}`,
    "Content-Type": "application/json",
    }
};

    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", apiRequestBody, config);
        const data = response.data
        
        // Extract the assistant's message from the response
        const assistantMessage = data.choices[0].message.content; // this is correct
        
        // Create a new message object with only the necessary properties
        const newMessage = {
            message: assistantMessage,
            sender: "ChatGPT"
        };
    
        chat.addMessage(newMessage);
        console.log(chat.getMessages());
        isTyping = false
    } catch (error) {
        console.error('Error:', error);
    }
}

processMessage("Hello, how are you?");