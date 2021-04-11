
import { isOver, toDate, line, circle, computeBounderies, toCoords, computeYratio, computeXratio } from './pure.js'
import { sliderChart } from './slider.js';
import { tooltip } from './tooltip.js';



let WIDTH = 600;
const HEIGHT = 200;
const PADDING = 40;
let DPI_WIDTH = 2 * WIDTH;
const DPI_HEIGHT = 2 * HEIGHT;
const VIEW_HEIGHT = DPI_HEIGHT - 2 * PADDING;
let VIEW_WIDTH = DPI_WIDTH;
const ROWS_COUNT = 5;
const CIRCLE_RADIUS = 8;

if (document.documentElement.clientWidth < 650) {
    WIDTH = document.documentElement.clientWidth - 40
    DPI_WIDTH = 2 * WIDTH;
    VIEW_WIDTH = DPI_WIDTH;
}


export function chart(root, data) {
    console.log(data);
    const canvas = root.querySelector('canvas')
    const mouse = {}
    const slider = sliderChart(root.querySelector('[data-el="slider"]'), data, DPI_WIDTH);
    const ctx = canvas.getContext('2d');
    let raf;
    const tip = tooltip(root.querySelector('[data-el="tooltip"]'));


    canvas.style.width = WIDTH + "px";
    canvas.style.height = HEIGHT + 'px';
    canvas.width = DPI_WIDTH;
    canvas.height = DPI_HEIGHT;




    const proxy = new Proxy(mouse,
        {
            set(...args) {
                const result = Reflect.set(...args);

                //trap
                raf = requestAnimationFrame(paint);
                return result;
            },
        }
    )

    slider.subscribe((pos) => {
        //console.log('Pos', pos)

        proxy.pos = pos;
    })


    window.addEventListener('resize', resize)
    function resize(e) {

        if (document.documentElement.clientWidth < 650) {
            canvas.style.width = document.documentElement.clientWidth - 40 + 'px';
            canvas.width = 2 * (document.documentElement.clientWidth - 40);
            paint(2 * (document.documentElement.clientWidth - 40));
        }
    }
    function mousemove({ clientX, clientY }) {
        const { left, top } = canvas.getBoundingClientRect();
        proxy.mouse = {
            x: 2 * (clientX - left),
            tooltip: {
                left: clientX - left,
                top: clientY - top,

            }
        }
    }
    function mouseleave() {
        proxy.mouse = null;
        tip.hide();
    }
    canvas.addEventListener('mousemove', mousemove)
    canvas.addEventListener('mouseleave', mouseleave)

    function clear() {
        ctx.clearRect(0, 0, DPI_WIDTH, DPI_HEIGHT)
    }
    function paint(w = VIEW_WIDTH) {
        clear();

        const length = data.columns[0].length
        const leftIndex = Math.round(length * proxy.pos[0] / 100);
        const rightIndex = Math.round(length * proxy.pos[1] / 100);

        const columns = data.columns.map(col => {
            const res = col.slice(leftIndex, rightIndex);
            if (typeof res[0] !== 'string') {
                res.unshift(col[0])
            }
            return res;
        })

        const [yMin, yMax] = computeBounderies({ columns, types: data.types });

        // const yRatio = VIEW_HEIGHT / (yMax - yMin);
        // const xRatio = VIEW_WIDTH / (columns[0].length - 2);
        const yRatio = computeYratio(VIEW_HEIGHT, yMax, yMin);
        const xRatio = computeXratio(VIEW_WIDTH, columns[0].length)
        const yData = columns.filter(col => {
            if (data.types[col[0]] === "line") {
                return data.types[col[0]]
            }
        }) //all values of lines 

        const xData = columns.filter(col => {
            if (data.types[col[0]] !== "line") {
                return data.types[col[0]]
            }
        })[0] //all labels in x 

        yAxis(yMin, yMax);
        xAxis(xData, xRatio, yData, canvas);

        yData.map(toCoords(xRatio, yRatio, DPI_HEIGHT, PADDING, yMin)).forEach((coords, idx) => {
            const color = data.colors[yData[idx][0]];
            line(ctx, coords, { color })
            for (const [x, y] of coords) {
                if (isOver(proxy.mouse, x, coords.length, DPI_WIDTH)) {
                    circle(ctx, [x, y], color, CIRCLE_RADIUS);
                    break;
                }
            }
        })
    }
    /**/
    function yAxis(yMin, yMax) {



        const textStep = (yMax - yMin) / ROWS_COUNT;
        const step = VIEW_HEIGHT / ROWS_COUNT;

        ctx.beginPath();
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        ctx.font = "normal 20px Helvetica, sans-serif"
        ctx.fillStyle = "#96a2aa"
        for (let i = 1; i <= ROWS_COUNT; i++) {
            const y = step * i;

            const text = Math.round(yMax - textStep * i);
            ctx.fillText(text.toString(), 5, y + PADDING - 10)
            ctx.moveTo(0, y + PADDING);
            ctx.lineTo(DPI_WIDTH, y + PADDING);
        }
        ctx.stroke();

        ctx.closePath();

    }
    function xAxis(xData, xRatio, yData, canvas) {
        const labelsCount = Math.round(parseInt(canvas.style.width) / 100);
        const step = Math.round(xData.length / labelsCount);

        ctx.beginPath()

        for (let i = 1; i < xData.length; i++) {
            const x = i * xRatio;
            if ((i - 1) % step === 0) {
                const text = toDate(xData[i]);
                ctx.fillText(text.toString(), x, DPI_HEIGHT - 10);
            }



            if (isOver(proxy.mouse, x, xData.length, DPI_WIDTH)) {
                ctx.save();
                ctx.moveTo(x, PADDING);
                ctx.lineTo(x, DPI_HEIGHT - PADDING)
                ctx.stroke();

                ctx.restore();
                tip.show(proxy.mouse.tooltip, {
                    title: toDate(xData[i]),
                    items: yData.map(col => {
                        return {
                            color: data.colors[col[0]],

                            name: data.names[col[0]],
                            value: col[i + 1]
                        }
                    }),
                })

            }
        }
        ctx.closePath();
    }



    return {
        init() {
            paint();
        },
        destroy() {
            cancelAnimationFrame(raf);
            canvas.removeEnentListener('mousemove', mousemove)
            canvas.removeEnentListener('mouseleave', mouseleave)
            window.removeEnentListener('resize', resize)
        }
    }
}










