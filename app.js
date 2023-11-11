const fs = require('fs');
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection,  } = require('discord.js');
const { fetchMatchHistory, createMatchHistoryEmbed,fetchSummonerData } = require('./commands/summoner.js');
const summonerNames = new Map(); 
const client = new Client({ 
  intents:
    [GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });

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

  if (commandName === 'summoner') {
    const summonerName = args.join(' '); // Join the args back in case the summoner name has spaces
    summonerNames.set(message.author.id, summonerName);
  }
  const command = client.commands.get(commandName);

  if (!command) return;
  try {
      command.execute(message, args);
  } catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() || interaction.customId !== 'match_history') return;

  try {
    // Acknowledge the interaction first
    await interaction.deferUpdate();

    // Fetch necessary data and process it
    const summonerName = summonerNames.get(interaction.user.id);
    if (!summonerName) {
      await interaction.editReply({ content: "Summoner name not found. Please use the command again.", ephemeral: true });
      return;
    }
    const region = 'na1';
    const summonerData = await fetchSummonerData(summonerName, process.env.RIOT_API_KEY, region);
    const puuid = summonerData.puuid;
    const matchHistoryData = await fetchMatchHistory(puuid, process.env.RIOT_API_KEY,region);
    const matchHistoryEmbed = createMatchHistoryEmbed(matchHistoryData);
    // Send the actual response
    await interaction.editReply({ embeds: matchHistoryEmbed });
  } catch (error) {
    console.error('Error handling the match history button:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
    }
  }
});


client.login(process.env.DISCORD_TOKEN);
