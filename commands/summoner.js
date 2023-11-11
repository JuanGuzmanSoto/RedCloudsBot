const fetch = require('node-fetch');
const { EmbedBuilder,AttachmentBuilder  } = require('discord.js'); 
const Canvas = require('canvas');
const {registerFont, createCanvas } = require('canvas'); 
registerFont('font/Consolas.ttf', {family: 'Consolas'});
module.exports = {
    name: 'summoner',
    description: 'Get League of Legends summoner profile',
    async execute(message, args) {
        const processedArgs = preprocessArgs(args);
        if (processedArgs.length<1) {
            return message.reply('You need to provide a summoner name.');
        }

        const apiKey = process.env.RIOT_API_KEY; 
        const region = 'na1';
        const embeds = [];
        const championsData = await getChampionsData(); 
        for (const summonerName of processedArgs) {
            try {
                // Fetch Summoner Information
                const encodedName = encodeURIComponent(summonerName);
                const summonerResponse = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedName}`, {
                    headers: { "X-Riot-Token": apiKey }
                });
                if (!summonerResponse.ok) {
                    throw new Error(`Error fetching data for ${summonerName}: ${summonerResponse.statusText}`);
                }
                
                //finding ranked data
                const summonerData = await summonerResponse.json();
                const rankedResponse = await fetch(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`, {
                    headers: { "X-Riot-Token": apiKey }
                });

                if (!rankedResponse.ok) {
                    throw new Error(`Error fetching ranked data for ${summonerName}: ${rankedResponse.statusText}`);
                }

                //ranked stats
                const rankedData = await rankedResponse.json();
                const soloDuoStats = rankedData.find(queue => queue.queueType === 'RANKED_SOLO_5x5') || {};

                //finding champion data
                const masteryResponse = await fetch (`https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerData.id}`, {
                    headers: { "X-Riot-Token": apiKey }
                });
                
                if(!masteryResponse.ok){
                    throw new Error(`Error fetching champion mastery data for ${summonerName}: ${masteryResponse.statusText}`);
                }
                //Champion Mastery Data
                const masteryData = await masteryResponse.json();
                const topChampions = masteryData.slice(0, 3).map(mastery => {
                    const champion = championsData[mastery.championId];
                    const championIconUrl = `http://ddragon.leagueoflegends.com/cdn/11.24.1/img/champion/${champion.id}.png`;
                    return { name: champion.name, iconUrl: championIconUrl };
                });

                //Gets Icons
                const topChampionIconUrls = topChampions.map(champion => champion.iconUrl);
                const summonerIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.22.1/img/profileicon/${summonerData.profileIconId}.png`;
                const rankIconUrl = getRankedIconUrl(soloDuoStats.tier);
                
                // Create combined image
                const combinedImageBuffer = await createCombinedImage(summonerIconUrl, rankIconUrl, topChampionIconUrls, summonerData, soloDuoStats);
                const attachment = new AttachmentBuilder(combinedImageBuffer, { name: 'profile-image.png' });
                // Creating Embed
                //reply  
                const replyEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${summonerData.name}'s Profile`)
                .setImage('attachment://profile-image.png');

                message.channel.send({ embeds: [replyEmbed], files: [attachment] });
            } catch (error) {
                console.error(error);
                message.reply(`Failed to fetch information for ${summonerName}.`);
                return;
            }
        }
        if(embeds.length>0){
        message.channel.send({embeds:embeds});
        }
    }
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
//Checks if the argument contained quotations to store as a single string. 
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

function fitTextOnCanvas(ctx,text,maxWidth,x,y,minFontSize=12){
    let fontSize = 31.5;
    ctx.font = `bold ${fontSize}px Consolas`;
    while(ctx.measureText(text).width > maxWidth&&fontSize>minFontSize){
        fontSize--;
        ctx.font = `bold ${fontSize}px Consolas`;
    }
    if(fontSize>minFontSize){
        ctx.fillText(text,x,y);
    }else{
        console.log("Textis too long and font size is too small"); 
    }
}
async function createCombinedImage(summonerIconUrl, rankIconUrl, championIconUrls, summonerData, soloDuoStats) {
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