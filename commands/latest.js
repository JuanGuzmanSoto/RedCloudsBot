const {fetchSummonerData, getMatchDetails,fetchMatchHistory,fetchLatestMatchDetails} = require('./sub-commands/leagueAPI.js');
const {preprocessArgs} = require('./sub-commands/processArgs.js');
const {EmbedBuilder,AttachmentBuilder} = require('discord.js'); 
module.exports = {
    name: 'latest',
    description: 'Get a detailed report of your latest match.',
    async execute(message, args) {
        const processedArgs = preprocessArgs(args);
        if (processedArgs.length < 1) {
          return message.reply('You need to provide a summoner name.');
        }
        
        const apiKey = process.env.RIOT_API_KEY;
        const region = 'na1';
        try{
          const summonerData = await fetchSummonerData(processedArgs, apiKey, region);
          const puuid = summonerData.puuid;
          const matchHistoryData = await fetchLatestMatchDetails(puuid, apiKey, region);
          const latestMatch = matchHistoryData;
          const championName = latestMatch.championName || 'Unknown';
          const timeStamp = latestMatch.timestamp ? new Date(latestMatch.timestamp) : new Date();
          const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.22.1/img/profileicon/${summonerData.profileIconId}.png`;
          const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`Latest Match for ${processedArgs}`)
          .setDescription(`Details of the latest match played by ${processedArgs}`)
          .addFields(
              { name: 'Champion', value: latestMatch.championName, inline: true },
              { name: 'Outcome', value: latestMatch.outcome, inline: true },
              { name: 'Kills', value: String(latestMatch.kills), inline: true },
              { name: 'Deaths',value: String(latestMatch.deaths),inline:true},
              { name: 'Assists',value: String(latestMatch.assists),inline:true},
              { name: 'CS',value: String(latestMatch.cs),inline:true},
              { name: 'Items',value: latestMatch.items.join(','),inline:false},
              
          )
          .setThumbnail(summonerIconUrl)
          .setImage(`http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${championName}.png`)
          .setTimestamp(timeStamp)
          .setFooter({ text: 'Match data' });
      
      // Send the embed
      message.channel.send({ embeds: [embed] });
        } catch (error) {
          console.error('Error fetching match information:', error);
          message.reply(`Failed to fetch information for ${processedArgs}`)
        }
    }
}


