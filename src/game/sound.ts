/* Copyright (c) 2026 Celia. All rights reserved. */
// One gesture-unlocked context shared by the board and sound switch.
let context:AudioContext|undefined;
let enabled=true;
export function setSoundEnabled(value:boolean){enabled=value;if(value)unlockSound();}
export function unlockSound(){if(!enabled)return;try{context??=new AudioContext();if(context.state==='suspended')void context.resume().catch(()=>{});}catch{}}
export function chessSound(kind:'lift'|'place'|'capture'){
 if(!enabled||!context||context.state!=='running')return;
 const ctx=context,t=ctx.currentTime;
 const strike=(start:number,strength:number,base:number)=>{
  for(const [ratio,volume,decay] of [[1,.22,.1],[2.76,.065,.045],[4.1,.025,.024]]){
   const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(base*ratio,start);o.frequency.exponentialRampToValueAtTime(base*ratio*.8,start+.07);
   g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume*strength,start+.002);g.gain.exponentialRampToValueAtTime(.0001,start+decay);o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+.14);o.onended=()=>{o.disconnect();g.disconnect()};
  }
  const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.025),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*7);
  const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=buffer;f.type='bandpass';f.frequency.value=1600;f.Q.value=.8;g.gain.value=.2*strength;n.connect(f);f.connect(g);g.connect(ctx.destination);n.start(start);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect()};
 };
 if(kind==='lift')strike(t,.2,780);else if(kind==='capture'){strike(t,.85,370);strike(t+.047,.35,650);}else strike(t,.6,440);
}
