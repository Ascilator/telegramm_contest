import { computeBounderies, computeXratio, computeYratio, css, line, toCoords } from "./pure.js";



function noop() { }


const HEIGHT = 40;
const DPI_HEIGHT = HEIGHT * 2
export function sliderChart(root, data, DPI_WIDTH) {
    let WIDTH = DPI_WIDTH / 2; // 1200 ------ 600
    let MIN_WIDTH = WIDTH * 0.05;
    if (document.documentElement.clientWidth < 650) {
        WIDTH = document.documentElement.clientWidth - 40
        MIN_WIDTH = WIDTH * 0.05;
    }
    const canvas = root.querySelector('canvas');

    const ctx = canvas.getContext('2d');
    let nextFn = noop;


    canvas.width = DPI_WIDTH;
    canvas.height = DPI_HEIGHT;
    canvas.style.width = WIDTH + "px";
    canvas.style.height = HEIGHT + 'px';

    const __left = root.querySelector('[data-el="left"]')
    const __right = root.querySelector('[data-el="right"]')
    const __zoom = root.querySelector('[data-el="window"]')


    // window.addEventListener('resize', resize)
    // function resize(e) {
    //     let ADAPTIVE_WIDTH = document.documentElement.clientWidth - 40;
    //     if (document.documentElement.clientWidth < 650) {
    //         canvas.style.width = ADAPTIVE_WIDTH + 'px';
    //         canvas.width = 2 * ADAPTIVE_WIDTH;
    //         paint(2 * ADAPTIVE_WIDTH);
    //         let width_small = ADAPTIVE_WIDTH;
    //         let deafultWidth = width_small * .3;
    //         setPosition(0, width_small - deafultWidth);
    //     }
    // }

    function next() {
        nextFn(getPosition())
    }

    function mousedown(event) {
        console.log(1234);
        const type = event.target.dataset.type;
        let ADAPTIVE_WIDTH = document.documentElement.clientWidth - 40;
        const dimensions = {
            left: parseInt(__zoom.style.left),
            right: parseInt(__zoom.style.right),
            width: parseInt(__zoom.style.width),
            canvasWidth: WIDTH,

        }
        if (document.documentElement.clientWidth < 650) {
            dimensions.canvasWidth = ADAPTIVE_WIDTH
        }
        //console.log(type);

        if (type === 'window') {
            const startX = event.pageX;
            document.onmousemove = e => {
                const delta = startX - e.pageX;
                if (delta === 0) {
                    return
                }
                const left = dimensions.left - delta;
                const right = dimensions.canvasWidth - left - dimensions.width;

                setPosition(left, right)
                next();
            }
        } else if (type === 'left' || type === 'right') {
            const startX = event.pageX;
            document.onmousemove = e => {
                const delta = startX - e.pageX;
                if (delta === 0) {
                    return
                }
                if (type === 'left') {
                    const left = dimensions.canvasWidth - dimensions.width - delta - dimensions.right;
                    const right = dimensions.canvasWidth - dimensions.width - delta - left;
                    setPosition(left, right)
                } else {
                    const right = dimensions.canvasWidth - dimensions.width + delta - dimensions.left;
                    setPosition(dimensions.left, right)
                }
                next();
            }
        }
    }

    function mouseup() {
        document.onmousemove = null;
    }

    root.addEventListener('mousedown', mousedown);
    document.addEventListener('mouseup', mouseup);



    const deafultWidth = WIDTH * .3;
    setPosition(0, WIDTH - deafultWidth);

    function setPosition(left, right, adapt_wid = WIDTH) {
        const w = adapt_wid - right - left;
        MIN_WIDTH = 0.05 * adapt_wid;
        if (w < MIN_WIDTH) {
            css(__zoom, { width: MIN_WIDTH + 'px' })
            return;
        }

        if (left < 0) {
            css(__zoom, { left: 0 + 'px' })
            css(__left, { width: 0 + 'px' })
            return;
        }
        if (right < 0) {
            css(__zoom, { right: 0 + 'px' })
            css(__right, { width: 0 + 'px' })
            return;
        }


        css(__zoom, {
            width: w + 'px',
            left: left + 'px',
            right: right + 'px',
        })
        css(__right, {
            width: right + 'px',
        })
        css(__left, {
            width: left + 'px',
        })
    }
    function getPosition() {
        const left = parseInt(__left.style.width)
        const right = WIDTH - parseInt(__right.style.width);

        return [
            (left * 100) / WIDTH,
            (right * 100) / WIDTH
        ]
    }

    function paint(w = DPI_WIDTH) {
        const [yMin, yMax] = computeBounderies(data);

        const yRatio = computeYratio(DPI_HEIGHT, yMax, yMin);
        const xRatio = computeXratio(w, data.columns[0].length)
        console.log(w);


        const yData = data.columns.filter(col => {
            if (data.types[col[0]] === "line") {
                return data.types[col[0]]
            }
        }) //all values of lines 

        yData.map(toCoords(xRatio, yRatio, DPI_HEIGHT, 0, yMin)).forEach((coords, idx) => {
            const color = data.colors[yData[idx][0]];
            line(ctx, coords, { color })

        })
    }
    paint();
    return {
        subscribe(fn) {
            nextFn = fn;
            fn(getPosition());
        }
    }
}