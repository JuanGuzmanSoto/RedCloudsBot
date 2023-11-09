module.exports = {
    name:'test',
    description: 'testing command',
    execute(message,args){
        message.channel.send('Test Successful'); 
    },
};