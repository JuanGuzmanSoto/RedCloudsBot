const fs = require('fs');
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection,  } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel] 
});

client.commands = new Collection(); 
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Ready');
    console.log('ctrl + c to exit');
});

client.on('messageCreate', message => {
  if (!message.content.startsWith('+') || message.author.bot) return;

  const args = message.content.slice('+'.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);

  if (!command) return;

  try {
      command.execute(message, args);
  } catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
  }
});


client.login(process.env.DISCORD_TOKEN);
