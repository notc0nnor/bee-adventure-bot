

const levels = [
  { ep: 0,    name: "Getting Acquainted" }, // Level 0
  { ep: 50,   name: "Engaging" },           // Level 1
  { ep: 135,  name: "Interested" },         // Level 2
  { ep: 255,  name: "Connected" },          // Level 3
  { ep: 420,  name: "Friendly" },           // Level 4
  { ep: 600,  name: "Trusting" },           // Level 5
  { ep: 850,  name: "Affectionate" },       // Level 6
  { ep: 1200, name: "Loyal" },              // Level 7
  { ep: 1600, name: "Loving" },             // Level 8
  { ep: 1950, name: "Bonded" },             // Level 9
  { ep: 2500, name: "Soulbound" },          // Level 10
];

function getLevel(ep) {
  let currentLevel = 0;
  let currentLevelObj = levels[0];
  let nextThreshold = null;

  for (let i = 1; i < levels.length; i++) {
    if (ep >= levels[i].ep) {
      currentLevel = i;
      currentLevelObj = levels[i];
    } else {
      nextThreshold = levels[i].ep;
      break;
    }
  }

  return {
    level: currentLevel,
    name: currentLevelObj.name,
    current: currentLevelObj.ep,
    next: nextThreshold
  };
}

function getLevelThreshold(level) {
  return levels[level] ? levels[level].ep : null;
}

module.exports = {
  getLevel,
  getLevelThreshold,
};
