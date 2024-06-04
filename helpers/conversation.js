class Conversation{

    constructor(id = '', name = '', message=''){
        this.id = id;
        this.name = name;
        this.messages = message ? [message] : [];
    }

    addMessage(message) {
        // Only add message if it is not an empty string
        if (message) {
            this.messages.push(message);
        }
    }

    getMessages(){
        return this.messages;
    }

    getName(){
        return this.name;
    }

    setName(name){
        this.name = name;
    }

    setId(id){
        this.id = id;
    }

    getId(){
        return this.id;
    }
}

module.exports = { Conversation };