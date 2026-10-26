// SimuladorPlanta3D_Pro.jsx  —  con integración API Flask /simular
// Requiere: npm install three
// Uso: <SimuladorPlanta3D_Pro />

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ════════════════════════════════════════════════════════
// CONFIG  — cambia esta URL a la de tu servidor Flask
// ════════════════════════════════════════════════════════
const API_URL = "http://localhost:5000/simular";

// ════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════
const REGIONES = {
  sierra: { label:"🏔️ Sierra", baseTemp:13, tempAmp:6,  baseHum:60, precipBase:35, lightPeak:10, ph:6.2, sky:"#7aa8c8", skyNight:"#1a2a3a", fog:0.016, sun:0xfff0d8, altitud:2400, events:["lluvia_sierra","helada","viento_frio","granizo"] },
  costa:  { label:"🌊 Costa",  baseTemp:27, tempAmp:5,  baseHum:82, precipBase:10, lightPeak:13, ph:6.8, sky:"#e8d060", skyNight:"#1a1a2e", fog:0.004, sun:0xffd060, altitud:50,   events:["sequia_fuerte","viento_calido","lluvia_tropical","bruma"] },
  valles: { label:"🌿 Valles", baseTemp:20, tempAmp:8,  baseHum:65, precipBase:25, lightPeak:11, ph:6.5, sky:"#90c888", skyNight:"#0d1f0d", fog:0.007, sun:0xffffff, altitud:1000, events:["lluvia_moderada","brisa","nublado","tormenta"] },
  paramo: { label:"❄️ Páramo", baseTemp:6,  tempAmp:4,  baseHum:85, precipBase:50, lightPeak:8,  ph:5.8, sky:"#9ab0c0", skyNight:"#0a1520", fog:0.025, sun:0xffe8d0, altitud:3500, events:["helada","viento_frio","lluvia_sierra","niebla"] },
};

const CULTIVOS = {
  Lechuga:   { name:"🥬 Lechuga",   optT:[15,22], optH:[60,80], optPH:[6.0,7.0], optL:[8,12],  optP:[20,40], col:0x52b940, tipo:"roseta",  ciclo:45,  stages:["Semilla","Brote","Roseta","Madurez","Cosecha"] },
  Tomate:    { name:"🍅 Tomate",    optT:[18,27], optH:[60,75], optPH:[6.0,7.0], optL:[10,14], optP:[25,45], col:0x43a047, tipo:"arbusto", ciclo:90,  fcol:0xef5350, stages:["Semilla","Plántula","Floración","Fructif.","Cosecha"] },
  Espinaca:  { name:"🌿 Espinaca",  optT:[10,18], optH:[65,80], optPH:[6.0,7.5], optL:[8,12],  optP:[20,40], col:0x2e7d32, tipo:"roseta",  ciclo:40,  stages:["Semilla","Brote","Hoja","Madurez","Cosecha"] },
  Zanahoria: { name:"🥕 Zanahoria", optT:[13,21], optH:[55,75], optPH:[6.0,7.0], optL:[8,12],  optP:[20,35], col:0x66bb6a, tipo:"erguida", ciclo:70,  raiz:true, rcol:0xff7043, stages:["Semilla","Brote","Follaje","Raíz","Cosecha"] },
  Papa:      { name:"🥔 Papa",      optT:[12,26], optH:[55,85], optPH:[4.9,6.9], optL:[6,12],  optP:[36,90], col:0x8bc34a, tipo:"erguida", ciclo:80,  stages:["Semilla","Brote","Tallo","Tubérculo","Cosecha"] },
  Maiz:      { name:"🌽 Maíz",      optT:[15,40], optH:[43,83], optPH:[4.8,8.1], optL:[10,15], optP:[37,92], col:0x9ccc65, tipo:"arbusto", ciclo:100, stages:["Semilla","Brote","Tallo","Espiga","Cosecha"] },
  Frijol:    { name:"🫘 Frijol",    optT:[18,27], optH:[60,80], optPH:[6.0,7.0], optL:[8,13],  optP:[40,80], col:0x66bb6a, tipo:"arbusto", ciclo:75,  stages:["Semilla","Brote","Flor","Vaina","Cosecha"] },
  Cebolla:   { name:"🧅 Cebolla",   optT:[13,24], optH:[50,70], optPH:[6.0,7.0], optL:[10,16], optP:[28,80], col:0xa5d6a7, tipo:"erguida", ciclo:90,  stages:["Semilla","Brote","Bulbo","Engrose","Cosecha"] },
  Remolacha: { name:"🫀 Remolacha", optT:[15,25], optH:[60,80], optPH:[6.0,7.5], optL:[12,17], optP:[29,89], col:0x81c784, tipo:"roseta",  ciclo:60,  stages:["Semilla","Brote","Hoja","Raíz","Cosecha"] },
  Trigo:     { name:"🌾 Trigo",     optT:[12,25], optH:[45,76], optPH:[5.7,7.9], optL:[11,17], optP:[27,84], col:0xdce775, tipo:"erguida", ciclo:120, stages:["Semilla","Brote","Tallo","Espiga","Cosecha"] },
};

const SUELOS   = ["Arcilloso","Arenoso","Mixto"];
const IRRIGACIONES = ["Goteo","Gravedad","Aspersion"];
const FERTILIZANTES = ["Organicos","Quimicos"];
const STAGE_COLORS = ["#9e9e9e","#8bc34a","#4caf50","#2e7d32","#ff8f00"];

function score(v,[lo,hi]){ if(v>=lo&&v<=hi)return 1; const d=v<lo?lo-v:v-hi,r=hi-lo; return Math.max(0,1-d/(r*1.2)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function hexToRGB(hex){ const h=hex.replace("#",""); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ════════════════════════════════════════════════════════
// GEOMETRÍA 3D
// ════════════════════════════════════════════════════════
function mkLeaf(rx,ry,rz,sx,sy,color,droop,dx,dy,dz,windPhase=0){
  const g=new THREE.SphereGeometry(1,7,5); g.scale(sx,sy*0.18,sy);
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
  m.rotation.set(rx-droop*0.5,ry,rz); m.position.set(dx,dy,dz);
  m.castShadow=true; m.userData.windPhase=windPhase; m.userData.isLeaf=true;
  return m;
}
function clearGroup(g){ while(g.children.length) g.remove(g.children[0]); }
function buildSeed(group){ const m=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),new THREE.MeshLambertMaterial({color:0xc8a96e})); m.position.y=0.02; group.add(m); }
function buildSprout(group,lc){ const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.04,0.25,6),new THREE.MeshLambertMaterial({color:0x8bc34a})); stem.position.y=0.12; group.add(stem); [-1,1].forEach((s,i)=>{ const l=mkLeaf(-Math.PI/3,s*Math.PI/3,0,0.15,0.2,lc,0,s*0.1,0.22,0,i*1.5); group.add(l); }); }
function buildRoseta(group,hs,droop,lc,isp,plantAge){ const n=Math.max(3,Math.round(4+isp*6+plantAge*5)); for(let i=0;i<n;i++){ const a=(i/n)*Math.PI*2,sz=hs*(0.65+Math.random()*0.35); group.add(mkLeaf(-Math.PI/2.8+droop,a,0,sz*0.55,sz*0.8,lc,droop,Math.cos(a)*0.3*sz,0.1+sz*0.2,Math.sin(a)*0.3*sz,i*0.7)); } }
function buildErguida(group,hs,droop,lc,isp,plantAge,cd){ const stemH=hs*0.65; const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.06*hs,0.1*hs,stemH,7),new THREE.MeshLambertMaterial({color:isp<0.4?0x9e8040:0x3b7d3a})); stem.position.y=stemH*0.5; stem.rotation.z=droop*0.4; stem.castShadow=true; group.add(stem); const pairs=Math.max(1,Math.round(1+isp*2+plantAge*2)); for(let i=0;i<pairs;i++){ const yp=0.1+(i+0.5)*(stemH/(pairs+1)); [-1,1].forEach((s,j)=>{ const a=s*Math.PI/2+i*0.4; group.add(mkLeaf(-Math.PI/2.5+droop*0.7,a,0,hs*0.45,hs*0.6,lc,droop*0.5,Math.cos(a)*0.25*hs,yp,Math.sin(a)*0.25*hs,i*0.8+j*1.2)); }); } if(cd.raiz&&plantAge>0.3){ const rh=0.08+plantAge*0.38; const raiz=new THREE.Mesh(new THREE.CylinderGeometry(0.08+plantAge*0.14,0.05,rh,7),new THREE.MeshLambertMaterial({color:cd.rcol||0xe53935})); raiz.position.y=-rh*0.5; group.add(raiz); } }
function buildArbusto(group,hs,droop,lc,isp,plantAge,cd){ const mh=hs*0.95; const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.08*hs,0.13*hs,mh,7),new THREE.MeshLambertMaterial({color:isp<0.4?0x9e8040:0x4a7c3a})); stem.position.y=mh*0.5; group.add(stem); const br=Math.max(2,Math.round(2+isp*3+plantAge*3)); for(let i=0;i<br;i++){ const a=(i/br)*Math.PI*2,bh=0.2+Math.random()*0.35*hs; const brm=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.07,bh,5),new THREE.MeshLambertMaterial({color:isp<0.4?0x9e8040:0x4a7c3a})); brm.position.set(Math.cos(a)*0.22*hs,mh*0.5+bh*0.3,Math.sin(a)*0.22*hs); brm.rotation.z=(Math.PI/5)*Math.cos(a)+droop*0.3; brm.rotation.x=(Math.PI/5)*Math.sin(a)+droop*0.3; group.add(brm); group.add(mkLeaf(0,a,0,hs*0.4,hs*0.55,lc,droop*0.6,Math.cos(a)*0.5*hs,mh*0.65+bh*0.35,Math.sin(a)*0.5*hs,i*0.9)); if(cd.fcol&&isp>0.5&&plantAge>0.6&&Math.random()>0.35){ const frut=new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.07,8,6),new THREE.MeshLambertMaterial({color:cd.fcol})); frut.position.set(Math.cos(a)*0.6*hs,mh*0.5+bh*0.1,Math.sin(a)*0.6*hs); group.add(frut); } } }
function addDeadLeaves(group){ for(let i=0;i<5;i++){ const m=new THREE.Mesh(new THREE.PlaneGeometry(0.05,0.07),new THREE.MeshBasicMaterial({color:0xb8860b,side:THREE.DoubleSide,transparent:true,opacity:0.7})); m.position.set((Math.random()-.5)*0.9,0.3+Math.random()*0.7,(Math.random()-.5)*0.9); m.rotation.z=Math.random()*Math.PI; group.add(m); } }
function createRainSystem(scene,maxDrops=300){ const geo=new THREE.BufferGeometry(); const positions=new Float32Array(maxDrops*3); for(let i=0;i<maxDrops;i++){ positions[i*3]=(Math.random()-.5)*6; positions[i*3+1]=Math.random()*8; positions[i*3+2]=(Math.random()-.5)*6; } geo.setAttribute("position",new THREE.BufferAttribute(positions,3)); const mat=new THREE.PointsMaterial({color:0x88ccff,size:0.04,transparent:true,opacity:0.6}); const rain=new THREE.Points(geo,mat); rain.visible=false; scene.add(rain); return rain; }
function updateRain(rain,intensity,windX,dt){ if(!rain.visible)return; const pos=rain.geometry.attributes.position.array; const speed=0.015*intensity; for(let i=0;i<pos.length/3;i++){ pos[i*3]+=windX*0.008*dt*0.06; pos[i*3+1]-=speed*dt*0.06; if(pos[i*3+1]<-0.5){ pos[i*3+1]=8; pos[i*3]=(Math.random()-.5)*6; pos[i*3+2]=(Math.random()-.5)*6; } } rain.geometry.attributes.position.needsUpdate=true; }

// ════════════════════════════════════════════════════════
// ESTADO INICIAL
// ════════════════════════════════════════════════════════
const INITIAL_STATE = (regionKey, cultivoKey, offset) => ({
  region: regionKey, cultivo: cultivoKey, playing: false, vel: 3,
  simDay: 0, simHour: 6, plantAge: 0, isp: 0.5,
  ispHistory: [], eventLog: [], mods: { agua:0, fertil:0, plaga:0, sequia:0 },
  env: { temp:15, hum:65, luz:8, ph:6.2, precip:25 },
  buildTimer: 0, eventTimer: 8000, rotY: offset,
  wind: 0, windTarget: 0, windTimer: 5000,
  rainIntensity: 0, rainTarget: 0, soilMoisture: 0.5, stage: 0,
  // Campos extra de configuración
  tipoSuelo: "Mixto", tipoIrrig: "Goteo", fertilizante: "Organicos", plagas: "No", maceta: "jardin",
  // Resultados de la API
  apiResult: null, apiLoading: false, apiError: null, lastApiCall: 0,
});

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function SimuladorPlanta3D_Pro() {
  const canvas1Ref = useRef(null); const canvas2Ref = useRef(null);
  const chart1Ref  = useRef(null); const chart2Ref  = useRef(null);
  const three1 = useRef({}); const three2 = useRef({});
  const state1 = useRef(INITIAL_STATE("sierra","Lechuga",0));
  const state2 = useRef(INITIAL_STATE("costa","Tomate",1));
  const animRef = useRef(null);

  const [playing,  setPlaying]  = useState(false);
  const [vel,      setVelState] = useState(3);
  const [ui1,      setUi1]      = useState({ dia:1, hora:"06:00", ispPct:50, estado:"Aceptable ⚠️", colISP:"#a8e063", stage:0, stageName:"Semilla", region:"sierra", cultivo:"Lechuga" });
  const [ui2,      setUi2]      = useState({ dia:1, hora:"06:00", ispPct:50, estado:"Aceptable ⚠️", colISP:"#a8e063", stage:0, stageName:"Semilla", region:"costa",  cultivo:"Tomate"  });
  const [lv1,      setLv1]      = useState([]);
  const [lv2,      setLv2]      = useState([]);
  const [alert1,   setAlert1]   = useState(null);
  const [alert2,   setAlert2]   = useState(null);
  const [log1,     setLog1]     = useState([]);
  const [log2,     setLog2]     = useState([]);
  const [api1,     setApi1]     = useState(null);
  const [api2,     setApi2]     = useState(null);
  const [apiLoad1, setApiLoad1] = useState(false);
  const [apiLoad2, setApiLoad2] = useState(false);
  const [apiErr1,  setApiErr1]  = useState(null);
  const [apiErr2,  setApiErr2]  = useState(null);
  const [tab1,     setTab1]     = useState("live"); // live | api | log
  const [tab2,     setTab2]     = useState("live");

  // ── Inicializar Three.js ──────────────────────────────
  function initScene(canvasEl, threeRef) {
    const renderer=new THREE.WebGLRenderer({canvas:canvasEl,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setSize(canvasEl.clientWidth,canvasEl.clientHeight,false);
    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x8ab0cc,0.014);
    const camera=new THREE.PerspectiveCamera(44,canvasEl.clientWidth/canvasEl.clientHeight,0.1,100);
    camera.position.set(0,2.2,5.2); camera.lookAt(0,0.8,0);
    const ambLight=new THREE.AmbientLight(0xffffff,0.6);
    const dirLight=new THREE.DirectionalLight(0xffffff,1.2);
    dirLight.position.set(4,8,3); dirLight.castShadow=true;
    dirLight.shadow.mapSize.set(512,512);
    Object.assign(dirLight.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:0.5,far:30});
    scene.add(ambLight,dirLight);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshLambertMaterial({color:0x8b6914}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-0.02; ground.receiveShadow=true; scene.add(ground);
    const maceta=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.5,0.65,10),new THREE.MeshLambertMaterial({color:0xc25e1a}));
    maceta.position.y=-0.02; maceta.castShadow=maceta.receiveShadow=true; scene.add(maceta);
    const tierraMat=new THREE.MeshLambertMaterial({color:0x5a3e1b});
    const tierra=new THREE.Mesh(new THREE.CylinderGeometry(0.68,0.68,0.08,10),tierraMat);
    tierra.position.y=0.28; scene.add(tierra);
    const skyMat=new THREE.MeshBasicMaterial({color:0x7aa8c8,side:THREE.BackSide});
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(40,16,8),skyMat));
    const solMat=new THREE.MeshBasicMaterial({color:0xffd060});
    const sol=new THREE.Mesh(new THREE.SphereGeometry(0.55,12,8),solMat); scene.add(sol);
    const plantGroup=new THREE.Group(); plantGroup.position.set(0,0.35,0); scene.add(plantGroup);
    const rain=createRainSystem(scene,250);
    threeRef.current={ renderer,scene,camera,ambLight,dirLight,plantGroup,skyMat,solMat,sol,ground,tierra,tierraMat,rain };
  }

  useEffect(()=>{
    if(canvas1Ref.current) initScene(canvas1Ref.current,three1);
    if(canvas2Ref.current) initScene(canvas2Ref.current,three2);
    rebuildPlant(state1.current,three1.current);
    rebuildPlant(state2.current,three2.current);
    const onResize=()=>{ [{c:canvas1Ref,t:three1},{c:canvas2Ref,t:three2}].forEach(({c,t})=>{ if(!c.current||!t.current.renderer)return; const w=c.current.clientWidth,h=c.current.clientHeight; t.current.renderer.setSize(w,h,false); t.current.camera.aspect=w/h; t.current.camera.updateProjectionMatrix(); }); };
    window.addEventListener("resize",onResize);
    return ()=>{ window.removeEventListener("resize",onResize); cancelAnimationFrame(animRef.current); };
  },[]);

  function rebuildPlant(s,t){
    if(!t.plantGroup)return;
    clearGroup(t.plantGroup);
    const ispEff=Math.max(0,s.isp-s.mods.plaga*0.3);
    const hs=0.3+s.plantAge*0.7, sc=0.4+ispEff*0.7+hs*0.3;
    const droop=ispEff<0.4?(0.4-ispEff)*1.4:0;
    const lc=ispEff<0.3?0xb8860b:ispEff<0.55?0x7cb868:(CULTIVOS[s.cultivo]?.col||0x52b940);
    const cd=CULTIVOS[s.cultivo]||CULTIVOS["Lechuga"];
    const st=s.stage;
    if(st===0){ buildSeed(t.plantGroup); return; }
    if(st===1){ buildSprout(t.plantGroup,lc); return; }
    if(cd.tipo==="roseta")  buildRoseta (t.plantGroup,sc,droop,lc,ispEff,s.plantAge);
    if(cd.tipo==="erguida") buildErguida(t.plantGroup,sc,droop,lc,ispEff,s.plantAge,cd);
    if(cd.tipo==="arbusto") buildArbusto(t.plantGroup,sc,droop,lc,ispEff,s.plantAge,cd);
    if(ispEff<0.28) addDeadLeaves(t.plantGroup);
  }

  function applyWind(plantGroup,wind,time){ if(!plantGroup)return; plantGroup.traverse(obj=>{ if(obj.userData&&obj.userData.isLeaf){ const phase=obj.userData.windPhase||0; obj.rotation.z=Math.sin(time*2+phase)*wind*0.12; obj.rotation.x+=Math.cos(time*1.3+phase)*wind*0.04; } }); }

  // ── Llamada a la API Flask ────────────────────────────
  async function callApi(s, setApiResult, setApiLoading, setApiError) {
    setApiLoading(true);
    setApiError(null);
    const r = REGIONES[s.region];
    const body = {
      Temperatura:   Math.round(s.env.temp * 10) / 10,
      Humedad:       Math.round(s.env.hum),
      pH_Suelo:      parseFloat(s.env.ph.toFixed(2)),
      Luz_Solar:     parseFloat(s.env.luz.toFixed(1)),
      Precipitacion: Math.round(s.env.precip),
      Altitud:       r.altitud,
      Tipo_Suelo:    s.tipoSuelo,
      Tipo_Irrigacion: s.tipoIrrig,
      Uso_Fertilizantes: s.fertilizante,
      Presencia_Plagas_Enfermedades: s.mods.plaga > 0.3 ? "Si" : s.plagas,
      Tipo_Producto: s.cultivo,
      tamano_maceta: s.maceta,
    };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t}`); }
      const data = await res.json();
      setApiResult(data);
      // Sincronizar ISP del modelo con la sim
      if (data.isp_final !== undefined) s.isp = clamp(data.isp_final, 0, 1);
    } catch(e) {
      setApiError(e.message);
    } finally {
      setApiLoading(false);
    }
  }

  // ── Paso de simulación ────────────────────────────────
  function simStep(s,t,dt,setUi,setLv,setAlert,setLog,chartRef,setApiResult,setApiLoading,setApiError){
    if(!t.renderer||!t.plantGroup)return;
    s.vel=vel;
    s.simDay+=dt*s.vel/400;
    s.simHour=(s.simHour+dt*s.vel*0.5/1000)%24;
    const cd=CULTIVOS[s.cultivo]||CULTIVOS["Lechuga"];
    s.plantAge=clamp(s.simDay/cd.ciclo,0,1);
    const newStage=s.plantAge<0.05?0:s.plantAge<0.2?1:s.plantAge<0.6?2:s.plantAge<0.9?3:4;
    if(newStage!==s.stage){ s.stage=newStage; s.buildTimer=0; }
    s.mods.agua=Math.max(0,s.mods.agua-dt*s.vel*0.000003);
    s.mods.fertil=Math.max(0,s.mods.fertil-dt*s.vel*0.000001);
    s.mods.plaga=Math.max(0,s.mods.plaga-dt*s.vel*0.0000005);
    s.mods.sequia=Math.max(0,s.mods.sequia-dt*s.vel*0.000002);
    s.windTimer-=dt; if(s.windTimer<0){ s.windTarget=(Math.random()-.3)*2; s.windTimer=4000+Math.random()*6000; }
    s.wind=lerp(s.wind,s.windTarget,0.001*dt);
    s.rainTarget=s.mods.agua>0.4?1:s.mods.sequia>0.4?0:0.3;
    s.rainIntensity=lerp(s.rainIntensity,s.rainTarget,0.0005*dt);
    t.rain.visible=s.rainIntensity>0.05;
    if(t.rain.visible) updateRain(t.rain,s.rainIntensity,s.wind,dt);
    s.soilMoisture=clamp(s.soilMoisture+s.rainIntensity*0.0001*dt-0.00003*dt,0.1,1);
    const sm=s.soilMoisture;
    t.tierraMat.color.setRGB(lerp(0.45,0.22,sm),lerp(0.28,0.16,sm),lerp(0.1,0.06,sm));
    const r=REGIONES[s.region];
    const dlf=Math.sin((s.simHour-6)*Math.PI/12);
    s.env.temp=r.baseTemp+r.tempAmp*Math.max(0,dlf)+s.mods.sequia*4-s.mods.agua*1;
    s.env.hum=clamp(r.baseHum-(s.simHour>10&&s.simHour<18?8:0)+s.mods.agua*15-s.mods.sequia*12+s.rainIntensity*10,20,100);
    s.env.luz=Math.max(0,dlf)*r.lightPeak;
    s.env.precip=r.precipBase+s.mods.agua*20-s.mods.sequia*8;
    s.env.ph=r.ph;
    const sunAngle=(s.simHour/24)*Math.PI*2-Math.PI/2;
    t.sol.position.set(Math.cos(sunAngle)*11,Math.sin(sunAngle)*9,-7);
    const sunVis=Math.max(0,Math.sin(sunAngle+Math.PI/2));
    t.sol.visible=sunVis>0.05; t.solMat.color.setHex(s.simHour<7||s.simHour>18?0xff7043:0xffd060);
    const [r1,g1,b1]=hexToRGB(r.sky); const [r2,g2,b2]=hexToRGB(r.skyNight);
    const nr=(r2+(r1-r2)*sunVis)/255,ng=(g2+(g1-g2)*sunVis)/255,nb=(b2+(b1-b2)*sunVis)/255;
    t.renderer.setClearColor(new THREE.Color(nr,ng,nb),1);
    t.skyMat.color.setRGB(nr,ng,nb); t.scene.fog.color.setRGB(nr,ng,nb);
    t.scene.fog.density=r.fog*(1+s.rainIntensity*1.5);
    t.ambLight.intensity=0.25+sunVis*0.5; t.dirLight.intensity=0.15+sunVis*1.3;
    t.dirLight.color.set(r.sun); t.dirLight.position.set(t.sol.position.x*0.3,t.sol.position.y*0.3+4,3);
    const scores=[score(s.env.temp,cd.optT),score(s.env.hum,cd.optH),score(s.env.ph,cd.optPH),score(s.env.luz,cd.optL),score(s.env.precip,cd.optP)];
    let newISP=scores.reduce((a,b)=>a+b)/scores.length-s.mods.plaga*0.25+s.mods.fertil*0.08;
    newISP=clamp(newISP,0,1); s.isp=s.isp*0.92+newISP*0.08;

    // Llamar API cada ~10 días simulados o cuando haya cambio brusco
    const dayInt=Math.floor(s.simDay);
    if(dayInt>0 && dayInt%10===0 && dayInt!==s.lastApiCall){
      s.lastApiCall=dayInt;
      callApi(s,setApiResult,setApiLoading,setApiError);
    }

    if(s.ispHistory.length===0||s.simDay-(s.ispHistory[s.ispHistory.length-1]?.day||0)>0.25){
      s.ispHistory.push({day:Math.floor(s.simDay),isp:s.isp,temp:s.env.temp,hum:s.env.hum});
      if(s.ispHistory.length>60) s.ispHistory.shift();
    }
    s.eventTimer-=dt;
    if(s.eventTimer<0){
      s.eventTimer=7000+Math.random()*10000;
      const evs=r.events; const ev=evs[Math.floor(Math.random()*evs.length)];
      const EVENTS={
        lluvia_sierra:["🌧️ Lluvia de sierra",()=>{ s.mods.agua+=0.6; s.rainTarget=0.8; }],
        helada:["❄️ Helada nocturna",()=>{ s.env.temp-=7; }],
        viento_frio:["🌬️ Viento frío",()=>{ s.env.temp-=3; s.env.hum-=10; s.windTarget=2; }],
        granizo:["🌨️ Granizo",()=>{ s.mods.plaga+=0.15; s.mods.agua+=0.3; }],
        sequia_fuerte:["☀️ Ola de calor",()=>{ s.mods.sequia+=0.8; s.rainTarget=0; }],
        viento_calido:["🌬️ Viento cálido",()=>{ s.env.hum-=12; s.env.temp+=3; s.windTarget=1.5; }],
        lluvia_tropical:["🌦️ Lluvia tropical",()=>{ s.mods.agua+=0.9; s.rainTarget=1; }],
        lluvia_moderada:["🌦️ Lluvia moderada",()=>{ s.mods.agua+=0.4; s.rainTarget=0.5; }],
        brisa:["💨 Brisa fresca",()=>{ s.windTarget=0.8; }],
        nublado:["☁️ Día nublado",()=>{ s.env.luz=Math.max(2,s.env.luz-4); }],
        tormenta:["⛈️ Tormenta",()=>{ s.mods.agua+=0.7; s.windTarget=2.5; s.rainTarget=1; }],
        bruma:["🌫️ Bruma costera",()=>{ s.env.hum+=10; t.scene.fog.density*=2; }],
        niebla:["🌁 Niebla de páramo",()=>{ t.scene.fog.density*=3; }],
      };
      if(EVENTS[ev]){ EVENTS[ev][1](); s.buildTimer=0; const msg=EVENTS[ev][0]; const entry={t:Math.floor(s.simDay)+1,msg,isp:Math.round(s.isp*100)}; s.eventLog=[entry,...s.eventLog].slice(0,12); setLog([...s.eventLog]); if(s.isp<0.35){ setAlert({msg:`${msg} — Planta crítica`,col:"#ef5350"}); setTimeout(()=>setAlert(null),4000); } else { setAlert({msg,col:"#a8e063"}); setTimeout(()=>setAlert(null),3000); } }
    }
    applyWind(t.plantGroup,Math.abs(s.wind),Date.now()*0.001);
    s.buildTimer-=dt; if(s.buildTimer<0){ s.buildTimer=500+Math.random()*300; rebuildPlant(s,t); }
    s.rotY+=0.003*s.vel; t.plantGroup.rotation.y=s.rotY;
    t.renderer.render(t.scene,t.camera);
    const ispPct=Math.round(s.isp*100);
    const colISP=s.isp>=0.55?"#a8e063":s.isp>=0.35?"#ffd54f":"#ef9a9a";
    const estado=s.isp>=0.55?"Óptimo ✅":s.isp>=0.35?"Aceptable ⚠️":"Crítico 🚨";
    const hh=Math.floor(s.simHour).toString().padStart(2,"0");
    const mm=Math.floor((s.simHour%1)*60).toString().padStart(2,"0");
    setUi({dia:Math.floor(s.simDay)+1,hora:`${hh}:${mm}`,ispPct,estado,colISP,stage:s.stage,stageName:cd.stages[s.stage]||"",region:s.region,cultivo:s.cultivo});
    setLv([
      {l:"🌡️ Temp",    v:`${Math.round(s.env.temp)}°C`,   ok:score(s.env.temp,  cd.optT)},
      {l:"💧 Humedad", v:`${Math.round(s.env.hum)}%`,     ok:score(s.env.hum,   cd.optH)},
      {l:"☀️ Luz",     v:`${s.env.luz.toFixed(1)}h`,      ok:score(s.env.luz,   cd.optL)},
      {l:"🌧️ Precip",  v:`${Math.round(s.env.precip)}mm`, ok:score(s.env.precip,cd.optP)},
      {l:"🧪 pH",      v:`${s.env.ph.toFixed(1)}`,        ok:score(s.env.ph,    cd.optPH)},
      {l:"🌱 Suelo",   v:`${Math.round(s.soilMoisture*100)}%`, ok:s.soilMoisture},
    ]);
    drawChart(s.ispHistory,chartRef.current);
  }

  function drawChart(history,cv){
    if(!cv||history.length<2)return;
    const dpr=devicePixelRatio||1; const W=cv.clientWidth*dpr,H=cv.clientHeight*dpr;
    if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; }
    const ctx=cv.getContext("2d"); ctx.clearRect(0,0,W,H);
    const pad=4;
    ctx.strokeStyle="rgba(255,160,80,0.5)"; ctx.lineWidth=1*dpr; ctx.beginPath();
    history.forEach((p,i)=>{ const x=pad+(i/(history.length-1))*(W-pad*2),y=H-pad-((p.temp/40)*(H-pad*2)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke();
    ctx.strokeStyle="rgba(80,160,255,0.5)"; ctx.lineWidth=1*dpr; ctx.beginPath();
    history.forEach((p,i)=>{ const x=pad+(i/(history.length-1))*(W-pad*2),y=H-pad-((p.hum/100)*(H-pad*2)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke();
    ctx.strokeStyle="#a8e063"; ctx.lineWidth=2*dpr; ctx.beginPath();
    history.forEach((p,i)=>{ const x=pad+(i/(history.length-1))*(W-pad*2),y=H-pad-(p.isp*(H-pad*2)); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.stroke();
    ctx.strokeStyle="rgba(168,224,99,0.2)"; ctx.setLineDash([3,3]);
    const yRef=H-pad-(0.55*(H-pad*2)); ctx.beginPath(); ctx.moveTo(pad,yRef); ctx.lineTo(W-pad,yRef); ctx.stroke(); ctx.setLineDash([]);
  }

  useEffect(()=>{
    let lastTs=null;
    const loop=(ts)=>{
      animRef.current=requestAnimationFrame(loop);
      if(!state1.current.playing){ lastTs=null; return; }
      const dt=lastTs?Math.min(ts-lastTs,100):16; lastTs=ts;
      simStep(state1.current,three1.current,dt,setUi1,setLv1,setAlert1,setLog1,chart1Ref,setApi1,setApiLoad1,setApiErr1);
      simStep(state2.current,three2.current,dt,setUi2,setLv2,setAlert2,setLog2,chart2Ref,setApi2,setApiLoad2,setApiErr2);
    };
    animRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(animRef.current);
  },[vel]);

  const handlePlay=()=>{ const p=!state1.current.playing; state1.current.playing=p; state2.current.playing=p; setPlaying(p); };
  const handleReset=()=>{
    const r1=state1.current.region,c1=state1.current.cultivo; const r2=state2.current.region,c2=state2.current.cultivo;
    state1.current={...INITIAL_STATE(r1,c1,0)}; state2.current={...INITIAL_STATE(r2,c2,1)};
    state1.current.playing=false; state2.current.playing=false;
    setPlaying(false); setLog1([]); setLog2([]); setApi1(null); setApi2(null); setApiErr1(null); setApiErr2(null);
    rebuildPlant(state1.current,three1.current); rebuildPlant(state2.current,three2.current);
  };
  function setRegion(side,r){ const s=side===1?state1.current:state2.current; s.region=r; }
  function setCultivo(side,c){ const s=side===1?state1.current:state2.current; s.cultivo=c; s.plantAge=0; s.simDay=0; s.ispHistory=[]; s.stage=0; rebuildPlant(s,side===1?three1.current:three2.current); }
  function callApiManual(side){ const s=side===1?state1.current:state2.current; if(side===1) callApi(s,setApi1,setApiLoad1,setApiErr1); else callApi(s,setApi2,setApiLoad2,setApiErr2); }

  // ── ESTILOS ──────────────────────────────────────────
  const S = {
    page:   { background:"#ffffff", minHeight:"100vh", padding:"16px", fontFamily:"'Courier New', Courier, monospace", color:"#1a2e1a" },
    header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 },
    title:  { fontSize:22, fontWeight:700, color:"#2e7d32", letterSpacing:"0.05em", margin:0 },
    sub:    { fontSize:11, color:"#888", margin:"2px 0 0", letterSpacing:"0.08em", textTransform:"uppercase" },
    card:   { background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:"10px 12px" },
    cardGlow:{ background:"#f0f7f0", border:"1px solid #c8e6c9", borderRadius:8, padding:"10px 12px" },
    lbl:    { margin:"0 0 6px", fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em" },
    btnBase:{ fontSize:10, padding:"4px 9px", borderRadius:5, cursor:"pointer", fontWeight:700, letterSpacing:"0.05em", border:"none", transition:"all 0.15s" },
  };
  function btnSt(active, danger=false) { return { ...S.btnBase, background:danger?"#fff5f5":active?"#e8f5e9":"#f9fafb", border:danger?"1px solid #ffcdd2":active?"1.5px solid #4caf50":"1px solid #e5e7eb", color:danger?"#c62828":active?"#2e7d32":"#555" }; }
  function varCol(ok){ return ok>=0.7?"#2e7d32":ok>=0.45?"#b45309":"#b91c1c"; }

  // ── Panel API Results ─────────────────────────────────
  function ApiPanel({ apiData, loading, error, onRefresh }) {
    if (loading) return (
      <div style={{...S.card, textAlign:"center", padding:"20px 12px"}}>
        <div style={{fontSize:20, marginBottom:6}}>⚙️</div>
        <div style={{fontSize:10, color:"#5a7a5a", letterSpacing:"0.08em"}}>CONSULTANDO MODELO...</div>
      </div>
    );
    if (error) return (
      <div style={{...S.card, border:"1px solid #7c1c1c"}}>
        <p style={{...S.lbl, color:"#ef9a9a"}}>Error de conexión</p>
        <p style={{margin:"0 0 8px", fontSize:10, color:"#ef9a9a88"}}>{error}</p>
        <p style={{margin:"0 0 8px", fontSize:9, color:"#5a7a5a"}}>Asegúrate que Flask corre en: <code style={{color:"#a8e063"}}>{API_URL}</code></p>
        <button onClick={onRefresh} style={btnSt(false)}>↺ Reintentar</button>
      </div>
    );
    if (!apiData) return (
      <div style={{...S.card, textAlign:"center", padding:"20px 12px"}}>
        <div style={{fontSize:24, marginBottom:6}}>🌱</div>
        <div style={{fontSize:10, color:"#3a5a3a", letterSpacing:"0.08em"}}>El modelo consultará la API</div>
        <div style={{fontSize:9, color:"#2a3a2a", marginTop:4}}>automáticamente cada 10 días simulados</div>
        <button onClick={onRefresh} style={{...btnSt(true), marginTop:10, width:"100%", fontSize:10}}>▶ Consultar ahora</button>
      </div>
    );

    const isp = apiData.isp_final ?? 0;
    const ispPct = Math.round(isp * 100);
    const colISP = isp >= 0.55 ? "#a8e063" : isp >= 0.35 ? "#ffd54f" : "#ef9a9a";
    const altura = apiData.altura_cm;

    return (
      <div style={{display:"flex", flexDirection:"column", gap:6}}>
        {/* Métricas principales del modelo */}
        <div style={{...S.cardGlow, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9, color:"#4a7a4a", letterSpacing:"0.08em", marginBottom:4}}>ISP MODELO</div>
            <div style={{fontSize:32, fontWeight:700, color:colISP, lineHeight:1, textShadow:`0 0 16px ${colISP}44`}}>{ispPct}</div>
            <div style={{fontSize:9, color:colISP, marginTop:3}}>{apiData.estado}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9, color:"#4a7a4a", letterSpacing:"0.08em", marginBottom:4}}>ALTURA PRED.</div>
            <div style={{fontSize:32, fontWeight:700, color:"#81d4fa", lineHeight:1, textShadow:"0 0 16px #81d4fa44"}}>{altura != null ? altura.toFixed(1) : "—"}</div>
            <div style={{fontSize:9, color:"#81d4fa", marginTop:3}}>cm</div>
          </div>
        </div>

        {/* ISP bar */}
        <div style={S.card}>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
            <span style={{fontSize:9, color:"#4a7a4a", letterSpacing:"0.08em"}}>ÍNDICE DE SALUD (ISP)</span>
            <span style={{fontSize:9, color:colISP, fontWeight:700}}>{ispPct}%</span>
          </div>
          <div style={{background:"#0d1a0f", borderRadius:4, height:6, overflow:"hidden"}}>
            <div style={{width:`${ispPct}%`, height:"100%", background:`linear-gradient(90deg, ${isp<0.35?"#ef5350":isp<0.55?"#ffd54f":"#a8e063"}, ${colISP})`, borderRadius:4, transition:"width 0.5s", boxShadow:`0 0 8px ${colISP}88`}}/>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:8, color:"#2a3a2a", marginTop:3}}>
            <span>0 — Crítico</span><span>0.35 — Regular</span><span>0.55 — Óptimo</span>
          </div>
        </div>

        {/* Título diagnóstico */}
        {apiData.titulo && (
          <div style={{...S.card, border:`1px solid ${colISP}44`}}>
            <p style={{margin:0, fontSize:11, color:colISP, fontWeight:700}}>{apiData.titulo}</p>
            {apiData.mensaje && <p style={{margin:"6px 0 0", fontSize:10, color:"#5a7a5a", lineHeight:1.5}}>{apiData.mensaje}</p>}
          </div>
        )}

        {/* Problemas detectados */}
        {apiData.diagnostico?.problemas?.length > 0 && (
          <div style={S.card}>
            <p style={{...S.lbl, color:"#ef9a9a"}}>⚠ Problemas detectados ({apiData.diagnostico.problemas.length})</p>
            <div style={{display:"flex", flexDirection:"column", gap:5, maxHeight:140, overflowY:"auto"}}>
              {apiData.diagnostico.problemas.map((p,i)=>(
                <div key={i} style={{fontSize:10, color:"#bf8f8f", lineHeight:1.5, paddingBottom:5, borderBottom:"1px solid #1e2a1e"}}>{p}</div>
              ))}
            </div>
          </div>
        )}

        {/* Positivos */}
        {apiData.diagnostico?.positivos?.length > 0 && (
          <div style={S.card}>
            <p style={{...S.lbl, color:"#a8e063"}}>✓ Condiciones favorables</p>
            <div style={{display:"flex", flexDirection:"column", gap:3, maxHeight:100, overflowY:"auto"}}>
              {apiData.diagnostico.positivos.map((p,i)=>(
                <div key={i} style={{fontSize:10, color:"#6aaa6a", lineHeight:1.4}}>{p}</div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas maceta */}
        {apiData.diagnostico?.alertas_maceta?.length > 0 && (
          <div style={S.card}>
            <p style={{...S.lbl, color:"#81d4fa"}}>🪴 Contenedor / Maceta</p>
            {apiData.diagnostico.alertas_maceta.map((a,i)=>(
              <div key={i} style={{fontSize:10, lineHeight:1.5, marginBottom:4, color:a.nivel==="critico"?"#ef9a9a":a.nivel==="advertencia"?"#ffd54f":a.nivel==="ok"?"#a8e063":"#81d4fa"}}>{a.texto}</div>
            ))}
          </div>
        )}

        {/* Pasos */}
        {apiData.pasos?.length > 0 && (
          <div style={S.card}>
            <p style={S.lbl}>📋 Pasos recomendados</p>
            {apiData.pasos.map((p,i)=>(
              <div key={i} style={{fontSize:10, color:"#5a7a5a", lineHeight:1.5, marginBottom:3}}>{p}</div>
            ))}
          </div>
        )}

        <button onClick={onRefresh} style={{...btnSt(true), width:"100%", padding:"6px", fontSize:10}}>↺ Actualizar análisis</button>
      </div>
    );
  }

  // ── Panel de una planta ──────────────────────────────
  function PanelPlanta({ side, ui, lv, alertMsg, log, chartRef:cRef, apiData, apiLoading, apiError, tab, setTab }) {
    const s = side===1?state1.current:state2.current;
    const [locRegion,  setLocRegion]  = useState(s.region);
    const [locCultivo, setLocCultivo] = useState(s.cultivo);
    const [locSuelo,   setLocSuelo]   = useState(s.tipoSuelo);
    const [locIrrig,   setLocIrrig]   = useState(s.tipoIrrig);
    const [locFert,    setLocFert]    = useState(s.fertilizante);
    const [locMaceta,  setLocMaceta]  = useState(s.maceta);

    return (
      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        {/* Región */}
        <div style={S.card}>
          <p style={S.lbl}>Región</p>
          <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
            {Object.entries(REGIONES).map(([k,r])=>(
              <button key={k} onClick={()=>{ setRegion(side,k); setLocRegion(k); }} style={btnSt(locRegion===k)}>{r.label}</button>
            ))}
          </div>
        </div>

        {/* Cultivo */}
        <div style={S.card}>
          <p style={S.lbl}>Cultivo</p>
          <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
            {Object.entries(CULTIVOS).map(([k,c])=>(
              <button key={k} onClick={()=>{ setCultivo(side,k); setLocCultivo(k); }} style={btnSt(locCultivo===k)}>{c.name}</button>
            ))}
          </div>
        </div>

        {/* Config de cultivo para API */}
        <div style={S.card}>
          <p style={S.lbl}>Parámetros para el modelo</p>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
            <div>
              <p style={{...S.lbl, fontSize:8}}>Tipo suelo</p>
              <div style={{display:"flex", flexDirection:"column", gap:3}}>
                {SUELOS.map(s2=>(
                  <button key={s2} onClick={()=>{ s.tipoSuelo=s2; setLocSuelo(s2); }} style={{...btnSt(locSuelo===s2), width:"100%", textAlign:"left", fontSize:9, padding:"3px 7px"}}>{s2}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{...S.lbl, fontSize:8}}>Irrigación</p>
              <div style={{display:"flex", flexDirection:"column", gap:3}}>
                {IRRIGACIONES.map(i2=>(
                  <button key={i2} onClick={()=>{ s.tipoIrrig=i2; setLocIrrig(i2); }} style={{...btnSt(locIrrig===i2), width:"100%", textAlign:"left", fontSize:9, padding:"3px 7px"}}>{i2}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{...S.lbl, fontSize:8}}>Fertilizante</p>
              <div style={{display:"flex", flexDirection:"column", gap:3}}>
                {FERTILIZANTES.map(f2=>(
                  <button key={f2} onClick={()=>{ s.fertilizante=f2; setLocFert(f2); }} style={{...btnSt(locFert===f2), width:"100%", textAlign:"left", fontSize:9, padding:"3px 7px"}}>{f2}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{...S.lbl, fontSize:8}}>Maceta</p>
              <div style={{display:"flex", flexDirection:"column", gap:3}}>
                {["chica","mediana","grande","jardin"].map(m2=>(
                  <button key={m2} onClick={()=>{ s.maceta=m2; setLocMaceta(m2); }} style={{...btnSt(locMaceta===m2), width:"100%", textAlign:"left", fontSize:9, padding:"3px 7px"}}>{m2}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ciclo de vida */}
        <div style={S.card}>
          <p style={S.lbl}>Ciclo de vida — Día {ui.dia}</p>
          <div style={{display:"flex", gap:2, marginBottom:5}}>
            {(CULTIVOS[locCultivo]?.stages||[]).map((st,i)=>(
              <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2}}>
                <div style={{width:"100%", height:4, borderRadius:2, background:i<=ui.stage?STAGE_COLORS[i]:"#1e3a1e", transition:"background 0.5s"}}/>
                <span style={{fontSize:8, color:i===ui.stage?"#a8e063":"#2a3a2a", fontWeight:i===ui.stage?700:400}}>{st}</span>
              </div>
            ))}
          </div>
          <p style={{margin:0, fontSize:10, color:"#5a7a5a"}}>Etapa: <strong style={{color:"#a8e063"}}>{ui.stageName}</strong></p>
        </div>

        {/* Intervenciones */}
        

        {/* Tabs */}
        <div style={{display:"flex", gap:2, borderBottom:"1px solid #1e3a1e", paddingBottom:0}}>
          {[["live","📊 En vivo"],["api","API flask"],["log","📋 Eventos"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{...btnSt(tab===t), borderRadius:"5px 5px 0 0", borderBottom:"none", fontSize:9, padding:"5px 10px"}}>{l}</button>
          ))}
        </div>

        {/* Tab: En vivo */}
        {tab==="live" && (
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            <div style={S.card}>
              <p style={{...S.lbl}}>Condiciones · {ui.hora}</p>
              {lv.map((v,i)=>(
                <div key={i} style={{display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4}}>
                  <span style={{color:"#3a5a3a"}}>{v.l}</span>
                  <div style={{display:"flex", alignItems:"center", gap:6}}>
                    <div style={{width:40, height:3, borderRadius:2, background:"#0d1a0f", overflow:"hidden"}}>
                      <div style={{width:`${Math.round(v.ok*100)}%`, height:"100%", background:varCol(v.ok)}}/>
                    </div>
                    <span style={{fontWeight:700, color:varCol(v.ok), minWidth:50, textAlign:"right"}}>{v.v}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5}}>
                <p style={{...S.lbl, margin:0}}>Serie temporal</p>
                <div style={{display:"flex", gap:8, fontSize:8, color:"#2a3a2a"}}>
                  <span style={{color:"#a8e063"}}>■ ISP</span>
                  <span style={{color:"rgba(255,160,80,0.8)"}}>■ Temp</span>
                  <span style={{color:"rgba(80,160,255,0.8)"}}>■ Hum</span>
                </div>
              </div>
              <canvas ref={cRef} style={{width:"100%", height:60, display:"block"}}/>
            </div>
          </div>
        )}

        {/* Tab: Modelo IA */}
        {tab==="api" && (
          <ApiPanel apiData={apiData} loading={apiLoading} error={apiError} onRefresh={()=>callApiManual(side)}/>
        )}

        {/* Tab: Log eventos */}
        {tab==="log" && (
          <div style={S.card}>
            <p style={S.lbl}>Historial de eventos</p>
            <div style={{display:"flex", flexDirection:"column", gap:3, maxHeight:200, overflowY:"auto"}}>
              {log.length===0 && <span style={{fontSize:10, color:"#2a3a2a"}}>Sin eventos aún...</span>}
              {log.map((e,i)=>(
                <div key={i} style={{fontSize:10, display:"flex", gap:6, alignItems:"center", paddingBottom:3, borderBottom:"1px solid #1e2a1e"}}>
                  <span style={{color:"#3a5a3a", flexShrink:0}}>Día {e.t}</span>
                  <span style={{color:"#5a7a5a", flex:1}}>{e.msg}</span>
                  <span style={{fontWeight:700, color:e.isp>=55?"#a8e063":e.isp>=35?"#ffd54f":"#ef9a9a", flexShrink:0}}>ISP {e.isp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>◈ SIMULADOR DE CULTIVOS </h1>
          <p style={S.sub}>Serie temporal · Ciclo de vida · Modelo ML · API Flask integrada</p>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
          <div style={{display:"flex", alignItems:"center", gap:6, ...S.card, padding:"4px 10px"}}>
            <span style={{fontSize:9, color:"#3a5a3a"}}>VEL</span>
            <input type="range" min="1" max="12" step="1" value={vel}
              onChange={e=>{ const v=parseInt(e.target.value); setVelState(v); state1.current.vel=v; state2.current.vel=v; }}
              style={{width:70, accentColor:"#a8e063"}}/>
            <span style={{fontSize:11, fontWeight:700, color:"#a8e063", minWidth:24}}>{vel}×</span>
          </div>
          <button onClick={handlePlay}  style={{...btnSt(playing), padding:"7px 20px", fontSize:12}}>{playing?"⏸ PAUSE":"▶ PLAY"}</button>
          <button onClick={handleReset} style={{...btnSt(false),   padding:"7px 14px", fontSize:12}}>↺ RESET</button>
        </div>
      </div>

      {/* Grid 2 plantas */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>

        {/* ── Planta A ── */}
        <div>
          <div style={{position:"relative", borderRadius:10, overflow:"hidden", border:"1px solid #2e6a2e", marginBottom:10, boxShadow:"0 0 20px #a8e06312"}}>
            <canvas ref={canvas1Ref} style={{width:"100%", height:350, display:"block"}}/>
            <div style={{position:"absolute",top:0,left:0,right:0,padding:"8px 12px",display:"flex",justifyContent:"space-between",background:"linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)",pointerEvents:"none"}}>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:"#a8e063", letterSpacing:"0.05em"}}>PLANTA A · DÍA {ui1.dia}</div>
                <div style={{fontSize:9, color:"rgba(168,224,99,0.5)", letterSpacing:"0.06em"}}>{REGIONES[ui1.region]?.label} · {CULTIVOS[ui1.cultivo]?.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:26, fontWeight:700, color:ui1.colISP, textShadow:`0 0 12px ${ui1.colISP}88`}}>{ui1.ispPct}</div>
                <div style={{fontSize:9, color:"rgba(255,255,255,0.6)"}}>{ui1.estado}</div>
              </div>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"6px 12px",background:"linear-gradient(to top,rgba(0,0,0,0.6),transparent)",pointerEvents:"none"}}>
              <div style={{fontSize:10, color:"#a8e063", fontWeight:700, minHeight:14}}>{alert1?.msg||""}</div>
            </div>
            {alert1?.col==="#ef5350"&&(
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(139,20,20,0.9)",color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,textAlign:"center",pointerEvents:"none",maxWidth:"80%",border:"1px solid #ef5350"}}>
                🚨 {alert1.msg}
              </div>
            )}
            {/* Badge API */}
            {api1 && (
              <div style={{position:"absolute", top:8, right:8, background:"rgba(10,20,10,0.85)", border:"1px solid #a8e06366", borderRadius:6, padding:"3px 8px", pointerEvents:"none"}}>
                <span style={{fontSize:9, color:"#81d4fa", letterSpacing:"0.06em"}}> {api1.altura_cm?.toFixed(1)}cm</span>
              </div>
            )}
          </div>
          <PanelPlanta side={1} ui={ui1} lv={lv1} alertMsg={alert1} log={log1} chartRef={chart1Ref} apiData={api1} apiLoading={apiLoad1} apiError={apiErr1} tab={tab1} setTab={setTab1}/>
        </div>

        {/* ── Planta B ── */}
        <div>
          <div style={{position:"relative", borderRadius:10, overflow:"hidden", border:"1px solid #2e6a2e", marginBottom:10, boxShadow:"0 0 20px #a8e06312"}}>
            <canvas ref={canvas2Ref} style={{width:"100%", height:350, display:"block"}}/>
            <div style={{position:"absolute",top:0,left:0,right:0,padding:"8px 12px",display:"flex",justifyContent:"space-between",background:"linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)",pointerEvents:"none"}}>
              <div>
                <div style={{fontSize:12, fontWeight:700, color:"#a8e063", letterSpacing:"0.05em"}}>PLANTA B · DÍA {ui2.dia}</div>
                <div style={{fontSize:9, color:"rgba(168,224,99,0.5)", letterSpacing:"0.06em"}}>{REGIONES[ui2.region]?.label} · {CULTIVOS[ui2.cultivo]?.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:26, fontWeight:700, color:ui2.colISP, textShadow:`0 0 12px ${ui2.colISP}88`}}>{ui2.ispPct}</div>
                <div style={{fontSize:9, color:"rgba(255,255,255,0.6)"}}>{ui2.estado}</div>
              </div>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"6px 12px",background:"linear-gradient(to top,rgba(0,0,0,0.6),transparent)",pointerEvents:"none"}}>
              <div style={{fontSize:10, color:"#a8e063", fontWeight:700, minHeight:14}}>{alert2?.msg||""}</div>
            </div>
            {alert2?.col==="#ef5350"&&(
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(139,20,20,0.9)",color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:700,textAlign:"center",pointerEvents:"none",maxWidth:"80%",border:"1px solid #ef5350"}}>
                🚨 {alert2.msg}
              </div>
            )}
            {api2 && (
              <div style={{position:"absolute", top:8, right:8, background:"rgba(10,20,10,0.85)", border:"1px solid #a8e06366", borderRadius:6, padding:"3px 8px", pointerEvents:"none"}}>
                <span style={{fontSize:9, color:"#81d4fa", letterSpacing:"0.06em"}}> {api2.altura_cm?.toFixed(1)}cm</span>
              </div>
            )}
          </div>
          <PanelPlanta side={2} ui={ui2} lv={lv2} alertMsg={alert2} log={log2} chartRef={chart2Ref} apiData={api2} apiLoading={apiLoad2} apiError={apiErr2} tab={tab2} setTab={setTab2}/>
        </div>
      </div>
    </div>
  );
}