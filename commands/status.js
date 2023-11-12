const {fetchSummonerData,fetchPlayerStatus, getChampionsData} = require('./sub-commands/leagueAPI.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} = require('discord.js'); 
const messageCollectors = require('./sub-commands/messageCollectors.js');
const {preprocessArgs} = require('./sub-commands/processArgs.js');
module.exports = {
    name:'status',
    description:'Gets a summoners live game stats',
    async execute(message,args){
        const processedArgs = preprocessArgs(args);
        if (processedArgs.length < 1) {
          return message.reply('You need to provide a summoner name.');
        }
        const apiKey = process.env.RIOT_API_KEY;
        const region = 'na1';
        try {
            const summonerData = await fetchSummonerData(processedArgs, apiKey, region);
            const activeGameData = await fetchPlayerStatus(summonerData.id, apiKey,region);
            let readableStatus; 
            if(activeGameData){
                readableStatus = 'In game'; 
            }else{
                readableStatus = 'Not in a game';
            }
            const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Summoner: ${summonerData.name}`)
            .addFields([
            { name: 'Status', value: readableStatus, inline: true }
        ]);
        message.channel.send({embeds:[embed]}); 
        }catch (error) {
            console.error(error);
            message.reply(`Failed to fetch information for ${processedArgs}.`);
        }
    }
}