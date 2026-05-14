import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 800, H = 460;
const GROUND_Y = H - 58;
const CEIL_Y = 52;
const PX = 115;                 // plane fixed X
const GRAVITY = 0.28;
const THRUST = 0.52;
const MAX_VY = 8;
const PLANE_W = 80, PLANE_H = 26;

// ─── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: "himalaya", name: "Himalayas", flag: "🏔️",
    tagline: "Soar over the Roof of the World",
    obsColor: "#8090a0", obsSnow: "#eef8ff",
    cloudColor: "rgba(210,228,245,0.88)",
    itemColor: "#ffdd33", birdColor: "#3a2818",
  },
  {
    id: "rajasthan", name: "Rajasthan", flag: "🏜️",
    tagline: "Cross the Golden Desert Kingdom",
    obsColor: "#a86020", obsSnow: "#f0c060",
    cloudColor: "rgba(200,160,80,0.75)",
    itemColor: "#44ffaa", birdColor: "#2a1808",
  },
  {
    id: "mumbai", name: "Mumbai Night", flag: "🌆",
    tagline: "Fly through the City of Dreams",
    obsColor: "#1a2840", obsSnow: "#ffcc33",
    cloudColor: "rgba(50,70,120,0.85)",
    itemColor: "#00ffcc", birdColor: "#88aaff",
  },
];

// ─── Background Drawings ───────────────────────────────────────────────────────
function drawSkyGradient(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function mountainLayer(ctx, scrollX, speed, heights, w, color, snowColor, snowFactor) {
  ctx.fillStyle = color;
  const off = (scrollX * speed) % w;
  for (let rep = -1; rep <= 1; rep++) {
    const ox = rep * w - off;
    ctx.beginPath(); ctx.moveTo(ox, H);
    heights.forEach((h, i) => ctx.lineTo(ox + (i / (heights.length - 1)) * w, GROUND_Y - h));
    ctx.lineTo(ox + w, H); ctx.closePath(); ctx.fill();
    if (snowFactor > 0) {
      ctx.fillStyle = snowColor;
      heights.forEach((mh, i) => {
        if (mh > 70) {
          const mx = ox + (i / (heights.length - 1)) * w;
          const sw = snowFactor * 18;
          ctx.beginPath();
          ctx.moveTo(mx, GROUND_Y - mh);
          ctx.lineTo(mx - sw, GROUND_Y - mh + mh * 0.22);
          ctx.lineTo(mx + sw, GROUND_Y - mh + mh * 0.22);
          ctx.closePath(); ctx.fill();
        }
      });
      ctx.fillStyle = color;
    }
  }
}

function drawPineTree(ctx, x, y) {
  ctx.fillStyle = "#2a5822";
  [[0, -32, 11, -12], [0, -22, 14, 0]].forEach(([cx, cy, r, by]) => {
    ctx.beginPath(); ctx.moveTo(x + cx, y + cy);
    ctx.lineTo(x - r, y + by); ctx.lineTo(x + r, y + by); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = "#6b3a10"; ctx.fillRect(x - 3, y, 6, 8);
}

function drawMonastery(ctx, x, y) {
  ctx.fillStyle = "rgba(190,178,158,0.65)";
  ctx.fillRect(x - 22, y - 32, 44, 32);
  ctx.beginPath(); ctx.moveTo(x - 27, y - 32); ctx.lineTo(x, y - 54); ctx.lineTo(x + 27, y - 32); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - 3, y - 72, 6, 19);
  ctx.fillStyle = "rgba(80,60,40,0.65)"; ctx.fillRect(x - 6, y - 12, 12, 12);
}

function drawCamel(ctx, x, y) {
  ctx.fillStyle = "rgba(175,115,55,0.55)";
  ctx.beginPath(); ctx.ellipse(x, y - 16, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 24, 7, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 20, y - 23, 6, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  [-13, -4, 4, 13].forEach(dx => ctx.fillRect(x + dx, y - 7, 4, 11));
}

function drawPalace(ctx, x, y) {
  ctx.fillStyle = "rgba(110,55,18,0.6)";
  ctx.fillRect(x - 52, y - 42, 104, 42);
  [-42, 0, 42].forEach(tx => {
    ctx.fillRect(x + tx - 9, y - 68, 18, 36);
    ctx.beginPath(); ctx.arc(x + tx, y - 68, 10, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + tx, y - 85); ctx.lineTo(x + tx - 4, y - 68); ctx.lineTo(x + tx + 4, y - 68); ctx.closePath(); ctx.fill();
  });
}

function drawGateway(ctx, x, y) {
  ctx.fillStyle = "rgba(35,25,15,0.9)";
  ctx.fillRect(x - 32, y - 62, 64, 62);
  ctx.fillStyle = "#020812";
  ctx.beginPath(); ctx.arc(x, y - 42, 18, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - 18, y - 42, 36, 42);
  ctx.fillStyle = "rgba(35,25,15,0.9)";
  [[-48, -82], [30, -82]].forEach(([bx, top]) => {
    ctx.fillRect(x + bx, y + top, 19, -top);
    ctx.beginPath(); ctx.arc(x + bx + 9, y + top, 10, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + bx + 9, y + top - 17);
    ctx.lineTo(x + bx + 5, y + top); ctx.lineTo(x + bx + 13, y + top); ctx.closePath(); ctx.fill();
  });
  ctx.beginPath(); ctx.arc(x, y - 72, 16, Math.PI, 0); ctx.fill();
}

function drawCityscape(ctx, scrollX, speed, baseY, maxH, color) {
  const w = 1000, off = (scrollX * speed) % w;
  ctx.fillStyle = color;
  for (let rep = -1; rep <= 1; rep++) {
    for (let i = 0; i < 22; i++) {
      const bx = rep * w - off + i * 46;
      const bh = 25 + ((Math.sin(i * 2.7 + speed * 100) * 0.5 + 0.5) * maxH);
      const bw = 28 + (i % 4) * 8;
      ctx.fillRect(bx, baseY - bh, bw, bh);
      // Deterministic windows
      ctx.fillStyle = `rgba(255,200,60,${0.35 + (i % 3) * 0.12})`;
      const cols = Math.floor(bw / 8), rows = Math.floor(bh / 11);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((bx + r * 7 + c * 13) % 5 !== 0)
            ctx.fillRect(bx + c * 8 + 2, baseY - bh + r * 11 + 3, 4, 6);
        }
      }
      ctx.fillStyle = color;
    }
  }
}

function drawHimalayaBg(ctx, sx) {
  drawSkyGradient(ctx, [[0, "#0c1c44"], [0.3, "#1b4a8a"], [0.65, "#3c84ba"], [0.88, "#7ec2d8"], [1, "#acdaea"]]);
  const sunX = ((sx * 0.025) % (W + 200) + W + 200) % (W + 200) - 100;
  const sg = ctx.createRadialGradient(sunX, 85, 0, sunX, 85, 55);
  sg.addColorStop(0, "rgba(255,240,195,1)"); sg.addColorStop(0.4, "rgba(255,215,140,0.55)"); sg.addColorStop(1, "transparent");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, 85, 55, 0, Math.PI * 2); ctx.fill();
  mountainLayer(ctx, sx, 0.12, [95, 155, 210, 145, 185, 225, 165, 125, 175, 215, 155], 820, "#c2d2e2", "#f0f8ff", 1.1);
  mountainLayer(ctx, sx, 0.32, [55, 88, 135, 98, 138, 78, 118, 108, 88, 128, 68], 700, "#7e8e9e", "#ddeeff", 0.55);
  mountainLayer(ctx, sx, 0.58, [28, 48, 38, 58, 32, 52, 44, 28, 48, 38, 58], 600, "#4a6a3a", "#6a8a5a", 0);
  const mox = ((600 - sx * 0.28) % 1400 + 1400) % 1400 - 100;
  if (mox < W + 80) drawMonastery(ctx, mox, GROUND_Y - 38);
  const gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  gg.addColorStop(0, "#7cba4c"); gg.addColorStop(0.4, "#5a7a3c"); gg.addColorStop(1, "#3a5a2c");
  ctx.fillStyle = gg; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  const ts = 58, tn = Math.ceil(W / ts) + 2, to = (sx * 0.82) % ts;
  for (let i = 0; i < tn; i++) { const tx = i * ts - to; if (tx > -35 && tx < W + 35) drawPineTree(ctx, tx, GROUND_Y); }
}

function drawRajasthanBg(ctx, sx) {
  drawSkyGradient(ctx, [[0, "#4a1008"], [0.22, "#8c2800"], [0.42, "#cc4800"], [0.62, "#ea7020"], [0.82, "#f5a030"], [1, "#ffd060"]]);
  const sg = ctx.createRadialGradient(W * 0.72, H * 0.48, 0, W * 0.72, H * 0.48, 72);
  sg.addColorStop(0, "rgba(255,225,105,0.9)"); sg.addColorStop(0.5, "rgba(255,155,45,0.38)"); sg.addColorStop(1, "transparent");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.48, 72, 0, Math.PI * 2); ctx.fill();
  mountainLayer(ctx, sx, 0.1, [38, 68, 52, 78, 58, 88, 48, 72, 62, 82, 43], 820, "#ca7222", "#f0c062", 0);
  const pox = ((W * 0.5 - sx * 0.14) % 1400 + 1400) % 1400 - 80;
  if (pox < W + 100) drawPalace(ctx, pox, GROUND_Y - 48);
  mountainLayer(ctx, sx, 0.38, [18, 38, 28, 53, 33, 43, 23, 48, 36, 40, 26], 700, "#a85c12", "#d89242", 0);
  const rg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  rg.addColorStop(0, "#da9242"); rg.addColorStop(0.5, "#ba7222"); rg.addColorStop(1, "#8a5012");
  ctx.fillStyle = rg; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.strokeStyle = "rgba(178,128,58,0.28)"; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ry = GROUND_Y + 9 + i * 8, rx = (sx * 0.78) % 82;
    for (let j = -1; j < Math.ceil(W / 82) + 1; j++) {
      ctx.beginPath(); ctx.arc(j * 82 - rx + 41, ry, 36, Math.PI, 0); ctx.stroke();
    }
  }
  const cs = 420, co = (sx * 0.72) % cs;
  for (let i = 0; i < 3; i++) { const cx = i * cs - co + 90; if (cx > -55 && cx < W + 55) drawCamel(ctx, cx, GROUND_Y); }
}

function drawMumbaiBg(ctx, sx, frame) {
  drawSkyGradient(ctx, [[0, "#010408"], [0.4, "#040c1c"], [0.75, "#081528"], [1, "#102030"]]);
  for (let i = 0; i < 80; i++) {
    const stx = ((i * 137.5 + sx * 0.04) % W + W) % W;
    const sty = (i * 73.3) % (H * 0.58);
    const bri = 0.35 + (i % 5) * 0.1;
    const twk = 0.7 + Math.sin(frame * 0.02 + i * 1.3) * 0.3;
    ctx.fillStyle = `rgba(218,228,255,${bri * twk})`;
    ctx.beginPath(); ctx.arc(stx, sty, i % 4 === 0 ? 1.4 : 0.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,245,198,0.9)";
  ctx.beginPath(); ctx.arc(W * 0.82, 65, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#010408";
  ctx.beginPath(); ctx.arc(W * 0.82 + 11, 60, 24, 0, Math.PI * 2); ctx.fill();
  drawCityscape(ctx, sx, 0.08, GROUND_Y, H * 0.14, "#08101e");
  drawCityscape(ctx, sx, 0.28, GROUND_Y, H * 0.23, "#0e1828");
  drawCityscape(ctx, sx, 0.55, GROUND_Y, H * 0.32, "#182535");
  const ng = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  ng.addColorStop(0, "#081522"); ng.addColorStop(1, "#030810");
  ctx.fillStyle = ng; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "rgba(255,195,48,0.07)";
  for (let i = 0; i < 9; i++) {
    const rx = ((i * 88 - sx * 0.8) % W + W) % W;
    ctx.beginPath(); ctx.ellipse(rx, GROUND_Y + 12 + i * 3, 2.5, 10 + i * 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  const gox = ((W / 2 - sx * 0.24) % 1400 + 1400) % 1400 - 90;
  if (gox < W + 90) drawGateway(ctx, gox, GROUND_Y);
}

// ─── Game Entity Drawings ──────────────────────────────────────────────────────
function drawPlane(ctx, x, y, angle, inv) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (inv && Math.floor(Date.now() / 90) % 2 === 0) ctx.globalAlpha = 0.38;
  ctx.save(); ctx.translate(6, 9); ctx.globalAlpha *= 0.18;
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(0, 0, 42, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // Body
  const bg = ctx.createLinearGradient(-40, -12, -40, 12);
  bg.addColorStop(0, "#f2f2f2"); bg.addColorStop(0.5, "#e0e0e0"); bg.addColorStop(1, "#bdbdbd");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-40, -4); ctx.bezierCurveTo(-42, -11, -28, -13, -8, -12);
  ctx.bezierCurveTo(12, -12, 36, -10, 48, -3); ctx.bezierCurveTo(53, 0, 48, 6, 44, 6);
  ctx.bezierCurveTo(18, 8, -10, 8, -40, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#aaa"; ctx.lineWidth = 0.5; ctx.stroke();
  // Nose
  ctx.fillStyle = "#d0d0e0";
  ctx.beginPath(); ctx.moveTo(44, 1); ctx.bezierCurveTo(52, -3, 57, 0, 53, 3); ctx.bezierCurveTo(50, 5, 45, 5, 44, 4); ctx.closePath(); ctx.fill();
  // Main wing
  const wg = ctx.createLinearGradient(0, 0, 0, 38);
  wg.addColorStop(0, "#d8d8d8"); wg.addColorStop(1, "#adadad");
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.moveTo(16, 5); ctx.lineTo(-9, 5); ctx.lineTo(-32, 40); ctx.lineTo(-10, 40); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#999"; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.fillStyle = "#ff4422";
  ctx.beginPath(); ctx.moveTo(-31, 40); ctx.lineTo(-35, 31); ctx.lineTo(-24, 40); ctx.closePath(); ctx.fill();
  // Tail fin
  ctx.fillStyle = "#cc1111";
  ctx.beginPath(); ctx.moveTo(-29, -4); ctx.lineTo(-22, -30); ctx.lineTo(-13, -4); ctx.closePath(); ctx.fill();
  // Horizontal stab
  ctx.fillStyle = "#c5c5c5";
  ctx.beginPath(); ctx.moveTo(-18, 1); ctx.lineTo(-32, 1); ctx.lineTo(-40, 17); ctx.lineTo(-27, 17); ctx.closePath(); ctx.fill();
  // Windows
  [32, 19, 6, -7, -20].forEach(wx => {
    ctx.fillStyle = "#8accff";
    ctx.beginPath(); ctx.ellipse(wx, -6, 3.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5aabdd"; ctx.lineWidth = 0.5; ctx.stroke();
  });
  // Cockpit
  ctx.fillStyle = "#b8deff";
  ctx.beginPath(); ctx.moveTo(44, -1); ctx.bezierCurveTo(48, -3, 53, -1, 50, 2); ctx.bezierCurveTo(48, 4, 44, 4, 44, 2); ctx.closePath(); ctx.fill();
  // Engine
  ctx.fillStyle = "#8a8a8a";
  ctx.beginPath(); ctx.ellipse(2, 21, 7.5, 4.5, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#666";
  ctx.beginPath(); ctx.ellipse(-4, 21, 4.5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(210,210,210,0.25)";
  ctx.beginPath(); ctx.ellipse(-10, 21, 5.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // India flag on tail
  [[0, "#ff9933"], [3, "#ffffff"], [6, "#138808"]].forEach(([dy, col]) => {
    ctx.fillStyle = col; ctx.fillRect(-34, -28 + dy, 12, 3);
  });
  ctx.restore();
}

function drawObstacle(ctx, obs, theme) {
  if (obs.type === "ground") {
    ctx.fillStyle = theme.obsColor;
    ctx.beginPath();
    ctx.moveTo(obs.x, GROUND_Y); ctx.lineTo(obs.x + obs.w / 2, GROUND_Y - obs.h); ctx.lineTo(obs.x + obs.w, GROUND_Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = theme.obsSnow;
    ctx.beginPath();
    ctx.moveTo(obs.x + obs.w / 2, GROUND_Y - obs.h);
    ctx.lineTo(obs.x + obs.w / 2 - 9, GROUND_Y - obs.h + 22);
    ctx.lineTo(obs.x + obs.w / 2 + 9, GROUND_Y - obs.h + 22); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = theme.cloudColor;
    const cx = obs.x + obs.w / 2, cy = CEIL_Y + obs.h / 2 + 8;
    [0, 0.22, -0.22, 0.38, -0.38].forEach((dx, i) => {
      ctx.beginPath(); ctx.arc(cx + dx * obs.w, cy - (i === 0 ? 0 : i < 3 ? obs.h * 0.14 : 0), obs.w * (i === 0 ? 0.3 : 0.2), 0, Math.PI * 2); ctx.fill();
    });
    if (theme.id === "mumbai") {
      [[-obs.w / 2, "#ff3333"], [obs.w / 2, "#3388ff"]].forEach(([dx, col]) => {
        ctx.fillStyle = `rgba(${col.slice(1).match(/../g).map(h => parseInt(h, 16)).join(",")},0.9)`;
        ctx.beginPath(); ctx.arc(cx + dx, cy, 4, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      ctx.strokeStyle = "rgba(255,235,50,0.85)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + 5, cy + 14); ctx.lineTo(cx, cy + 24); ctx.lineTo(cx + 8, cy + 24); ctx.lineTo(cx - 5, cy + 40); ctx.stroke();
    }
  }
}

function drawCollectible(ctx, item, theme, frame) {
  const pulse = 0.82 + Math.sin(frame * 0.12 + item.x * 0.05) * 0.18;
  ctx.save(); ctx.translate(item.x + 12, item.y + 12); ctx.rotate(frame * 0.04);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * pulse);
  glow.addColorStop(0, theme.itemColor + "66"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.font = item.type === "fuel" ? "22px sans-serif" : "20px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(item.type === "fuel" ? "⛽" : "⭐", 0, 0);
  ctx.restore();
}

function drawBird(ctx, bird, theme, frame) {
  ctx.save(); ctx.translate(bird.x, bird.y);
  const w = Math.sin(frame * 0.18) * 0.38;
  ctx.fillStyle = theme.birdColor;
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = theme.birdColor; ctx.lineWidth = 2;
  [[-1, 1], [1, -1]].forEach(([dir, wdir]) => {
    ctx.beginPath(); ctx.moveTo(dir * 2, -1);
    ctx.quadraticCurveTo(dir * 12, -12 + w * wdir * 20, dir * 20, -8 + w * wdir * 30); ctx.stroke();
  });
  ctx.restore();
}

function drawHUD(ctx, gs) {
  // Score box
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(10, 10, 165, 38, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 17px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(`✈ ${gs.score.toLocaleString()}`, 20, 29);
  // Lives
  ctx.textAlign = "right"; ctx.fillText("❤️".repeat(gs.lives), W - 14, 29);
  // Fuel bar
  const fw = 126, fx = W / 2 - fw / 2;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(fx - 4, 13, fw + 8, 22, 6); ctx.fill();
  const fuelW = (gs.fuel / 100) * fw;
  const fc = gs.fuel > 55 ? "#44ff88" : gs.fuel > 28 ? "#ffcc44" : "#ff4444";
  ctx.fillStyle = fc; ctx.beginPath(); ctx.roundRect(fx, 16, fuelW, 16, 4); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(fx, 16, fw, 16, 4); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("⛽ FUEL", W / 2, 24);
  // Altitude bar
  const ah = GROUND_Y - CEIL_Y - 10;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(W - 28, CEIL_Y + 5, 16, ah, 4); ctx.fill();
  const altP = 1 - (gs.planeY - CEIL_Y) / (GROUND_Y - CEIL_Y);
  ctx.fillStyle = "#44aaff"; ctx.beginPath(); ctx.roundRect(W - 28, GROUND_Y - 5 - ah * altP, 16, ah * altP, [0, 0, 4, 4]); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(W - 28, CEIL_Y + 5, 16, ah, 4); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "7px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("ALT", W - 20, CEIL_Y + 7);
  // Speed
  const sp = (2.5 + Math.min(gs.distance / 5000, 3.5)).toFixed(1);
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(10, 54, 115, 28, 6); ctx.fill();
  ctx.fillStyle = "#88ccff"; ctx.font = "12px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(`⚡ Speed: ${sp}x`, 18, 68);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AeroIndia() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const gsRef = useRef(null);
  const keysRef = useRef(new Set());
  const touchRef = useRef(false);
  const frameRef = useRef(0);
  const [screen, setScreen] = useState("start");
  const [bgIdx, setBgIdx] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const initGame = useCallback(() => {
    gsRef.current = {
      theme: THEMES[bgIdx],
      scrollX: 0, frame: 0,
      planeY: H / 2, planeVY: 0, planeAngle: 0,
      score: 0, fuel: 100, lives: 3, distance: 0,
      obstacles: [], collectibles: [], birds: [], particles: [],
      invincible: 0,
      timers: { obs: 0, item: 0, bird: 0 },
    };
  }, [bgIdx]);

  const addParticles = (gs, x, y, color) => {
    for (let i = 0; i < 10; i++) {
      gs.particles.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 1, color, size: 2 + Math.random() * 5 });
    }
  };

  const hit = useCallback((gs) => {
    gs.lives--;
    gs.invincible = 130;
    addParticles(gs, PX, gs.planeY, "#ff4433");
    if (gs.lives <= 0) {
      const final = gs.score;
      setDisplayScore(final);
      setHighScore(h => { setIsNewRecord(final > h); return Math.max(h, final); });
      setScreen("gameover");
      return true;
    }
    return false;
  }, []);

  const col = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  const isUp = () => keysRef.current.has(" ") || keysRef.current.has("ArrowUp") || keysRef.current.has("w") || touchRef.current;

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const gs = gsRef.current;
      if (!gs) return;
      const f = ++frameRef.current;
      gs.frame = f;

      // ── Physics ──
      if (isUp()) gs.planeVY -= THRUST;
      gs.planeVY += GRAVITY;
      gs.planeVY = Math.max(-MAX_VY, Math.min(MAX_VY, gs.planeVY));
      gs.planeY += gs.planeVY;
      gs.planeAngle = gs.planeVY * 0.068;

      // Scroll
      const speed = 2.5 + Math.min(gs.distance / 5200, 3.8);
      gs.scrollX += speed; gs.distance += speed;
      gs.score = Math.floor(gs.distance / 10);

      // Fuel drain
      gs.fuel = Math.max(0, gs.fuel - 0.022 - speed * 0.0025);
      if (gs.fuel <= 0) { gs.fuel = 50; if (hit(gs)) return; }
      if (gs.invincible > 0) gs.invincible--;

      // Boundary hits
      if (gs.planeY < CEIL_Y) { gs.planeY = CEIL_Y; gs.planeVY = 1; }
      if (gs.planeY > GROUND_Y - PLANE_H) {
        gs.planeY = GROUND_Y - PLANE_H; gs.planeVY = -2;
        if (gs.invincible <= 0) { if (hit(gs)) return; }
      }

      // Spawn
      const oInterval = Math.max(75, 160 - speed * 14);
      if (++gs.timers.obs > oInterval) {
        gs.timers.obs = 0;
        const isGnd = Math.random() > 0.42;
        gs.obstacles.push({ x: W + 20, w: isGnd ? 58 + Math.random() * 42 : 78 + Math.random() * 62, h: isGnd ? 55 + Math.random() * 105 : 48 + Math.random() * 80, type: isGnd ? "ground" : "sky" });
      }
      if (++gs.timers.item > 115) {
        gs.timers.item = 0;
        gs.collectibles.push({ x: W + 10, y: CEIL_Y + 28 + Math.random() * (GROUND_Y - CEIL_Y - 96), w: 24, h: 24, type: Math.random() > 0.42 ? "fuel" : "star" });
      }
      if (++gs.timers.bird > 88) {
        gs.timers.bird = 0;
        gs.birds.push({ x: W + 10, y: CEIL_Y + 38 + Math.random() * (GROUND_Y - CEIL_Y - 100), spd: 2.8 + Math.random() * 2.2, w: 40, h: 22 });
      }

      // Move entities
      gs.obstacles.forEach(o => o.x -= speed);
      gs.collectibles.forEach(c => { c.x -= speed; c.y += Math.sin(f * 0.055 + c.x * 0.012) * 0.45; });
      gs.birds.forEach(b => b.x -= b.spd);
      gs.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.042; });
      gs.obstacles = gs.obstacles.filter(o => o.x + o.w > -25);
      gs.collectibles = gs.collectibles.filter(c => c.x + c.w > -25);
      gs.birds = gs.birds.filter(b => b.x + b.w > -25);
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Plane hitbox
      const px = PX - 18, py = gs.planeY - 9, pw = 58, ph = 20;

      // Obstacle collisions
      if (gs.invincible <= 0) {
        for (const obs of gs.obstacles) {
          const hit2 = obs.type === "ground"
            ? col(px, py, pw, ph, obs.x, GROUND_Y - obs.h, obs.w, obs.h)
            : col(px, py, pw, ph, obs.x, CEIL_Y, obs.w, obs.h + 5);
          if (hit2) { if (hit(gs)) return; break; }
        }
      }

      // Bird collisions
      if (gs.invincible <= 0) {
        for (let i = gs.birds.length - 1; i >= 0; i--) {
          const b = gs.birds[i];
          if (col(px, py, pw, ph, b.x - 14, b.y - 10, 28, 20)) {
            gs.birds.splice(i, 1);
            addParticles(gs, b.x, b.y, "#aa5522");
            if (hit(gs)) return;
          }
        }
      }

      // Collect items
      for (let i = gs.collectibles.length - 1; i >= 0; i--) {
        const c = gs.collectibles[i];
        if (col(px, py, pw, ph, c.x, c.y, c.w, c.h)) {
          gs.collectibles.splice(i, 1);
          if (c.type === "fuel") {
            gs.fuel = Math.min(100, gs.fuel + 22);
            addParticles(gs, c.x + 12, c.y + 12, "#44ffaa");
          } else {
            gs.score += 50;
            addParticles(gs, c.x + 12, c.y + 12, "#ffdd44");
          }
        }
      }

      // ── Render ──
      if (gs.theme.id === "himalaya") drawHimalayaBg(ctx, gs.scrollX);
      else if (gs.theme.id === "rajasthan") drawRajasthanBg(ctx, gs.scrollX);
      else drawMumbaiBg(ctx, gs.scrollX, f);

      gs.obstacles.forEach(o => drawObstacle(ctx, o, gs.theme));
      gs.collectibles.forEach(c => drawCollectible(ctx, c, gs.theme, f));
      gs.birds.forEach(b => drawBird(ctx, b, gs.theme, f));
      drawPlane(ctx, PX, gs.planeY, gs.planeAngle, gs.invincible > 0);

      // Engine exhaust
      if (isUp()) {
        const eg = ctx.createRadialGradient(PX - 50, gs.planeY + 21, 0, PX - 50, gs.planeY + 21, 22);
        eg.addColorStop(0, "rgba(255,145,10,0.85)"); eg.addColorStop(0.5, "rgba(255,80,0,0.38)"); eg.addColorStop(1, "transparent");
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(PX - 50, gs.planeY + 21, 22, 0, Math.PI * 2); ctx.fill();
      }

      // Particles
      gs.particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Danger zones
      ctx.fillStyle = "rgba(255,40,40,0.12)";
      ctx.fillRect(0, 0, W, CEIL_Y);
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

      drawHUD(ctx, gs);
      setDisplayScore(gs.score);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen, hit]);

  // Keyboard controls
  useEffect(() => {
    const dn = (e) => { if ([" ", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault(); keysRef.current.add(e.key); };
    const up = (e) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // Touch controls on canvas
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ts = (e) => { e.preventDefault(); touchRef.current = true; };
    const te = () => { touchRef.current = false; };
    c.addEventListener("touchstart", ts, { passive: false }); c.addEventListener("touchend", te);
    c.addEventListener("mousedown", ts); c.addEventListener("mouseup", te);
    return () => { c.removeEventListener("touchstart", ts); c.removeEventListener("touchend", te); c.removeEventListener("mousedown", ts); c.removeEventListener("mouseup", te); };
  }, [screen]);

  const startGame = () => { initGame(); setScreen("playing"); };

  const scale = typeof window !== "undefined" ? Math.min(1, (window.innerWidth - 16) / W) : 1;

  return (
    <div style={{ background: "#04080f", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 0" }}>
      <style>{`
        * { box-sizing: border-box; }
        .glow-btn { transition: all 0.2s ease; }
        .glow-btn:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(220,80,0,0.55) !important; }
        .bg-btn { transition: all 0.18s ease; }
        .bg-btn:hover { transform: scale(1.05); }
        canvas { touch-action: none; user-select: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .fadein { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      <div style={{ position: "relative", width: W * scale, height: H * scale, borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 72px rgba(0,0,0,0.85)" }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ display: "block", transform: `scale(${scale})`, transformOrigin: "top left", cursor: screen === "playing" ? "crosshair" : "default" }} />

        {/* ── START ── */}
        {screen === "start" && (
          <div className="fadein" style={{ position: "absolute", inset: 0, background: "rgba(2,6,14,0.82)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#e8e8e8", padding: "28px 24px", maxWidth: 420, width: "100%" }}>
              <div style={{ fontSize: 52, marginBottom: 6 }}>✈️</div>
              <h1 style={{ margin: "0 0 2px", fontSize: "2.2rem", letterSpacing: "0.08em", background: "linear-gradient(135deg,#f5c060,#ff8822)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AERO INDIA</h1>
              <p style={{ margin: "0 0 22px", fontSize: "0.72rem", color: "#8a9aaa", letterSpacing: "0.2em", textTransform: "uppercase" }}>Flight Simulator</p>
              <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#aabbcc" }}>Select Your Route</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8, flexWrap: "wrap" }}>
                {THEMES.map((t, i) => (
                  <button key={i} className="bg-btn" onClick={() => setBgIdx(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 14px", borderRadius: 12, border: `2px solid ${bgIdx === i ? "#f5c060" : "rgba(255,255,255,0.12)"}`, background: bgIdx === i ? "rgba(245,192,96,0.14)" : "rgba(255,255,255,0.04)", color: bgIdx === i ? "#f5c060" : "#aaa", cursor: "pointer", fontFamily: "inherit", minWidth: 88, boxShadow: bgIdx === i ? "0 0 18px rgba(245,192,96,0.28)" : "none" }}>
                    <span style={{ fontSize: 26 }}>{t.flag}</span>
                    <span style={{ fontSize: "0.72rem", fontWeight: bgIdx === i ? 700 : 400 }}>{t.name}</span>
                  </button>
                ))}
              </div>
              <p style={{ margin: "0 0 20px", fontSize: "0.7rem", color: "#667788", fontStyle: "italic" }}>{THEMES[bgIdx].tagline}</p>
              <button className="glow-btn" onClick={startGame} style={{ padding: "13px 38px", background: "linear-gradient(135deg,#c83c00,#f07020)", border: "none", borderRadius: 12, color: "#fff", fontSize: "1.05rem", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 24px rgba(200,60,0,0.4)", letterSpacing: "0.05em" }}>
                🚀 Take Off
              </button>
              {highScore > 0 && <p style={{ margin: "14px 0 0", fontSize: "0.75rem", color: "#667788" }}>🏆 Best: {highScore.toLocaleString()}</p>}
              <div style={{ marginTop: 18, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", fontSize: "0.68rem", color: "#556677" }}>
                {["⌨ Space/↑ to climb", "📱 Tap canvas", "⛽ Collect fuel", "⭐ +50 pts", "❌ Avoid obstacles"].map(tip => (
                  <span key={tip}>{tip}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GAME OVER ── */}
        {screen === "gameover" && (
          <div className="fadein" style={{ position: "absolute", inset: 0, background: "rgba(2,4,10,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#e8e8e8", padding: "32px 28px", maxWidth: 380 }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>💥</div>
              <h2 style={{ margin: "0 0 4px", fontSize: "2rem", color: "#ff6644" }}>GAME OVER</h2>
              <p style={{ margin: "0 0 24px", fontSize: "0.78rem", color: "#778899", letterSpacing: "0.1em" }}>EMERGENCY LANDING</p>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px 28px", marginBottom: 22 }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f5c060", letterSpacing: "0.04em" }}>{displayScore.toLocaleString()}</div>
                <div style={{ fontSize: "0.72rem", color: "#667788", marginTop: 4 }}>Distance flown</div>
                <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#99aabb" }}>
                  🏆 Best: {highScore.toLocaleString()}
                  {isNewRecord && displayScore > 0 && <span style={{ color: "#f5c060", marginLeft: 8, fontWeight: 700 }}>★ New Record!</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button className="glow-btn" onClick={startGame} style={{ padding: "12px 26px", background: "linear-gradient(135deg,#c83c00,#f07020)", border: "none", borderRadius: 12, color: "#fff", fontSize: "0.95rem", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(200,60,0,0.4)" }}>
                  ✈️ Fly Again
                </button>
                <button className="glow-btn" onClick={() => setScreen("start")} style={{ padding: "12px 22px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12, color: "#ccc", fontSize: "0.95rem", fontFamily: "inherit", cursor: "pointer" }}>
                  🗺️ Change Route
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile thrust button */}
      {screen === "playing" && (
        <div style={{ marginTop: 14, display: "flex", gap: 16, alignItems: "center" }}>
          <button
            style={{ padding: "14px 40px", background: "linear-gradient(135deg,#1848a0,#2860c0)", border: "2px solid rgba(80,140,255,0.45)", borderRadius: 14, color: "#fff", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", touchAction: "none", letterSpacing: "0.05em", boxShadow: "0 6px 22px rgba(0,70,200,0.4)" }}
            onTouchStart={e => { e.preventDefault(); touchRef.current = true; }}
            onTouchEnd={() => touchRef.current = false}
            onMouseDown={() => touchRef.current = true}
            onMouseUp={() => touchRef.current = false}
            onMouseLeave={() => touchRef.current = false}
          >
            ▲ THRUST
          </button>
          <div style={{ color: "#445566", fontSize: "0.72rem", textAlign: "center" }}>
            <div style={{ color: "#7a9aaa", fontWeight: 700 }}>{displayScore.toLocaleString()}</div>
            <div>score</div>
          </div>
        </div>
      )}
    </div>
  );
}
