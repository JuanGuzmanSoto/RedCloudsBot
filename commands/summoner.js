const fetch = require('node-fetch');
const { ActionRowBuilder, ButtonBuilder, AttachmentBuilder, EmbedBuilder, ButtonStyle} = require('discord.js'); 
const Canvas = require('canvas');
const {registerFont, createCanvas } = require('canvas'); 
const queueIdMap = {
    400: 'Normal Draft',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM'
}
registerFont('font/Consolas.ttf', {family: 'Consolas'});
registerFont('font/CatCafe.ttf', {family: 'cat'});
registerFont('font/mangat.ttf', {family: 'manga'});
registerFont('font/impact.ttf', {family: 'impact'});
registerFont('font/OtakuRantBold.ttf', {family: 'otaku'});
registerFont('font/uchiyama.otf', {family: 'uchiyama'});
registerFont('font/Skeina.otf', {family: 'Skeina'});
registerFont('font/LEMONMILK-Bold.otf', {family: 'lemonmilk'});
module.exports = {
    fetchMatchHistory,
    createMatchHistoryEmbed,
    fetchSummonerData,
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


            // Create a collector for button interactions on this message
            const filter = (i) => i.customId === 'match_history' && i.message.id === profileMessage.id;
            const collector = profileMessage.createMessageComponentCollector({ filter, time: 15000 });
            collector.on('collect', async (i) => {
              });

            collector.on('end', collected => console.log(`Collected ${collected.size} items`));

        }catch (error) {
            console.error(error);
            message.reply(`Failed to fetch information for ${summonerName}.`);
        }
    }
  }
}
//Summoner Data
async function fetchSummonerData(summonerName, apiKey, region) {
    const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`, {
      headers: { "X-Riot-Token": apiKey }
    });
  
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Error fetching data for ${summonerName}: ${errorDetails}`);
    }
  
    const data = await response.json();
    return data; 
}

//Ranked Data
async function fetchRankedData(summonerId, apiKey, region) {
    const rankedResponse = await fetch(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`, {
      headers: { "X-Riot-Token": apiKey }
    });
  
    if (!rankedResponse.ok) {
      throw new Error(`Error fetching ranked data: ${rankedResponse.statusText}`);
    }
  
    return await rankedResponse.json();
  }

//ChampionData
  async function fetchChampionMasteryData(summonerId, apiKey, region) {
  const masteryResponse = await fetch(`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}`, {
    headers: { "X-Riot-Token": apiKey }
  });

  if (!masteryResponse.ok) {
    throw new Error(`Error fetching champion mastery data: ${masteryResponse.statusText}`);
  }

  return await masteryResponse.json();
}

//Match details. 
async function getMatchDetails(matchId, apiKey, region) {
    // Ensure that region is set to "AMERICAS" for match details API
    const routingValue = (region === 'na1' || region === 'br1' || region === 'lan' || region === 'las' || region === 'oce') ? 'americas' : region;

    const response = await fetch(`https://${routingValue}.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
      headers: { "X-Riot-Token": apiKey }
    });
  
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Error fetching match details for matchId ${matchId}: ${errorDetails}`);
    }
  
    const matchDetails = await response.json();
    return matchDetails;
}

  async function getMatchlistByPuuid(puuid, apiKey) {
    const response = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`, {
      headers: {
        "X-Riot-Token": apiKey
      }
    });
  
    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(`Error fetching matchlist: ${errorDetails.status.message}`);
    }
    return await response.json();
  }
//Match history 
async function fetchMatchHistory(puuid, apiKey, region) {
    try {
        const matchIds = await getMatchlistByPuuid(puuid, apiKey);
        const matchDetailsPromises = matchIds.map(matchId => getMatchDetails(matchId, apiKey, region));
        const matchesDetails = await Promise.all(matchDetailsPromises);

        // Map the match details to the format expected by createMatchHistoryEmbed
        const matchHistoryData = matchesDetails.map(matchDetails => {
            // Find the participant corresponding to the puuid
            const participant = matchDetails.info.participants.find(p => p.puuid === puuid);

            // Determine the outcome by looking at the team's win property
            const team = matchDetails.info.teams.find(t => t.teamId === participant.teamId);
            const outcome = team && team.win ? 'Win' : 'Loss';
            const queueType = queueIdMap[matchDetails.info.queueId] || 'Other/Custom Game';

            // Extract the game mode

            // If participant is not found, return an object with placeholder values
            if (!participant) {
                return {
                    gameId: matchDetails.info.gameId || 'Unknown',
                    championName: 'Unknown',
                    kills: 'N/A',
                    deaths: 'N/A',
                    assists: 'N/A',
                    timestamp: matchDetails.info.gameStartTimestamp || new Date().getTime(),
                    outcome: 'Unknown',
                    queueId: queueId
                };
            }
            return {
                gameId: matchDetails.info.gameId || 'Unknown',
                championName: participant.championName || 'Unknown',
                kills: participant.kills !== undefined ? participant.kills : 'N/A',
                deaths: participant.deaths !== undefined ? participant.deaths : 'N/A',
                assists: participant.assists !== undefined ? participant.assists : 'N/A',
                timestamp: matchDetails.info.gameStartTimestamp || new Date().getTime(),
                outcome: outcome,
                queueType:queueType
            };
        });

        return matchHistoryData;
    } catch (error) {
        console.error(`Error fetching match history: ${error}`);
        throw error;
    }
}


function createMatchHistoryEmbed(matchHistoryData) {
    const embeds = [];
    matchHistoryData.forEach(match => {
        const gameId = match.gameId || 'Unknown';
        const championName = match.championName || 'Unknown';
        const kda = (match.kills !== undefined && match.deaths !== undefined && match.assists !== undefined) 
                    ? `${match.kills}/${match.deaths}/${match.assists}` 
                    : 'N/A';
        const outcome = match.outcome || 'Unknown';
        const queueType = match.queueType || 'Unknown';
        const timestamp = match.timestamp ? new Date(match.timestamp) : new Date();

        // Set color based on outcome
        const color = outcome === 'Win' ? '#6495ED' : '#9A2A2A'; // Blue for win, red for loss

        const embed = new EmbedBuilder()
            .setColor(color) // Use the color variable here
            .setTitle(`Game ID: ${gameId}`)
            .addFields([
                { name: 'Champion', value: championName, inline: true },
                { name: 'KDA', value: kda, inline: true },
                { name: 'Outcome', value: outcome, inline: true }, // Add outcome field to embed
                { name: 'Queue Type', value: queueType, inline: true }
            ]);
        if (championName) {
            embed.setThumbnail(`http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${championName}.png`);
        }
        embed.setTimestamp(timestamp);
        embeds.push(embed);
    });

    return embeds.length > 0 ? embeds : [new EmbedBuilder().setTitle('No recent matches found')];
}

async function createProfileEmbed(summonerData, soloDuoStats, championsData, apiKey, region) {
    // Fetch top champions based on mastery
    const masteryData = await fetchChampionMasteryData(summonerData.id, apiKey, region);
    const topChampions = masteryData.slice(0, 3).map(mastery => {
      const champion = championsData[mastery.championId];
      const championIconUrl = `http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${champion.id}.png`;
      return { name: champion.name, iconUrl: championIconUrl };
    });
    const topChampionIconUrls = topChampions.map(champion => champion.iconUrl);
    const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.22.1/img/profileicon/${summonerData.profileIconId}.png`;
    const rankIconUrl = getRankedIconUrl(soloDuoStats.tier);
  
    // Create combined image buffer
    const combinedImageBuffer = await createSummonerProfileCanvas(summonerIconUrl, rankIconUrl, topChampionIconUrls, summonerData, soloDuoStats);
    const attachment = new AttachmentBuilder(combinedImageBuffer, { name: 'profile-image.png' });
  
    // Create profile embed
    const profileEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${summonerData.name}'s Profile`)
      .setImage('attachment://profile-image.png');
  
    return { embed: profileEmbed, attachment: attachment };
  }
async function createMatchHistoryCanvas(matchHistoryData, championsData) {
    // Constants for layout
    const sectionHeight = 120; // The height of each match section
    const spacing = 10; // Spacing between each match section
    const canvasWidth = 800; // Width of the canvas

    // Calculate the total height of the canvas
    const canvasHeight = (sectionHeight + spacing) * matchHistoryData.length;

    // Create the canvas
    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Set a background color
    ctx.fillStyle = '#202225'; // Discord dark theme background color
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set text style
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFFFFF'; // White text color

    // Load and draw each match section
    for (let i = 0; i < matchHistoryData.length; i++) {
        const match = matchHistoryData[i];
        const yPosition = i * (sectionHeight + spacing);

        // Set colors based on win/loss
        ctx.fillStyle = match.outcome === 'Win' ? '#0099ff' : '#ff0000';
        // Draw section background
        ctx.fillRect(0, yPosition, canvasWidth, sectionHeight);

        // Reset text color for drawing text
        ctx.fillStyle = '#FFFFFF';

        // Load the champion icon
        const champion = championsData[match.championName];
        const championIconUrl = `http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${champion}.png`;
        const championIcon = await Canvas.loadImage(championIconUrl);

        // Draw the champion icon
        const iconSize = 100; // Example size, you may adjust
        ctx.drawImage(championIcon, 10, yPosition + 10, iconSize, iconSize);

        // Draw the match text
        const textStartX = iconSize + 20;
        ctx.fillText(`Game ID: ${match.gameId}`, textStartX, yPosition + 30);
        ctx.fillText(`Champion: ${match.championName}`, textStartX, yPosition + 60);
        ctx.fillText(`KDA: ${match.kills}/${match.deaths}/${match.assists}`, textStartX, yPosition + 90);
    }

    // Return the canvas buffer
    return canvas.toBuffer();
}


//Gets the rank icon. 
function getRankedIconUrl(rank){
    const rankIcons = {
        'IRON':
        'https://static.wikia.nocookie.net/leagueoflegends/images/f/f8/Season_2023_-_Iron.png/revision/latest/scale-to-width-down/130?cb=20231007195831',
        'BRONZE':
        'https://static.wikia.nocookie.net/leagueoflegends/images/c/cb/Season_2023_-_Bronze.png/revision/latest/scale-to-width-down/130?cb=20231007195824',
        'SILVER':
        'https://static.wikia.nocookie.net/leagueoflegends/images/c/c4/Season_2023_-_Silver.png/revision/latest/scale-to-width-down/130?cb=20231007195834',
        'GOLD':
        'https://static.wikia.nocookie.net/leagueoflegends/images/7/78/Season_2023_-_Gold.png/revision/latest/scale-to-width-down/130?cb=20231007195829',
        'PLATINUM':
        'https://static.wikia.nocookie.net/leagueoflegends/images/b/bd/Season_2023_-_Platinum.png/revision/latest/scale-to-width-down/130?cb=20231007195833',
        'EMERALD':
        'https://static.wikia.nocookie.net/leagueoflegends/images/4/4b/Season_2023_-_Emerald.png/revision/latest/scale-to-width-down/130?cb=20231007195827',
        'DIAMOND':
        'https://static.wikia.nocookie.net/leagueoflegends/images/3/37/Season_2023_-_Diamond.png/revision/latest/scale-to-width-down/130?cb=20231007195826',
        'MASTER':
        'https://static.wikia.nocookie.net/leagueoflegends/images/d/d5/Season_2023_-_Master.png/revision/latest/scale-to-width-down/130?cb=20231007195832',
        'GRANDMASTER':
        'https://static.wikia.nocookie.net/leagueoflegends/images/6/64/Season_2023_-_Grandmaster.png/revision/latest/scale-to-width-down/130?cb=20231007195830',
        'CHALLENGER':
        'https://static.wikia.nocookie.net/leagueoflegends/images/1/14/Season_2023_-_Challenger.png/revision/latest/scale-to-width-down/130?cb=20231007195825',
        
    };
    return rankIcons[rank] ||
    'https://static.wikia.nocookie.net/leagueoflegends/images/1/13/Season_2023_-_Unranked.png/revision/latest/scale-to-width-down/130?cb=20231007211937';

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


//gets the champion data. 
async function getChampionsData() {
    try {
        const versionResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await versionResponse.json();
        const latestVersion = versions[0]; // Get the latest version

        const response = await fetch(`http://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
        const data = await response.json();
        
        let championsData = {};
        Object.keys(data.data).forEach(key => {
            const champ = data.data[key];
            championsData[champ.key] = {
                name: champ.name,
                id: champ.id, // Used in the icon URL
                iconUrl: `http://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champ.image.full}`
            };
        });

        return championsData;
    } catch (error) {
        console.error('Error fetching champions data:', error);
        return {};
    }
}

//function for restraining text within canvas bounds. 
function fitTextOnCanvas(ctx,text,maxWidth,x,y,minFontSize=12){
    let fontSize = 31.5;
    ctx.font = `bold ${fontSize}px lemonmilk`;
    while(ctx.measureText(text).width > maxWidth&&fontSize>minFontSize){
        fontSize--;
        ctx.font = `bold ${fontSize}px lemonmilk`;
    }
    if(fontSize>minFontSize){
        ctx.fillText(text,x,y);
    }else{
        console.log("Text is too long and font size is too small"); 
    }
}


async function createSummonerProfileCanvas(summonerIconUrl, rankIconUrl, championIconUrls, summonerData, soloDuoStats) {
    // Pre-calculate canvas dimensions
    const summonerIconSize = 160;
    const rankIconSize = 180;
    const champIconSize = 160;
    const champIconSpacing = 20;

    // Calculate canvas width and height
    const textHeight = 30;
    let adjustedTextStartY = 230;
    let canvasWidth = 400 + (championIconUrls.length * (champIconSize + champIconSpacing));
    let canvasHeight = adjustedTextStartY + textHeight;

    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    //background
    ctx.fillStyle = "000000";
    ctx.fillRect(0,0,canvasWidth,canvasHeight);

    // Load images
    const summonerIcon = await Canvas.loadImage(summonerIconUrl);
    const rankIcon = await Canvas.loadImage(rankIconUrl);
    const championIcons = await Promise.all(championIconUrls.map(url => Canvas.loadImage(url)));
    
    // Draw summoner icon
    ctx.drawImage(summonerIcon, 30, 30, summonerIconSize, summonerIconSize);

    // Draw rank icon
    ctx.drawImage(rankIcon, 200, 20, rankIconSize, rankIconSize);
    const champIconXStart = 400
    
    // Draw champion icons
    championIcons.forEach((icon, i) => {
        const champIconX = champIconXStart + (i * (champIconSize + champIconSpacing));
        ctx.drawImage(icon, champIconX, 30, champIconSize, champIconSize);
    });

    ctx.fillStyle = '#ffffff';

    // Add text
    fitTextOnCanvas(ctx, `Level: ${summonerData.summonerLevel} | Wins: ${soloDuoStats.wins} | Losses: ${soloDuoStats.losses} | Win Rate: ${((soloDuoStats.wins / (soloDuoStats.wins + soloDuoStats.losses)) * 100).toFixed(1)}%`, canvasWidth - 40, 20, adjustedTextStartY);

    return canvas.toBuffer();
}