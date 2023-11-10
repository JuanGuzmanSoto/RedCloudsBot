const sqlite3 = require('sqlite3').verbose();
const database = new sqlite3.Database('./data/database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database: ', err);
    } else {
        console.log('Connected to the SQLite database.');
        // Correct SQL statement and method to execute it
        database.run('CREATE TABLE IF NOT EXISTS scores (userId TEXT, points INTEGER, date TEXT)', (err) => {
            if (err) {
                console.error('Error creating table: ', err);
            } else {
                console.log('Scores table created or already exists.');
            }
        });
    }
});
function addPoints(userId, points){
    return new Promise((resolve, reject) => {
        const currentDate = new Date().toISOString(); // Date Object creation
        database.run('INSERT INTO scores (userId, points, date) VALUES (?, ?, ?)', [userId, points, currentDate], function(err) {
            if (err) {
                console.error('Error adding points:', err.message);
                reject(err);
            } else {
                console.log(`Points added to user ${userId}: ${points}`); //backticks for template literal
                resolve(this.lastID);
            }
        });
    });
}
function getPoints(userId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT SUM(points) as totalPoints FROM scores WHERE userId = ? AND date BETWEEN ? AND ?';
        database.all(sql, [userId, startDate, endDate], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}
module.exports = {addPoints, getPoints};