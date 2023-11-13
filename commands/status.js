const {fetchSummonerData,fetchPlayerStatus, getChampionsData} = require('./sub-commands/leagueAPI.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder} = require('discord.js'); 
const messageCollectors = require('./sub-commands/messageCollectors.js');
const {preprocessArgs} = require('./sub-commands/processArgs.js');
const queueIdMap = {
    400: 'Normal Draft',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM'
}
const spellIdMap = {
    '1': 'Cleanse',
    '3': 'Exhaust',
    '4': 'Flash',
    '6': 'Ghost',
    '7': 'Heal',
    '11': 'Smite',
    '12': 'Teleport',
    '13': 'Clarity',
    '14': 'Ignite',
    '21': 'Barrier',
    '30': 'To the King!',
    '31': 'Poro Toss',
    '32': 'Mark',
  };
  const teamIdMap = {
    '100': 'Blue team',
    '200': 'Red team',
  };

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
        const summonerData = await fetchSummonerData(processedArgs, apiKey, region); // Adjust region as needed
        const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.22.1/img/profileicon/${summonerData.profileIconId}.png`;
    try {
        const activeGameData = await fetchPlayerStatus(summonerData.id, apiKey, region);

        if (activeGameData) {
            const playerData = activeGameData.participants.find(participant => participant.summonerId === summonerData.id);
            const queueType = queueIdMap[activeGameData.gameQueueConfigId] || 'Other/Custom Game';
            if (playerData && playerData.championId) {
                const championData = await getChampionsData();
                const playerChampionId = playerData.championId.toString();
                const playerChampionData = championData[playerChampionId];
                const participantFields = activeGameData.participants.map(participant => {
                    const spell1 = spellIdMap[participant.spell1Id] || 'Unknown Spell';
                    const spell2 = spellIdMap[participant.spell2Id] || 'Unknown Spell';
                    const team = teamIdMap[participant.teamId] || 'Unknown Team';
                  
                    return {
                      name: participant.summonerName,
                      value: `Champion: ${championData[participant.championId].name}
                      Spells: ${spell1}/${spell2} 
                      Team: ${team}`,
                      inline: true // Setting inline to false to ensure readability
                    };
                  });
                if (playerChampionData) {
                    const championImageURL = playerChampionData.iconUrl;
                    const gameDuration = calculateGameDuration(activeGameData.gameStartTime);


                    const embed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`Summoner: ${summonerData.name}`)
                        .setThumbnail(summonerIconUrl)
                        .setImage(championImageURL)
                        .addFields(
                            { name: 'Duration', value: gameDuration, inline: true },
                            { name: 'Queue Type', value: queueType, inline: true },
                        );
                    message.channel.send({ embeds: [embed] });
                    const embed2 = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setThumbnail(summonerIconUrl) 
                    .setTitle(`Live Game Info for ${summonerData.name}`)
                    .addFields(participantFields);
                
                // Send the embed
                message.channel.send({ embeds: [embed2] });
                } else {
                    message.reply("Champion data not found");
                }
            } else {
                message.reply("Player Data not found");
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Summoner: ${summonerData.name}`)
                .addFields({ name: 'Status', value: 'Not in a game', inline: true });
            message.channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error(error);
        message.reply(`Failed to fetch information for ${processedArgs}.`);
    }
}
}

function calculateGameDuration(gameStartTime) {
    // gameStartTime is usually provided in epoch milliseconds
    const startTime = new Date(gameStartTime); 
    const currentTime = new Date(); // Current time

    // Calculate the difference in milliseconds
    const durationMillis = currentTime - startTime;

    // Convert milliseconds to minutes and seconds
    const minutes = Math.floor(durationMillis / 60000);
    const seconds = ((durationMillis % 60000) / 1000).toFixed(0);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} minutes`;
}