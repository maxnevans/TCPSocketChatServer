class Message
{
    constructor(action, sign, content)
    {
        this.action = this._cvt2Buffer(action);        
        this.sign = this._cvt2Buffer(sign);
        this.content = this._cvt2Buffer(content);
        
        this._updateBuffer();
    }

    static createFromData(data)
    {
        let action, sign, content;

        if (!(data instanceof Buffer)) throw new Error("data is not Buffer");
        for(let i = 0; i < data.length; i++)
        {
            if (data[i] === 0 && !action){
                action = data.slice(0, i);     
                continue;       
            }
            if (data[i] === 0 && !sign){
                sign = data.slice(action.length + 1, i);
                content = data.slice(i + 1, data.length);
                break;
            }
        }

        let msg = new Message(action, sign, content);
        msg.buffer = data;
        return msg;
    }

    setContent(content)
    {
        this.content = this._cvt2Buffer(content);
        this._updateBuffer();
    }

    setSign(sign)
    {
        this.sign = this._cvt2Buffer(sign);
        this._updateBuffer();
    }

    setAction(action)
    {
        this.action = this._cvt2Buffer(action);
        this._updateBuffer();
    }

    _cvt2Buffer(value)
    {
        let retVal;
        if ((value instanceof Object) && value.length)
        {
            retVal = value instanceof Buffer ? value : Buffer.from(value);
        }
        else
        {
            retVal = Buffer.from([value]);
        }
        return retVal;
    }

    _updateBuffer()
    {
        const totalLength = this.action.length + this.sign.length 
            + this.content.length + this.DELIM.length * this.DELIM_REPEAT * (this.MESSAGE_PARTS - 1);
        let currentBufferLength = 0;
        this.buffer = Buffer.alloc(totalLength);

        // Action
        this.action.copy(this.buffer);
        currentBufferLength = this.action.length;

        // Delimeter
        for (let i = 0; i < this.DELIM_REPEAT; i++)
        {
            Buffer.from(this.DELIM).copy(this.buffer, currentBufferLength);
            currentBufferLength += this.DELIM.length;
        }
        
        // Sign
        this.sign.copy(this.buffer, currentBufferLength);
        currentBufferLength += this.sign.length;

        //Delimeter
        for (let i = 0; i < this.DELIM_REPEAT; i++)
        {
            Buffer.from(this.DELIM).copy(this.buffer, currentBufferLength);
            currentBufferLength += this.DELIM.length;
        }

        // Content
        this.content.copy(this.buffer, currentBufferLength);
    }
}
Message.prototype.DELIM = "\u0000";
Message.prototype.DELIM_REPEAT = 1;
Message.prototype.MESSAGE_PARTS = 3;

module.exports = Message;