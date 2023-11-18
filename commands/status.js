const {fetchSummonerData,fetchPlayerStatus, getChampionsData,fetchRankedData,getRankedIconUrl} = require('./sub-commands/leagueAPI.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,AttachmentBuilder} = require('discord.js'); 
const {createCanvas,loadImage,registerFont} = require('canvas');
registerFont('font/league.ttf', {family: 'league'});
const Canvas = require('canvas'); 
const messageCollectors = require('./sub-commands/messageCollectors.js');
const {preprocessArgs} = require('./sub-commands/processArgs.js');
const fetch = require('node-fetch');
const queueIdMap = {
    400: 'Normal Draft',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM'
}
const spellIdMap = {
    '1': 'SummonerBoost',
    '3': 'SummonerExhaust',
    '4': 'SummonerFlash',
    '6': 'SummonerHaste',
    '7': 'SummonerHeal',
    '11': 'SummonerSmite',
    '12': 'SummonerTeleport',
    '13': 'SummonerClarity',
    '14': 'SummonerDot',
    '21': 'SummonerBarrier',
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
        const summonerData = await fetchSummonerData(processedArgs, apiKey, region);
        
    try {
        
        const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.22.1/img/profileicon/${summonerData.profileIconId}.png`;
        const activeGameData = await fetchPlayerStatus(summonerData.id, apiKey, region);

        if (activeGameData) {
            const playerData = activeGameData.participants.find(participant => participant.summonerId === summonerData.id);
            const queueType = queueIdMap[activeGameData.gameQueueConfigId] || 'Other/Custom Game';
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
                      inline: true 
                    };
                  });
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
                    const canvas = createCanvas(325, 525); 
                    const ctx = canvas.getContext('2d');

                    const championIconSize = 64; 
                    const spellIconSize = 32;
                    const rankIconSize = 48;
                    const spacingX = 10; // Horizontal spacing between icons
                    const spacingY = 10; // Vertical spacing between icons
                    const canvasWidth = 500; // Width of your canvas
                    const columnWidth = canvasWidth / 2; 
                    const blueTeamX = 0; 
                    const redTeamX = columnWidth + spacingX; 
                    
                    let blueTeamY = 14; 
                    let redTeamY = 14; 
                    const blueTeamColor = '#4169e1';
                    const redTeamColor = '#800000';
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = blueTeamColor;
                    ctx.fillRect(0, 0, canvas.width/2, canvas.height);
                    // Fill the right side with red
                    ctx.fillStyle = redTeamColor;
                    ctx.fillRect(canvas.width/2, 0, canvas.width/2, canvas.height);
                    ctx.globalAlpha = 1.0;
                    
                    // Load and draw images for each participant
                    ctx.font = '14px league';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = 'white';
                    for (const participant of activeGameData.participants) {
                        
                        const summonerData2 = await fetchSummonerData(participant.summonerName, apiKey, region); // Adjust region as needed
                        const rankedData = await fetchRankedData(summonerData2.id, apiKey, region);
                        const soloDuoStats = rankedData.find(queue => queue.queueType === 'RANKED_SOLO_5x5') || {};
                        const rankIconUrl = getRankedIconUrl(soloDuoStats.tier);
                        const championIconUrl2 = `http://ddragon.leagueoflegends.com/cdn/13.22.1/img/champion/${championData[participant.championId].id}.png`;
                        const spell1IconUrl = `http://ddragon.leagueoflegends.com/cdn/13.22.1/img/spell/${spellIdMap[participant.spell1Id]}.png`;
                        const spell2IconUrl = `http://ddragon.leagueoflegends.com/cdn/13.22.1/img/spell/${spellIdMap[participant.spell2Id]}.png`;
                        
                        try{
                            const rankIcon = await Canvas.loadImage(rankIconUrl);
                            const championIcon = await Canvas.loadImage(championIconUrl2);
                            const spell1Icon = await Canvas.loadImage(spell1IconUrl);
                            const spell2Icon = await Canvas.loadImage(spell2IconUrl);
                            const iconVerticalSpacing = 5; // Adjust vertical spacing between spell icons if needed
                            const championCenterX = participant.teamId === 100 ? blueTeamX + championIconSize / 2 : redTeamX + championIconSize / 2;
                            const nameYPosition = participant.teamId === 100 ? blueTeamY -2 : redTeamY - 2;
                            ctx.fillText(participant.summonerName, championCenterX, nameYPosition);
                            if (participant.teamId === 100) { // Blue team
                                // Draw icons for the blue team participant
                                // Champion icon
                                ctx.drawImage(championIcon, blueTeamX, blueTeamY, championIconSize, championIconSize);
                                // Summoner spells
                                ctx.drawImage(spell1Icon, blueTeamX + championIconSize + spacingX, blueTeamY, spellIconSize, spellIconSize);
                                ctx.drawImage(spell2Icon, blueTeamX + championIconSize + spacingX, blueTeamY + spellIconSize + iconVerticalSpacing, spellIconSize, spellIconSize);
                                // Rank icon
                                ctx.drawImage(rankIcon, blueTeamX + championIconSize + spellIconSize + spacingX * 2, blueTeamY, rankIconSize, rankIconSize);
                                blueTeamY += championIconSize + spacingY + spellIconSize + iconVerticalSpacing;
                            } else if (participant.teamId === 200) { // Red team
                                ctx.drawImage(championIcon, redTeamX, redTeamY, championIconSize, championIconSize);
                                ctx.drawImage(spell1Icon, redTeamX - spellIconSize - spacingX, redTeamY, spellIconSize, spellIconSize);
                                ctx.drawImage(spell2Icon, redTeamX - spellIconSize - spacingX, redTeamY + spellIconSize + iconVerticalSpacing, spellIconSize, spellIconSize);
                                ctx.drawImage(rankIcon, (redTeamX - championIconSize - spacingX*2) - 15, redTeamY, rankIconSize, rankIconSize);
                                redTeamY += championIconSize + spacingY + spellIconSize + iconVerticalSpacing;
                            }
                        }catch(error){
                            console.error('Error loading champion icon:',);
                        }
                    }
            
                    
                    const attachment = new AttachmentBuilder(canvas.toBuffer(), 'game-info.png');
            
                    message.channel.send({ files: [attachment] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Summoner: ${summonerData.name}`)
                .setThumbnail(summonerIconUrl)
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
    
    const startTime = new Date(gameStartTime); 
    const currentTime = new Date(); 

    
    const durationMillis = currentTime - startTime;

    
    const minutes = Math.floor(durationMillis / 60000);
    const seconds = ((durationMillis % 60000) / 1000).toFixed(0);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} minutes`;
}
