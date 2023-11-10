const { addPoints } = require('../database');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'addpoints',
    description: 'Add points to the user',
    async execute(message, args) {
        if (message.member.permissions.has(PermissionFlagsBits.Administrator)){
        const pointsToAdd = parseInt(args[0], 10);
            if (isNaN(pointsToAdd)) {
                return message.channel.send('Please provide a valid number of points to add.');
            }

            try {
                await addPoints(message.author.id, pointsToAdd);
                message.channel.send(`Added ${pointsToAdd} points.`);
            } catch (error) {
                console.error(error);
                message.reply('There was an error adding points.');
            }
        }
        else{
            message.reply('You do not have the required permission to execute this command'); 
        }
    },
};