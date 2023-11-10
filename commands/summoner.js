const fetch = require('node-fetch');

module.exports = {
    name: 'summoner',
    description: 'Get League of Legends summoner profile',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('You need to provide a summoner name.');
        }

        const apiKey = process.env.RIOT_API_KEY; 
        const summonerName = encodeURIComponent(args.join(' '));
        const region = 'na1';

        try {
            const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`, {
                headers: {
                    "X-Riot-Token": apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching summoner data: ${response.statusText}`);
            }

            const summonerData = await response.json();
            const reply = `Summoner Name: ${summonerData.name}, Level: ${summonerData.summonerLevel}`;
            message.channel.send(reply);
        } catch (error) {
            console.error(error);
            message.reply('Failed to fetch summoner information.');
        }
    },
};