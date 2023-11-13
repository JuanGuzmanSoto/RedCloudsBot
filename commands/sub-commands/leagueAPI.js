//leagueAPI fetching
module.exports = {
  fetchChampionMasteryData,
  fetchMatchHistory,
  getMatchDetails,
  getMatchlistByPuuid,
  fetchSummonerData,
  fetchRankedData,
  getChampionsData,
  getRankedIconUrl,
  fetchPlayerStatus
};
const queueIdMap = {
    400: 'Normal Draft',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM'
}


//fetch status of player
async function fetchPlayerStatus(summonerId, apiKey, region) {
  const response = await fetch(`https://${region}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${encodeURIComponent(summonerId)}`, {
      headers: {"X-Riot-Token": apiKey}
  });
  const responseBody = await response.text(); // Get response body as text

  if (!response.ok && response.status !== 404) {
      throw new Error(`Error: ${responseBody}`);
  }
  return response.ok ? JSON.parse(responseBody) : null;
}
//Summoner Data
async function fetchSummonerData(summonerName, apiKey, region) {
  const response = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`, {
      headers: { "X-Riot-Token": apiKey }
  });

  if (!response.ok) {
      throw new Error(`Failed to fetch summoner data for ${summonerName}`);
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
    const response = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=10`, {
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