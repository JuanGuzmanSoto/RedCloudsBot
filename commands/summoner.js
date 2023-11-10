const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = {
    name: 'summoner',
    description: 'Get information about a League of Legends summoner',
    async execute(message, args) {
        if (!args.length) {
            return message.channel.send('You need to specify a summoner\'s name!');
        }

        const summonerName = args.join(' '); // Join the arguments in case the summoner name has spaces
        const url = `https://www.op.gg/summoners/na/${encodeURIComponent(summonerName)}`;

        try {
            const response = await fetch(url);
            const body = await response.text();
            const $ = cheerio.load(body);

            // Use the correct selectors to find the rank, level, and winrate
            // These are placeholder selectors; you'll need to replace them with the actual ones
            const rank = $('div.tier').first().text().trim();
            const level = $('div.level').text().trim();
            const winrate = $('div.ratio').first().text().trim();

            // Construct the reply
            const reply = `${summonerName} - Rank: ${rank}, Level: ${level}, ${winrate}`;

            // Send the message to the Discord channel
            message.channel.send(reply);
        } catch (error) {
            console.error(error);
            message.reply('Failed to fetch summoner information.');
        }
    },
};