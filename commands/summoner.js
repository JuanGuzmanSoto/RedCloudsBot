const fetch = require('node-fetch');
const { EmbedBuilder  } = require('discord.js'); 
module.exports = {
    name: 'summoner',
    description: 'Get League of Legends summoner profile',
    async execute(message, args) {
        if (args.length<1) {
            return message.reply('You need to provide a summoner name.');
        }

        const apiKey = process.env.RIOT_API_KEY; 
        const region = 'na1';
        const embeds = [];

        for (const summonerName of args) {
            try {
                // Fetch Summoner Information
                const encodedName = encodeURIComponent(summonerName);
                const summonerResponse = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodedName}`, {
                    headers: { "X-Riot-Token": apiKey }
                });

                if (!summonerResponse.ok) {
                    throw new Error(`Error fetching data for ${summonerName}: ${summonerResponse.statusText}`);
                }

                const summonerData = await summonerResponse.json();
                const rankedResponse = await fetch(`https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`, {
                    headers: { "X-Riot-Token": apiKey }
                });

                if (!rankedResponse.ok) {
                    throw new Error(`Error fetching ranked data for ${summonerName}: ${rankedResponse.statusText}`);
                }

                const rankedData = await rankedResponse.json();
                const soloDuoStats = rankedData.find(queue => queue.queueType === 'RANKED_SOLO_5x5') || {};

                // Creating Embed
                const summonerIconUrl = `http://ddragon.leagueoflegends.com/cdn/11.24.1/img/profileicon/${summonerData.profileIconId}.png`;
                const rankIconUrl = getRankedIconUrl(soloDuoStats.tier);

                const replyEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(summonerData.name)
                    .setDescription(`Level: ${summonerData.summonerLevel}`)
                    .addFields(
                        { name: 'Rank', value: `${soloDuoStats.tier} ${soloDuoStats.rank}`, inline: true },
                        { name: 'Wins', value: soloDuoStats.wins.toString(), inline: true },
                        { name: 'Losses', value: soloDuoStats.losses.toString(), inline: true },
                        { name: 'Win Rate', value: `${((soloDuoStats.wins / (soloDuoStats.wins + soloDuoStats.losses)) * 100).toFixed(1)}%`, inline: true }
                    )
                    .setThumbnail(summonerIconUrl)
                    .setImage(rankIconUrl);

                embeds.push(replyEmbed);
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