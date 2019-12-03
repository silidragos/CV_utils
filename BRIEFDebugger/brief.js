export function angle(tex, size) {
    const m10 = momentum(tex, size, 1, 0);
    const m01 = momentum(tex, size, 0, 1);
    console.log('m10', m10);
    console.log('m01', m01);
    let angle = Math.atan2(m10, m01);
    console.log('angle', angle * (180 / Math.PI));
    return angle;
}

export function momentum(tex, size, p, q) {
    let m = 0;
    const area = Math.floor(size / 2);
    const centerRow = area;
    const centerCol = area;
    let values = [];
    for (let j = -area; j < area; j++) {
        const dx = Math.floor(Math.sqrt(area * area - j * j));
        for (let i = -dx; i < dx; i++) {
            //for (let i = -area; i < area; i++) {
            m +=
                (0 + i >= 0 ? i + 1 : i) ** p *
                (0 + j >= 0 ? j + 1 : j) ** q *
                tex[(centerRow + i) * size + (centerCol + j)];
        }
    }
    return m;
}

export function descDistance(leftDesc, rightDesc) {
    let distance = 0;

    for (let i = 0; i < leftDesc.length; i++) {
        let from = leftDesc[i];
        let to = rightDesc[i];
        for (let j = 0; j < 8; j++) {
            if (from % 2 !== to % 2) {
                distance++;
            }
            from = Math.floor(from / 2);
            to = Math.floor(to / 2);
        }
    }

    return distance;
}

export function BFMatch(canvas, l_points, r_points) {
    let matches = [];
    for (const i in l_points) {
        let ldesc = l_points[i].descriptor;
        let minDistance = 257;
        let ratio = 0;
        let minMatchIdx = [];
        for (const j in r_points) {
            let rdesc = r_points[j].descriptor;
            let distance = descDistance(ldesc, rdesc);
            if (distance < minDistance) {
                ratio = minDistance / distance;
                minDistance = distance;
                minMatchIdx = j;
            }
        }
        if (ratio > 1.4) {
            matches.push({ left: i, right: minMatchIdx, distance: minDistance });
        }
    }
    console.log(matches);

    let ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#FF0000';
    for (const match of matches) {
        ctx.beginPath();
        ctx.moveTo(l_points[match.left].screenPos[0], 480 - l_points[match.left].screenPos[1]);
        ctx.lineTo(640 + r_points[match.right].screenPos[0], 480 - r_points[match.right].screenPos[1]);
        ctx.stroke();
    }
}
