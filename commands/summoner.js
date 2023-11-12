const { ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js'); 

const messageCollectors = require('./sub-commands/messageCollectors.js');
const {fetchSummonerData,fetchRankedData, getChampionsData} = require('./sub-commands/leagueAPI');
const {createProfileEmbed} = require('./sub-commands/building.js'); 
module.exports = {
    name: 'summoner',
    description: 'Get League of Legends summoner profile',
    async execute(message, args) {
      const processedArgs = preprocessArgs(args);
      if (processedArgs.length < 1) {
        return message.reply('You need to provide a summoner name.');
      }

      const apiKey = process.env.RIOT_API_KEY;
      const region = 'na1'; //Summoner v4 API 
      const championsData = await getChampionsData();
      for (const summonerName of processedArgs) {
        try {
          const summonerData = await fetchSummonerData(summonerName, apiKey, region);
          const rankedData = await fetchRankedData(summonerData.id, apiKey, region);
          const soloDuoStats = rankedData.find(queue => queue.queueType === 'RANKED_SOLO_5x5') || {};
          const { embed, attachment } = await createProfileEmbed(summonerData, soloDuoStats, championsData, apiKey, region); //
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('match_history')
                .setLabel('Match History')
                .setStyle(ButtonStyle.Primary)
            );
            const profileMessage = await message.channel.send({ embeds: [embed], files: [attachment], components: [row] });
            const filter = (i) => i.customId === 'match_history' && i.message.id === profileMessage.id;
            const collector = profileMessage.createMessageComponentCollector({ filter, time: 6000 });
            messageCollectors.set(profileMessage.id, { collector, userId: message.author.id });
            collector.on('collect', async (i) => {
              });
              collector.on('end', collected => {
                messageCollectors.delete(profileMessage.id); // Using the same map as when setting the collector
            });
        }catch (error) {
            console.error(error);
            message.reply(`Failed to fetch information for ${summonerName}.`);
        }
    }
  }
}

//Checks if the argument contained quotations to store as a single string. (Spaced usernames) 
function preprocessArgs(args){
    let processedArgs = []; 
    let currentArgs = '';
    let quoteOpen = false;
    for(const arg of args){
        if(arg.startsWith('"')&&arg.endsWith('"')&&arg.length>1){
            processedArgs.push(arg.slice(1,-1));
        }else if (arg.startsWith('"')){
            currentArgs = arg.slice(1);
            quoteOpen = true; 
        }else if (arg.endsWith('"')){
            currentArgs += ' ' + arg.slice(0,-1);
            processedArgs.push(currentArgs);
            currentArgs = '';
            quoteOpen = false;
        }else if (quoteOpen){
            currentArgs += ' ' + arg;
        }else{
            processedArgs.push(arg);
        }
    }
    if(quoteOpen){
        processedArgs.push(currentArgs);
    }
    return processedArgs;
}
