const S_w = 360;
const S_h = 800;
const V_w = 1080;
const V_h = 1920;

const scale = Math.max(S_w / V_w, S_h / V_h);
const F_w = Math.min(S_w * 0.8, 320);
const F_h = F_w * 4 / 3;

const sourceWidth = F_w / scale;
const sourceHeight = F_h / scale;

console.log({ scale, F_w, F_h, sourceWidth, sourceHeight });
