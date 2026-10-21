export function checkChallengeStatus(teamA, teamB, scoreA, scoreB, shotsTakenA, shotsTakenB, totalRounds) {
  // Calculate how many shots each team has left in the standard rounds
  const remainingA = totalRounds - shotsTakenA;
  const remainingB = totalRounds - shotsTakenB;
  console.log(`Remaining ${teamA}: ${remainingA}, Remaining ${teamB}: ${remainingB}`);


  // Check if Team A has mathematically won (Team B can't catch up)
  if (scoreA > scoreB + remainingB) {
    return { winner: teamA }
  }

  // Check if Team B has mathematically won (Team A can't catch up)
  if (scoreB > scoreA + remainingA) {
    return { winner: teamB };
  }

  // Check if both teams have taken all their shots and the score is equal
  if (shotsTakenA >= totalRounds && shotsTakenB >= totalRounds && scoreA === scoreB) {
    return { winner: 0 };
  }

  // If nobody has won yet and shots are still remaining
  return { winner: undefined };
}