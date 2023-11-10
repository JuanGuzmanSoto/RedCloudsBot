module.exports = {
    name:'test',
    description: 'testing command',
    async execute(message,args){
        try{
            await message.channel.send('Test Successful');
        }catch(error){
            console.error('Error sending message: ', error); 
        }
    },
};