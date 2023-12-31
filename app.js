const fs = require('fs');
require('dotenv').config();
const { Client, GatewayIntentBits, ButtonStyle, Collection,AttachmentBuilder,ButtonBuilder,ActionRowBuilder  } = require('discord.js');
const { createMatchHistoryCanvas } = require('./commands/sub-commands/building.js');
const {fetchMatchHistory,fetchSummonerData,getChampionsData} = require('./commands/sub-commands/leagueAPI.js')
const {preprocessArgs} = require('./commands/sub-commands/processArgs.js');
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
let processArgs;
client.on('messageCreate', message => {
  if (!message.content.startsWith('+') || message.author.bot) return;

  const args = message.content.slice('+'.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'summoner') {
    const summonerName = args.join(' '); 
    summonerNames.set(message.author.id, { summonerName: summonerName, userId: message.author.id });
    processArgs = summonerName;
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

//Button interaction
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() || interaction.customId !== 'match_history') return;
  
  const collectorObject = client.messageCollectors.get(interaction.message.id);
  const userIdAllowed = collectorObject ? collectorObject.userId : null;
  //User pressed is the same. 
  if (!userIdAllowed || interaction.user.id !== userIdAllowed) {
      await interaction.reply({ content: "You do not have permission.", ephemeral: true });
      return; 
  }

  try {
    await interaction.deferUpdate();
    // Use the stored summonerName from the map
    const championsData = await getChampionsData();
    //User PUUID (Match V5 cannot use ID needs PUUID) 
    const region = 'na1'; //bruteforced. 
    const summonerData = await fetchSummonerData(processArgs, process.env.RIOT_API_KEY, region);
    const puuid = summonerData.puuid;
    const matchHistoryData = await fetchMatchHistory(puuid, process.env.RIOT_API_KEY, region);
    //Canvas
    const matchHistoryBuffer = await createMatchHistoryCanvas(matchHistoryData, championsData); 
    const matchHistoryAttachment = new AttachmentBuilder(matchHistoryBuffer, { name: 'match-history.png' });
    const disabledButton = new ButtonBuilder()
    .setCustomId('match_history')
    .setLabel('Match History')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);
  
    const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

  
    await interaction.editReply({ 
      files: [matchHistoryAttachment], 
      embeds: [], 
      components: [disabledRow] 
    });
  } catch (error) {
    console.error('Error handling the match history button:', error);
    const errorMessage = 'There was an error processing your request.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});


client.login(process.env.DISCORD_TOKEN);