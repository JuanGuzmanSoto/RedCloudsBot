const { getPoints } = require('../database');
module.exports = {
    name: 'getpoints',
    description: 'Get the total points of the user',
    async execute(message, args) {
        try {
            const rows = await getPoints(message.author.id, '2021-01-01', new Date().toISOString());
            const totalPoints = rows[0]?.totalPoints || 0; 
            message.reply(`${message.author.username} has a total of ${totalPoints} points.`);
        } catch (error) {
            console.error(error);
            message.reply('Failed to retrieve points.');
        }
    },
};