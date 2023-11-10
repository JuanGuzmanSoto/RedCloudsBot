module.exports = {
    name:'ping',
    description: 'Ping command',
    async execute(message,args){
        try{
            await message.channel.send('Pong');
        }catch(error){
            console.error('Error sending message: ', error);
        }
    },
};
