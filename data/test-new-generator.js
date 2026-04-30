function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generatePuzzleWalk(rows, cols, minHoles, maxHoles) {
    const totalCells = rows * cols;
    const grid = new Array(totalCells).fill(0);
    const visited = new Set();

    const start = Math.floor(Math.random() * totalCells);
    visited.add(start);
    
    let current = start;
    let remainingCells = [];
    for (let i = 0; i < totalCells; i++) {
        if (i !== start) remainingCells.push(i);
    }
    shuffle(remainingCells);

    while (visited.size < totalCells) {
        const stepMin = 2;
        const stepMax = 4;
        const steps = Math.floor(Math.random() * (stepMax - stepMin + 1)) + stepMin;
        
        let walked = false;
        for (let s = 0; s < steps; s++) {
            const neighbors = [];
            const r = Math.floor(current / cols);
            const c = current % cols;
            
            if (r > 0 && !visited.has(current - cols)) neighbors.push(current - cols);
            if (r < rows - 1 && !visited.has(current + cols)) neighbors.push(current + cols);
            if (c > 0 && !visited.has(current - 1)) neighbors.push(current - 1);
            if (c < cols - 1 && !visited.has(current + 1)) neighbors.push(current + 1);
            
            if (neighbors.length === 0) break;
            
            shuffle(neighbors);
            current = neighbors[0];
            visited.add(current);
            walked = true;
        }
        
        if (!walked) break;
        
        const validCandidates = remainingCells.filter(c => !visited.has(c));
        if (validCandidates.length > 0) {
            shuffle(validCandidates);
            const hole = validCandidates[0];
            grid[hole] = 1;
            remainingCells = remainingCells.filter(c => c !== hole);
        }
    }
    
    const unvisited = [];
    for (let i = 0; i < totalCells; i++) {
        if (!visited.has(i)) {
            grid[i] = 1;
            unvisited.push(i);
        }
    }
    
    const holes = [];
    for (let i = 0; i < totalCells; i++) {
        if (grid[i] === 1) holes.push(i);
    }
    
    if (holes.length < minHoles) {
        const available = [];
        for (let i = 0; i < totalCells; i++) {
            if (grid[i] === 0) available.push(i);
        }
        shuffle(available);
        const addCount = minHoles - holes.length;
        for (let i = 0; i < addCount && i < available.length; i++) {
            holes.push(available[i]);
            grid[available[i]] = 1;
        }
    }
    
    if (holes.length > maxHoles) {
        shuffle(holes);
        holes.length = maxHoles;
        for (let i = 0; i < totalCells; i++) {
            grid[i] = holes.includes(i) ? 1 : 0;
        }
    }
    
    const visitedCount = visited.size;
    const resultHoles = [];
    for (let i = 0; i < totalCells; i++) {
        if (grid[i] === 1) resultHoles.push(i);
    }
    
    return { holes: resultHoles, visitedCount };
}

function visualizeGrid(rows, cols, holes) {
    const holeSet = new Set(holes);
    let s = '\n';
    for (let r = 0; r < rows; r++) {
        let row = '';
        for (let c = 0; c < cols; c++) {
            const cell = r * cols + c;
            if (holeSet.has(cell)) row += 'XX ';
            else row += '-- ';
        }
        s += row + '\n';
    }
    return s;
}

function checkClustering(holes, cols) {
    const holeSet = new Set(holes);
    let clusterCount = 0;
    let maxClusterSize = 0;
    const visited = new Set();

    for (const hole of holes) {
        if (visited.has(hole)) continue;
        let clusterSize = 0;
        const stack = [hole];

        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);
            clusterSize++;

            const r = Math.floor(current / cols);
            const c = current % cols;
            const neighbors = [
                r > 0 ? current - cols : -1,
                r < 10 ? current + cols : -1,
                c > 0 ? current - 1 : -1,
                c < cols - 1 ? current + 1 : -1
            ].filter(n => n >= 0 && holeSet.has(n) && !visited.has(n));

            for (const n of neighbors) {
                if (!visited.has(n)) stack.push(n);
            }
        }

        if (clusterSize > 0) clusterCount++;
        maxClusterSize = Math.max(maxClusterSize, clusterSize);
    }

    return { clusterCount, maxClusterSize };
}

console.log('=== 测试随机行走生成算法 ===\n');

console.log('--- Easy (6x6, 6-8 holes) ---');
for (let i = 0; i < 5; i++) {
    const result = generatePuzzleWalk(6, 6, 6, 8);
    const stats = checkClustering(result.holes, 6);
    console.log('Easy #' + (i+1) + ': holes=' + result.holes.length + ', clusters=' + stats.clusterCount + ', max=' + stats.maxClusterSize);
    console.log(visualizeGrid(6, 6, result.holes));
}

console.log('\n--- Medium (8x8, 8-12 holes) ---');
for (let i = 0; i < 3; i++) {
    const result = generatePuzzleWalk(8, 8, 8, 12);
    const stats = checkClustering(result.holes, 8);
    console.log('Medium #' + (i+1) + ': holes=' + result.holes.length + ', clusters=' + stats.clusterCount + ', max=' + stats.maxClusterSize);
    console.log(visualizeGrid(8, 8, result.holes));
}

console.log('\n--- Hard (10x10, 12-18 holes) ---');
for (let i = 0; i < 3; i++) {
    const result = generatePuzzleWalk(10, 10, 12, 18);
    const stats = checkClustering(result.holes, 10);
    console.log('Hard #' + (i+1) + ': holes=' + result.holes.length + ', clusters=' + stats.clusterCount + ', max=' + stats.maxClusterSize);
    console.log(visualizeGrid(10, 10, result.holes));
}