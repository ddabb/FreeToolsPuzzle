const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.match(/^(easy|medium|hard)-\d+\.json$/));
console.log('='.repeat(60));
console.log('Sokoban Puzzle Statistics');
console.log('='.repeat(60));
console.log('Total puzzles:', files.length);

const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
const stepCounts = {};
const pushCounts = {};
let totalSteps = 0;
let totalPushes = 0;
let minSteps = Infinity;
let maxSteps = 0;
let minPushes = Infinity;
let maxPushes = 0;

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    const match = file.match(/^(easy|medium|hard)-(\d+)\.json$/);
    if (match) {
      const difficulty = match[1];
      difficultyCounts[difficulty]++;
    }
    
    const steps = data.actualSteps || data.answer?.length || 0;
    const pushes = data.pushCount || (data.answer?.filter(m => m.length > 1).length || 0);
    
    const stepKey = String(steps);
    stepCounts[stepKey] = (stepCounts[stepKey] || 0) + 1;
    
    const pushKey = String(pushes);
    pushCounts[pushKey] = (pushCounts[pushKey] || 0) + 1;
    
    totalSteps += steps;
    totalPushes += pushes;
    minSteps = Math.min(minSteps, steps);
    maxSteps = Math.max(maxSteps, steps);
    minPushes = Math.min(minPushes, pushes);
    maxPushes = Math.max(maxPushes, pushes);
  } catch (e) {}
}

const avgSteps = totalSteps / files.length;
const avgPushes = totalPushes / files.length;

console.log('Average steps:', avgSteps.toFixed(2));
console.log('Average pushes:', avgPushes.toFixed(2));
console.log('Min steps:', minSteps);
console.log('Max steps:', maxSteps);
console.log('Min pushes:', minPushes);
console.log('Max pushes:', maxPushes);

console.log('\nStep Distribution (Top 20):');
const sortedSteps = Object.keys(stepCounts).map(Number).sort((a, b) => b - a);
for (let i = 0; i < Math.min(20, sortedSteps.length); i++) {
  const s = sortedSteps[i];
  const percent = (stepCounts[s] / files.length * 100).toFixed(1);
  console.log('  ' + s + ' steps: ' + stepCounts[s] + ' (' + percent + '%)');
}

console.log('\nPush Distribution (Top 15):');
const sortedPushes = Object.keys(pushCounts).map(Number).sort((a, b) => b - a);
for (let i = 0; i < Math.min(15, sortedPushes.length); i++) {
  const p = sortedPushes[i];
  const percent = (pushCounts[p] / files.length * 100).toFixed(1);
  console.log('  ' + p + ' pushes: ' + pushCounts[p] + ' (' + percent + '%)');
}

console.log('\nDifficulty Distribution (by filename):');
console.log('Easy:', difficultyCounts.easy, '(' + ((difficultyCounts.easy / files.length) * 100).toFixed(1) + '%)');
console.log('Medium:', difficultyCounts.medium, '(' + ((difficultyCounts.medium / files.length) * 100).toFixed(1) + '%)');
console.log('Hard:', difficultyCounts.hard, '(' + ((difficultyCounts.hard / files.length) * 100).toFixed(1) + '%)');

console.log('\nDifficulty Distribution (by steps):');
const easyBySteps = Object.keys(stepCounts).map(Number).filter(s => s >= 10 && s <= 20).reduce((sum, s) => sum + stepCounts[s], 0);
const mediumBySteps = Object.keys(stepCounts).map(Number).filter(s => s > 20 && s <= 35).reduce((sum, s) => sum + stepCounts[s], 0);
const hardBySteps = Object.keys(stepCounts).map(Number).filter(s => s > 35).reduce((sum, s) => sum + stepCounts[s], 0);
console.log('Easy (10-20 steps):', easyBySteps);
console.log('Medium (21-35 steps):', mediumBySteps);
console.log('Hard (>35 steps):', hardBySteps);

console.log('\n' + '='.repeat(60));
