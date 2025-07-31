const epLevels = [
  { ep: 0, name: 'Getting acquainted' },
  { ep: 50, name: 'Friendly' },
  { ep: 125, name: 'Affectionate' },
  { ep: 225, name: 'Loyal' },
  { ep: 350, name: 'Loving' },
  { ep: 500, name: 'Bonded' },
];

function getEpLevel(ep) {
  let currentLevel = 0;
  let currentLevelObj = epLevels[0];
  let nextThreshold = null;

  for (let i = 1; i < epLevels.length; i++) {
    if (ep >= epLevels[i].ep) {
      currentLevel = i;
      currentLevelObj = epLevels[i];
    } else {
      nextThreshold = epLevels[i].ep;
      break;
    }
  }

  return {
    level: currentLevel,        // <-- this is what was missing
    name: currentLevelObj.name,
    current: currentLevelObj.ep,
    next: nextThreshold
  };
}

 

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

function getXpLevelThreshold(level) {
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
  return xpLevels[level] ?? null;
}

module.exports = {
  getXpLevel,
  getEpLevel,
  getXpLevelThreshold,
};
