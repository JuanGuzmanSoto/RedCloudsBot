//building.js 
const { AttachmentBuilder, EmbedBuilder } = require('discord.js'); 
const Canvas = require('canvas');
const {registerFont} = require('canvas'); 
registerFont('font/LEMONMILK-Bold.otf', {family: 'lemonmilk'});
const { fetchChampionMasteryData, getRankedIconUrl} = require('./leagueAPI');


module.exports = {
    createMatchHistoryCanvas,
    createProfileEmbed,
    createMatchHistoryCanvas,
    fitTextOnCanvas,
    createSummonerProfileCanvas
}



//SummonerProfileCanvas
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


//MatchHistoryCanvas
async function createMatchHistoryCanvas(matchHistoryData, championsData) {
    // Constants for layout
    const sectionHeight = 140; // The height of each match section, increased to accommodate more text
    const spacing = 20; // Spacing between each match section
    const canvasWidth = 800; // Width of the canvas

    // Calculate the total height of the canvas
    const canvasHeight = (sectionHeight + spacing) * matchHistoryData.length + spacing; // Extra spacing for the top

    // Create the canvas
    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Set a background color
    ctx.fillStyle = '#000000'; // Discord dark theme background color
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set text style
    ctx.font = 'bold 18px lemonmilk';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Iterate over each match to draw sections
    for (let i = 0; i < matchHistoryData.length; i++) {
        const match = matchHistoryData[i];
        const yPosition = i * (sectionHeight + spacing) + spacing;

        // Draw section background based on win/loss
        ctx.fillStyle = match.outcome === 'Win' ? '#4169e1' : '#800000';
        ctx.fillRect(spacing, yPosition, canvasWidth - (spacing * 2), sectionHeight);

        // Load the champion icon
        const championKey = match.championName.replace(/\s+/g, ''); // Remove whitespace for champion names like "Lee Sin"
        const championIconUrl = `http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${championKey}.png`;
        const timestamp = match.timestamp ? new Date(match.timestamp).toLocaleString() : 'Unknown';
        try {
            const championIcon = await Canvas.loadImage(championIconUrl);
            const iconSize = 120; // Example size, you may adjust
            ctx.drawImage(championIcon, spacing * 2, yPosition + (sectionHeight - iconSize) / 2, iconSize, iconSize);
        } catch (error) {
            console.error('Error loading champion icon:', error);
            // Handle the error, perhaps with a placeholder image or error message
        }

        // Draw the match text
        const textX = spacing * 2 + 130; // Adjust text start after icon
        ctx.fillStyle = '#FFFFFF'; // White text color
        ctx.fillText(`Game ID: ${match.gameId}`, textX, yPosition + 35);
        ctx.fillText(`Champion: ${match.championName}`, textX, yPosition + 70);
        ctx.fillText(`KDA: ${match.kills}/${match.deaths}/${match.assists}`, textX, yPosition + 105);
        ctx.fillText(`Queue Type: ${match.queueType}`,300,yPosition + 110)
        ctx.fillText(`Date: ${timestamp}`, 350, yPosition + 200);
    }   

    // Return the canvas buffer
    return canvas.toBuffer();
}
//ProfileEmbedding
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
      .setColor('#000000')
      .setTitle(`${summonerData.name}'s Profile`)
      .setImage('attachment://profile-image.png');
  
    return { embed: profileEmbed, attachment: attachment };
  }


  //Match History Embedding, (Canvas output) 
  function createMatchHistoryEmbed(matchHistoryData) {
    const embeds = [];
    matchHistoryData.forEach((match, index) => { 
            const gameId = match.gameId || 'Unknown';
            const championName = match.championName || 'Unknown';
            const kda = `${match.kills || 0}/${match.deaths || 0}/${match.assists || 0}`;
            const outcome = match.outcome || 'Unknown';
            const queueType = match.queueType || 'Unknown';
            const timestamp = match.timestamp ? new Date(match.timestamp) : new Date();

            // Set color based on outcome
            const color = outcome === 'Win' ? 0x4169e1 : 0x800000; // Hexadecimal color format

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`Game ID: ${gameId}`)
                .addFields([
                    { name: 'Champion', value: championName, inline: true },
                    { name: 'KDA', value: kda, inline: true },
                    { name: 'Outcome', value: outcome, inline: true },
                    { name: 'Queue Type', value: queueType, inline: true }
                ])
                .setTimestamp(timestamp);

            if (championName !== 'Unknown') {
                embed.setThumbnail(`http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${championName}.png`);
            }
            embeds.push(embed);
    });

    return embeds.length > 0 ? embeds : [new EmbedBuilder().setTitle('No recent matches found')];
}