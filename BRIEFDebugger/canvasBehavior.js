import jsonData_l from './img/2019.12.03.16.33.34.js';
import jsonData_r from './img/2019.12.03.16.33.52.js';

import * as BRIEF from './brief.js';

const SIZE = 48; //49;
const SCALE = 6;

const canvas_l = document.querySelector('#canvas_1');
const canvas_r = document.querySelector('#canvas_2');
const image_l = new Image(640, 480);
const image_r = new Image(640, 480);

let leftDesc = undefined;
let rightDesc = undefined;
let originalAngle = 0;

image_l.addEventListener('load', e => {
    canvas_l.getContext('2d').drawImage(image_l, 0, 0);
});
image_l.src = 'img/2019.12.03.16.33.34.png';

image_r.addEventListener('load', e => {
    canvas_r.getContext('2d').drawImage(image_r, 0, 0);
});
image_r.src = 'img/2019.12.03.16.33.52.png';

/**
 * FEATURE POINTS
 */
for (let point of jsonData_l.points) {
    let circleBut = document.createElement('button');
    circleBut.style.position = 'absolute';
    circleBut.style.left = point.screenPos[0] - 5 + 'px';
    circleBut.style.top = 480 - point.screenPos[1] - 5 + 'px';
    circleBut.setAttribute('data-side', 'l');
    circleBut.setAttribute('data-descriptor', JSON.stringify(point.descriptor));
    circleBut.setAttribute('data-angle', JSON.stringify(point.angle));
    circleBut.setAttribute('class', 'feature-point');
    document.body.appendChild(circleBut);
}

for (let point of jsonData_r.points) {
    let circleBut = document.createElement('button');
    circleBut.style.position = 'absolute';
    circleBut.style.left = 640 + point.screenPos[0] - 5 + 'px';
    circleBut.style.top = 480 - point.screenPos[1] - 5 + 'px';
    circleBut.setAttribute('data-side', 'r');
    circleBut.setAttribute('data-descriptor', JSON.stringify(point.descriptor));
    circleBut.setAttribute('data-angle', JSON.stringify(point.angle));
    circleBut.setAttribute('class', 'feature-point');
    document.body.appendChild(circleBut);
}

/**
 * PICKER
 * */
let pickerCanvas_l = createPickerCanvas(SIZE, SCALE);
let pickerCanvas_r = createPickerCanvas(SIZE, SCALE);
document.querySelector('body').appendChild(pickerCanvas_l);
document.querySelector('body').appendChild(pickerCanvas_r);
let overlayCanvas = createOverlayCanvas();
document.querySelector('body').appendChild(overlayCanvas);

document.addEventListener('click', showPatch);
document.getElementById('calc-hamming').addEventListener('click', calculateDescriptorDistance);
document.getElementById('calc-matches').addEventListener('click', () => {
    BRIEF.BFMatch(overlayCanvas, jsonData_l.points, jsonData_r.points);
});

function showPatch(e) {
    if (
        e.target.tagName !== 'BUTTON' &&
        pickerCanvas_l.style.display === 'none' &&
        pickerCanvas_r.style.display === 'none'
    ) {
        return;
    }

    let pickerCanvas = undefined;
    if (e.target.getAttribute('data-side') === 'l') {
        pickerCanvas = pickerCanvas_l;
    } else if (e.target.getAttribute('data-side') === 'r') {
        pickerCanvas = pickerCanvas_r;
    } else {
        return;
    }
    // * Click to close
    if (pickerCanvas.style.display !== 'none') {
        pickerCanvas.width = pickerCanvas.width;

        if (e.target.getAttribute('data-side') === 'l') {
            leftDesc = undefined;
        } else {
            rightDesc = undefined;
        }
        return (pickerCanvas.style.display = 'none');
    }

    let paragraph = undefined;
    originalAngle = e.target.getAttribute('data-angle');
    if (e.target.getAttribute('data-side') === 'l') {
        paragraph = document.getElementById('from-desc');
        leftDesc = JSON.parse(e.target.getAttribute('data-descriptor'));
    } else {
        paragraph = document.getElementById('to-desc');
        rightDesc = JSON.parse(e.target.getAttribute('data-descriptor'));
    }
    paragraph.innerHTML = e.target.getAttribute('data-descriptor');

    // * Click to open
    const btnBBox = e.target.getBoundingClientRect();
    const clientX = btnBBox.x + Math.floor(btnBBox.width / 2);
    const clientY = btnBBox.y + Math.floor(btnBBox.height / 2);

    // e.clientX, e.clientY
    console.log(clientX + '..' + clientY);
    let canvasBBox = clientX <= 640 ? canvas_l.getBoundingClientRect() : canvas_r.getBoundingClientRect();
    let canvasX = clientX - canvasBBox.x;
    let canvasY = clientY - canvasBBox.y;

    // Draw canvas
    drawPixels(canvasX, canvasY, clientX <= 640 ? canvas_l : canvas_r, pickerCanvas);
    //   this.drawGrid(pickerCtx);
    //   this.drawMiddlePoint(pickerCtx);

    pickerCanvas.style.display === 'none' ? showPickerCanvas(e, pickerCanvas) : (pickerCanvas.style.display = 'none');
}

function drawPixels(x, y, sourceCanvas, targetCanvas) {
    const data = sourceCanvas
        .getContext('2d')
        .getImageData(x - Math.floor(SIZE / 2), y - Math.floor(SIZE / 2), SIZE, SIZE);
    const clampedArray = new Array((SIZE * SCALE) ** 2 * 4);

    let cleanArr = new Array(SIZE ** 2);
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const originalDataIndex = row * SIZE * 4 + col * 4;

            const grayScale = _getGrayscale(
                data.data[originalDataIndex],
                data.data[originalDataIndex + 1],
                data.data[originalDataIndex + 2]
            );
            cleanArr[row * SIZE + col] = grayScale;
        }
    }

    let angle = BRIEF.angle(cleanArr, SIZE);
    cleanArr = _rotateArray(cleanArr, angle);

    //SIZE**2 * SCALE**2 * 4
    for (let i = 0; i < cleanArr.length; i++) {
        for (let j = 0; j < SCALE ** 2; j++) {
            const rowOffset = Math.floor(j / SCALE);
            const colOffset = Math.floor(j % SCALE);
            const row = Math.floor(i / SIZE);
            const col = Math.floor(i % SIZE);

            const startIndex = (row * SCALE + rowOffset) * (SIZE * SCALE) * 4 + (col * SCALE + colOffset) * 4;

            clampedArray[startIndex] = cleanArr[i]; //r
            clampedArray[startIndex + 1] = cleanArr[i]; //g
            clampedArray[startIndex + 2] = cleanArr[i]; //b
            clampedArray[startIndex + 3] = 255; //a
        }
    }
    const pixelData = new ImageData(new Uint8ClampedArray(clampedArray), SIZE * SCALE, SIZE * SCALE);

    targetCanvas.getContext('2d').putImageData(pixelData, 0, 0);
    _drawAngle(targetCanvas, (SIZE * SCALE) / 2, (SIZE * SCALE) / 2, 150, angle);
}

function createPickerCanvas(SIZE = SIZE, SCALE = SCALE) {
    const pickerCanvas = document.createElement('canvas');
    pickerCanvas.id = 'pickerCanvas';
    pickerCanvas.width = SIZE * SCALE;
    pickerCanvas.height = SIZE * SCALE;
    pickerCanvas.style.pointerEvents = 'none';
    pickerCanvas.style.display = 'none';
    pickerCanvas.style.position = 'absolute';

    return pickerCanvas;
}

function createOverlayCanvas() {
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'overlayCanvas';
    overlayCanvas.width = 640 * 2 + 5;
    overlayCanvas.height = 480;
    overlayCanvas.style.pointerEvents = 'none';
    // overlayCanvas.style.display = 'none';
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0px';

    return overlayCanvas;
}

function showPickerCanvas(e, pickerCanvas) {
    pickerCanvas.style.display = 'block';
    pickerCanvas.style.top = `${e.clientY - Math.floor((SIZE * SCALE) / 2)}px`;
    pickerCanvas.style.left = `${e.clientX - Math.floor((SIZE * SCALE) / 2)}px`;
}

/**
 * CV operations
 */

function _getGrayscale(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function _rotateArray(arr, angle) {
    angle = -angle;
    console.log(angle);
    const R = [Math.sin(angle), Math.cos(angle)];
    const halfPatch = Math.floor(SIZE / 2);

    let rotatedArray = new Array(arr.length);
    //48*48
    //-23, 24
    for (let i = 0; i < arr.length; i++) {
        //Pivot in center
        let col = Math.floor(i % SIZE) - halfPatch + 1;
        let row = Math.floor(i / SIZE) - halfPatch + 1;

        let rCol = Math.floor(col * R[1] - row * R[0]);
        let rRow = Math.floor(col * R[0] + row * R[1]);
        rCol = Math.min(Math.max(-halfPatch + 1, rCol), halfPatch);
        rRow = Math.min(Math.max(-halfPatch + 1, rRow), halfPatch);

        rotatedArray[i] = arr[(rRow + halfPatch - 1) * SIZE + (rCol + halfPatch - 1)];
    }

    return rotatedArray;
}

function calculateDescriptorDistance(e) {
    console.log(leftDesc);
    console.log(rightDesc);
    if (leftDesc === undefined || rightDesc === undefined) {
        document.getElementById('distance').innerHTML = 'Please select 2 feature points!';
    }

    let distance = BRIEF.descDistance(leftDesc, rightDesc);

    document.getElementById('distance').innerHTML = distance;
}

/**
 * Debugging
 */

function _drawAngle(canvas, x, y, r, theta) {
    console.log(theta + '--' + originalAngle);
    let ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = '#00FF00';
    ctx.moveTo(x, y);
    ctx.lineTo(x + r * Math.cos(theta), y + r * Math.sin(theta));
    ctx.stroke();

    // theta += theta;
    // ctx.beginPath();
    // ctx.strokeStyle = '#FF0000';
    // ctx.moveTo(x, y);
    // ctx.lineTo(x + r * Math.cos(theta), y + r * Math.sin(theta));
    // ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#0000FF';
    ctx.moveTo(x, y);
    ctx.lineTo(x + r * Math.cos(originalAngle), y + r * Math.sin(originalAngle));
    ctx.stroke();
}
