const net = require("net");
const fs = require("fs");
const Message = require("./Message");
const MessageBufferer = require("./MessageBufferer");

let server = net.createServer().listen({
    port: 27015
}, () => {
    console.log("Server is listening on 27015!");
});

let users = {};

server.on("connection", (socket) => {

    let mb = new MessageBufferer(messageHandler, socket);

    console.log("Client connected!");
    socket.on("data", mb.parse.bind(mb));

    socket.on("close", (error) => {
        console.log("User " + socket.username + "closed the connection!");
        delete users[socket.username];
        delete socket.username;
        if (error) console.log(error);
    });
});

function messageHandler(socket, msg)
{
    console.log("Action: " + msg.action);
    console.log("Sign: " + msg.sign);
    console.log("Content [txt]: " + msg.content);
    console.log("Content [bin]: ", msg.content);

    switch(msg.action + "")
    {
        case "login":
            msg.setContent(true);
            users[msg.sign + ""] = {
                socket: socket,
                file : {
                    name : null,
                    size : null
                }
            };
            socket.username = msg.sign + "";
            socket.write(msg.buffer);
            break;

        case "logout":
            console.log("User " + socket.username +" logout!");
            delete users[socket.username];
            delete socket.username;
            break;

        case "message":
            if (users[msg.sign+""]){
                
                // Forwarding message: has been sent from user socket.username
                let forwardMessage = new Message("message", socket.username, msg.content);
                
                // Send to user msg.sign
                users[msg.sign+""].socket.write(forwardMessage.buffer);
            }
            break;

        case "file-start":
            users[socket.username].file.name = msg.content + "";
            users[socket.username].file.size = null;

            // Creating an empty file
            fs.writeFile(users[socket.username].file.name, "", (error) => {
                if (error) console.log(error);
            });
            break;

        case "file-part":
            if (users[socket.username].file.name)
            {
                fs.appendFile(users[socket.username].file.name, msg.content, (error) => {
                    if (error) console.log(error);
                });
            }
            else
            {
                console.log("file-start message has not been recieved: we do not save the file part");
            }
            break;

        case "file-end":
            console.log(msg.content.readInt32BE());
            break;

        case "file-get":
            users[socket.username].file.name = msg.content + "";
            fs.readFile(users[socket.username].file.name, (error, data) => {
                if (error) throw error;
                msg.setAction("file-start");
                socket.write(msg.buffer);

                msg.setAction("file-part");
                msg.setContent(data);
                socket.write(msg.buffer);

                msg.setAction("file-end");
                msg.setContent(data.length);
                socket.write(msg.buffer);
            });
            break;
    }
}