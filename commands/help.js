module.exports = {
    name: 'help',
    description: 'List all commands',
    execute(message, args) {
        const data = [];
        const { commands } = message.client;

        if (!args.length) {
            //Print all commands if none are specified. 
            data.push('Here\'s a list of all my commands:');
            data.push(commands.map(command => `\`${command.name}\``).join(', ')); // Use backticks for command formatting
            data.push('\nYou can send `!help [command name]` to get info on a specific command!');
        } else {
            //show details about the command. 
            const name = args[0].toLowerCase();
            const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply('that\'s not a valid command!');
            }
            //Command information for printing. 
            data.push(`**Name:** ${command.name}`);
            if (command.description) data.push(`**Description:** ${command.description}`);
            if (command.usage) data.push(`**Usage:** ${command.usage}`);
        }

        // Making sure data is not empty before sending. 
        if (data.length > 0) {
            message.channel.send(data.join('\n'), { split: true })
                .catch(error => {
                    console.error(`Could not send help message in the channel to ${message.author.tag}.\n`, error);
                });
        } else {
            // If data is empty, send. 
            message.channel.send('No commands found.');
        }
    },
};