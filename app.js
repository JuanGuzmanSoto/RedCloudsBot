const fs = require('fs');
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection,AttachmentBuilder  } = require('discord.js');
const { fetchMatchHistory,fetchSummonerData,createMatchHistoryCanvas,getChampionsData } = require('./commands/summoner.js');
const summonerNames = new Map(); 
const client = new Client({ 
  intents:
    [GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });
    const messageCollectors = require('./commands/sub-commands/messageCollectors.js');
    client.messageCollectors = messageCollectors;
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
    summonerNames.set(message.author.id, { summonerName: summonerName, userId: message.author.id });
    
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
  
  const collectorObject = client.messageCollectors.get(interaction.message.id);
  const summonerDataStored = summonerNames.get(interaction.user.id);
  const userIdAllowed = collectorObject ? collectorObject.userId : null;
  
  if (!userIdAllowed || interaction.user.id !== userIdAllowed) {
      await interaction.reply({ content: "You do not have permission.", ephemeral: true });
      return;
  }

  try {
    await interaction.deferUpdate();
    // Use the stored summonerName from the map
    const { summonerName } = summonerDataStored;
    const championsData = await getChampionsData();
    const region = 'na1';
    const summonerData = await fetchSummonerData(summonerName, process.env.RIOT_API_KEY, region);
    const puuid = summonerData.puuid;
    const matchHistoryData = await fetchMatchHistory(puuid, process.env.RIOT_API_KEY, region);

    const matchHistoryBuffer = await createMatchHistoryCanvas(matchHistoryData, championsData); 
    const matchHistoryAttachment = new AttachmentBuilder(matchHistoryBuffer, { name: 'match-history.png' });
    await interaction.editReply({ files: [matchHistoryAttachment], embeds: [] });
  } catch (error) {
    console.error('Error handling the match history button:', error);
    const errorMessage = 'There was an error processing your request. Please try again later.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});


client.login(process.env.DISCORD_TOKEN);