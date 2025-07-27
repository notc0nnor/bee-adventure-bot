function getXpLevel(xp) {
  const xpLevels = [
    0,     // Level 0
    50,    // Level 1
    135,   // Level 2
    255,   // Level 3
    420,   // Level 4
    600,   // Level 5
    850,   // Level 6
    1200,  // Level 7
    1600,  // Level 8
    1950,  // Level 9
    2500   // Level 10+
  ];

  for (let i = xpLevels.length - 1; i >= 0; i--) {
    if (xp >= xpLevels[i]) return i;
  }

  return 0; // Default to level 0
}

module.exports = { getXpLevel };
