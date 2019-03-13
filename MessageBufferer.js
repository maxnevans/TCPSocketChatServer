const Message = require("./Message");


class MessageBufferer
{
    constructor(messageHandler, socket)
    {
        this._buffer = Buffer.alloc(0);
        this._messageHandler = messageHandler;
        this._socket = socket;
    }

    parse(data)
    {
        if (!(data instanceof Buffer)) throw new Error("data should be instance of Buffer");

        let tmpBuffer = Buffer.alloc(this._buffer.length + data.length);
        this._buffer.copy(tmpBuffer);
        data.copy(tmpBuffer, this._buffer.length);
        this._buffer = tmpBuffer;

        while(this._parseMessageFromBuffer());
    }

    _sendMessage(data)
    {
        console.log("Answer :", data);
        let startSeparatorData = Buffer.from(this.MESSAGE_START_SEPARATOR).swap32();
        let endSeparatorData = Buffer.from(this.MESSAGE_END_SEPARATOR).swap32();
        this._socket.write(startSeparatorData);
        this._socket.write(data);
        this._socket.write(endSeparatorData);
    }

    _parseMessageFromBuffer()
    {
        let buffer = this._buffer;
        if (buffer.length == 0) return false;
        let startSeparatorData = Buffer.from(this.MESSAGE_START_SEPARATOR).swap32();
        if (startSeparatorData.compare(buffer, 0, this.MESSAGE_START_SEPARATOR.length) != 0)
        {
            console.log(startSeparatorData);
            console.log(buffer);
            throw new Error("message sequence violated");
        }
        let endSeparatorData = Buffer.from(this.MESSAGE_END_SEPARATOR).swap32();
        let indexOfEndSeparator = buffer.indexOf(endSeparatorData);
        if (indexOfEndSeparator != -1)
        {
            let messageData = buffer.slice(startSeparatorData.length, indexOfEndSeparator);
            let tmpBuffer = Buffer.alloc(buffer.length - startSeparatorData.length - messageData.length - endSeparatorData.length);
            buffer.copy(tmpBuffer, 0, indexOfEndSeparator + endSeparatorData.length);
            this._buffer = tmpBuffer;

            let socketEmulation = {};
            Object.defineProperty(socketEmulation, "username", {
                get : () => {
                    return this._socket.username;
                },
                set : (value) => {
                    this._socket.username = value;
                }
            });
            socketEmulation.write = this._sendMessage.bind(this);
            this._messageHandler(socketEmulation, Message.createFromData(messageData));
            return true;
        }
        else
        {
            throw new Error("packet end marker is not present");
        }
    }

}
MessageBufferer.prototype.MESSAGE_START_SEPARATOR   = [0xFF, 0x12, 0xAA, 0xBB];
MessageBufferer.prototype.MESSAGE_END_SEPARATOR     = [0xBB, 0xCC, 0xCC, 0xCC];

module.exports = MessageBufferer;