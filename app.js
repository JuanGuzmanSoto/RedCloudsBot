require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Create a new client instance with the necessary intents and partials
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Add this if you need the content of messages
  ],
  partials: [Partials.Message, Partials.Channel] // Needed for partial state messages
});

client.once('ready', () => {
    console.log('Ready!');
});

// Update the event name here to 'messageCreate' from 'message'
client.on('messageCreate', message => {
    console.log(message.content);
    if (message.content === '!ping') { // Replace '!ping' with your command
        message.channel.send('Pong.');
    }
});

client.login(process.env.DISCORD_TOKEN);
