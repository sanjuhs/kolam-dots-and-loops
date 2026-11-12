'use strict';
/* Rangoli motifs, drawn in a 100 x 100 box. Each draw(rng) returns SVG markup. */
(function(){
const W='#fff6e6';
const K={gold:'#f6a400',yellow:'#ffd54a',pink:'#e8457a',rose:'#f7a1c0',teal:'#17a69b',violet:'#8a55c9',orange:'#f26b21',
  green:'#4caf50',leaf:'#2e8b57',red:'#d92b2b',maroon:'#8f1020',blue:'#2f6fe0',sky:'#4aa3ff',navy:'#1b2f7a',
  clay:'#b5522d',darkclay:'#8a3b20',cream:'#fff1c9',brown:'#6b4320',copper:'#e08a1e',bronze:'#c98a1b',cane:'#7b3fa0'};
const P=(d,f,sw=.9)=>`<path d="${d}" fill="${f}" stroke="${W}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const L=(d,c=W,sw=1)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const C=(x,y,r,f,sw=.9)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" stroke="${W}" stroke-width="${sw}"/>`;
const E=(x,y,rx,ry,f,sw=.9)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${W}" stroke-width="${sw}"/>`;
const D=(x,y,r=.9,f=W)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const R=(deg,s,cx=50,cy=50)=>`<g transform="rotate(${deg} ${cx} ${cy})">${s}</g>`;
const ring=(n,s,off=0,cx=50,cy=50)=>{let o='';for(let i=0;i<n;i++)o+=R(off+i*360/n,s,cx,cy);return o};
const fan=(n,a0,a1,s,cx=50,cy=50)=>{let o='';for(let i=0;i<n;i++)o+=R(a0+(a1-a0)*i/(n-1),s,cx,cy);return o};
// petal pointing up from (cx,cy): starts r0 above the centre, tip at r1, half-width w
const petal=(r0,r1,w,cx=50,cy=50)=>{const h=r1-r0,y0=cy-r0;
  return`M${cx} ${y0}C${cx+w} ${y0-h*.3} ${cx+w*.85} ${y0-h*.72} ${cx} ${cy-r1}C${cx-w*.85} ${y0-h*.72} ${cx-w} ${y0-h*.3} ${cx} ${y0}Z`};
// teardrop: round head of radius r at (cx,cy), tail pointing down
const drop=(cx,cy,r,len)=>`M${cx-r} ${cy}A${r} ${r} 0 1 1 ${cx+r} ${cy}Q${cx+r*.85} ${cy+len*.5} ${cx} ${cy+len}Q${cx-r*.85} ${cy+len*.5} ${cx-r} ${cy}Z`;
const pick=(rng,a)=>a[Math.floor(rng()*a.length)];

function frame(c1,c2){
  let o='';
  for(let i=0;i<=20;i++){const t=3+i*4.7;o+=D(t,3,.8)+D(t,97,.8)+D(3,t,.8)+D(97,t,.8)}
  [[8,8,135],[92,8,225],[92,92,315],[8,92,45]].forEach(([x,y,a])=>{
    o+=R(a-38,P(petal(1,10,2.6,x,y),c2,.7),x,y)+R(a+38,P(petal(1,10,2.6,x,y),c2,.7),x,y)+R(a,P(petal(1,14,3.2,x,y),c1,.7),x,y);
  });
  return o;
}

const featherCore=()=>{
  let o=L('M50 97L50 40',W,1.5);
  for(let y=94;y>=74;y-=4){const k=(94-y)*.35+7;o+=L(`M50 ${y}L${50-k} ${y-8}M50 ${y}L${50+k} ${y-8}`,K.green,1.1)}
  o+=P(drop(50,32,24,46),K.leaf)+P(drop(50,31,17.5,34),K.bronze)+P(drop(50,30,12,23),K.teal)+E(50,28,6.5,8,K.navy)+D(50,26,2,K.sky);
  for(let a=-70;a<=70;a+=20)o+=R(a,L('M50 8L50 4',K.green,1),50,32);
  return o;
};

const M=[];
const add=(id,name,note,draw)=>M.push({id,name,note,draw:rng=>draw(rng||Math.random)});

add('lotus','Lotus','The lotus (kamal, padma) is the national flower of India. Goddess Lakshmi is shown seated on one.',rng=>{
  const n=pick(rng,[6,8,8,10,12]);
  const c=pick(rng,[[K.pink,K.rose,K.yellow],[K.violet,K.pink,K.yellow],[K.orange,K.gold,K.yellow],[K.teal,K.sky,K.cream],[K.red,K.pink,K.rose]]);
  return frame(c[0],K.leaf)+ring(n,P(petal(26,41,60/n),K.leaf),0)+ring(n,P(petal(14,39,84/n),c[0]),180/n)+ring(n,P(petal(9,32,78/n),c[1]))+
    ring(n,P(petal(4,21,54/n),c[2]),180/n)+C(50,50,6.5,K.gold)+ring(8,D(50,46.6,.75,K.brown));
});

add('diya','Diya','A diya is a small clay oil lamp. At Diwali, the festival of lights, rows of them glow at every doorstep.',()=>{
  let o=frame(K.gold,K.orange);
  o+=fan(9,-96,96,L('M50 9L50 14',K.yellow,1.3)+D(50,5.5,.9,K.gold),50,36);
  o+=E(50,56,32,5.5,K.darkclay);
  o+=P(petal(0,37,11.5,50,57),K.yellow)+P(petal(0,24,6.5,50,56),K.orange)+P(petal(0,12,3,50,55),K.red,.6);
  o+=P('M18 56Q50 67 82 56Q78 87 50 87Q22 87 18 56Z',K.clay);
  o+=P('M18 56L10 53L19 61Z',K.clay)+P('M82 56L90 53L81 61Z',K.clay);
  for(let x=29;x<=71;x+=7)o+=D(x,66.5-Math.pow((x-50)/21,2)*3.2,.9);
  o+=ring(8,P(petal(0,6,1.9,50,76),K.pink,.6),0,50,76)+C(50,76,2.2,K.gold,.6);
  o+=C(33,73,2.4,K.gold,.6)+C(67,73,2.4,K.gold,.6);
  return o+E(50,89,13,2.6,K.darkclay);
});

add('peacock','Peacock','The peacock (mor, mayil) is the national bird of India. It dances when the monsoon clouds arrive.',()=>{
  let o=frame(K.teal,K.blue);
  const f=P(petal(8,43,6.5,50,76),K.leaf)+C(50,43,4.3,K.gold,.7)+C(50,43,2.5,K.blue,0)+D(50,43.4,1.1,K.navy);
  o+=fan(9,-80,80,f,50,76);
  o+=fan(8,-70,70,P(petal(6,24,4,50,76),K.teal,.7),50,76);
  o+=L('M46 90L43 95M54 90L57 95',K.gold,1.3);
  o+=P('M50 91C40 91 37 78 44 68C48 62 47 53 47 47C47 40 53 40 53 47C53 53 52 62 56 68C63 78 60 91 50 91Z',K.blue);
  o+=P(petal(0,14,4.6,50,87),K.teal,.7);
  o+=fan(3,-28,28,L('M50 39L50 32',W,.9)+D(50,31,1.3,K.gold),50,43);
  o+=C(50,44,5,K.blue)+P('M54.4 43L60 45L54.4 46.6Z',K.gold,.6)+D(51.6,43,.9);
  return o;
});

add('hibiscus','Hibiscus','The red hibiscus (japa, dasavala, sembaruthi) is a favourite offering to Lord Ganesha.',()=>{
  let o=frame(K.red,K.leaf);
  o+=ring(5,P(petal(22,41,7),K.leaf)+L('M50 27L50 12',W,.6),36);
  o+=ring(5,P(petal(3,38,19),K.red)+L('M50 40L50 20M50 36L44 24M50 36L56 24',K.rose,.6));
  o+=ring(5,P(petal(2,16,6.5),K.maroon,.7));
  o+=L('M50 50C56 43 62 37 69 30',W,3.4)+L('M50 50C56 43 62 37 69 30',K.yellow,2.2);
  [[60,41],[64,37],[58,39],[66,35],[62,35]].forEach(p=>o+=D(p[0],p[1],1.1,K.gold));
  [[71,26],[74,29],[73,32],[68,26],[75,25]].forEach(p=>o+=C(p[0],p[1],1.5,K.red,.5));
  return o;
});

add('pookalam','Pookalam','A pookalam is a round carpet of fresh flower petals, laid out in Kerala to celebrate Onam.',rng=>{
  const n=pick(rng,[12,16]),m=pick(rng,[8,10,12]);
  const c=pick(rng,[[K.gold,K.orange,K.red,K.cream,K.violet],[K.pink,K.violet,K.yellow,K.orange,K.leaf],[K.orange,K.yellow,K.leaf,K.red,K.cream],[K.cream,K.pink,K.gold,K.violet,K.orange]]);
  return frame(c[0],c[1])+ring(n,C(50,13,n===12?6:4.6,c[1]))+C(50,50,36.5,c[0])+ring(n*2,D(50,17,.8))+C(50,50,30,c[2])+
    ring(m,P(petal(11,29,62/m),c[3]))+C(50,50,14,c[4])+ring(8,P(petal(0,12.5,3.4),c[0],.7))+C(50,50,3.6,c[2],.7);
});

add('feather','Mor Pankh','Lord Krishna wears a peacock feather, the mor pankh, in his crown.',()=>frame(K.teal,K.gold)+R(14,featherCore()));

add('lotusside','Lotus in the Pond','A lotus rises clean and bright out of muddy water, so it stands for purity.',()=>{
  let o=frame(K.pink,K.leaf);
  o+=fan(7,-48,48,D(50,14,1),50,78);
  o+=L('M50 80L50 95',K.leaf,2.4)+E(25,82,15,3.6,K.leaf)+E(75,82,15,3.6,K.leaf);
  o+=L('M9 90Q16 86 23 90T37 90T51 90T65 90T79 90T91 90',K.sky,1.3)+L('M16 95Q23 91 30 95T44 95T58 95T72 95T86 95',K.sky,1.3);
  [[74,30,8,K.rose],[50,38,9,K.pink],[25,44,10,K.rose]].forEach(([a,len,w,col])=>{
    o+=R(-a,P(petal(0,len,w,50,79),col),50,79)+R(a,P(petal(0,len,w,50,79),col),50,79)});
  o+=P(petal(0,49,10.5,50,79),K.pink)+L('M50 72L50 44',K.rose,.7);
  return o+P('M36 78Q50 88 64 78Q50 83 36 78Z',K.leaf);
});

add('kalash','Kalash','A kalash is a pot topped with mango leaves and a coconut. It welcomes guests and good fortune.',()=>{
  let o=frame(K.gold,K.leaf);
  o+=fan(5,-66,66,P(petal(2,30,6.5,50,47),K.leaf)+L('M50 44L50 22',W,.6),50,47);
  o+=E(50,33,9.5,11.5,K.brown)+L('M50 21.5L50 16',K.brown,1.6)+L('M45 28Q50 24 55 28',W,.6);
  o+=P('M40 53C19 59 21 87 40 91L60 91C79 87 81 59 60 53Z',K.copper);
  o+=P('M38 45L62 45L60 53L40 53Z',K.gold)+E(50,45,13.5,2.7,K.yellow);
  o+=L('M25.5 66Q50 74 74.5 66',W,.9)+L('M25.5 82Q50 90 74.5 82',W,.9);
  o+=ring(8,P(petal(0,6.5,2,50,75.5),K.red,.6),0,50,75.5)+C(50,75.5,2.2,K.yellow,.6);
  for(const x of[31,38,62,69])o+=D(x,75.5-Math.abs(x-50)*.08,1);
  return o+E(50,92,13,2.4,K.bronze);
});

add('sun','Surya','At Makar Sankranti and Pongal, families thank Surya, the sun, for the harvest.',rng=>{
  const n=pick(rng,[10,12,14]);
  return frame(K.gold,K.red)+ring(n,P('M44.6 25L50 9L55.4 25Z',K.gold))+ring(n,P(petal(23,37,2.6),K.red,.7),180/n)+C(50,50,25.5,K.orange)+
    ring(n*2,D(50,28,.8))+C(50,50,18.5,K.yellow)+ring(8,P(petal(0,15.5,4),K.orange,.7))+C(50,50,5,K.red,.7);
});

add('ganesha','Ganesha','Ganesha, the remover of obstacles, is welcomed home with rangoli at Ganesh Chaturthi.',()=>{
  let o=frame(K.orange,K.gold);
  o+=E(21,50,15,20,K.pink)+E(79,50,15,20,K.pink)+E(22,50,8.5,13,K.rose,.6)+E(78,50,8.5,13,K.rose,.6);
  o+=C(50,47,22.5,K.orange);
  o+=P('M31 33L35 14L43 25L50 7L57 25L65 14L69 33Z',K.gold)+P('M30 31H70V37H30Z',K.red)+C(50,21,2.6,K.red,.6);
  for(const x of[36,43,50,57,64])o+=D(x,34,.9,K.yellow);
  o+=L('M50 55C50 70 46 80 55 86C62 90 68 84 65 78',W,14)+L('M50 55C50 70 46 80 55 86C62 90 68 84 65 78',K.orange,12.2);
  for(const y of[64,70,76])o+=L(`M45.5 ${y}Q50 ${y+2.2} 54.5 ${y}`,W,.7);
  o+=P('M39 61Q33 66 34 74Q40 70 43 63Z',W,.5)+P('M61 61Q65 64 65 68Q61 67 58 63Z',W,.5);
  o+=L('M36 46Q40.5 42 45 46M55 46Q59.5 42 64 46',W,1.1)+D(40.5,47.4,1.5,K.navy)+D(59.5,47.4,1.5,K.navy);
  o+=P(petal(0,7,2,50,45.5),K.red,.6)+L('M44 40.5H56',K.cream,.8);
  return o;
});

add('mango','Mankolam','The mango shape, called mankolam or paisley, is woven into silk saris and drawn in kolams.',()=>{
  const B='M50 90C24 90 14 62 30 42C44 26 62 26 72 10C80 28 88 46 82 64C78 80 66 90 50 90Z';
  const sc=(k,s)=>`<g transform="translate(52 60) scale(${k}) translate(-52 -60)">${s}</g>`;
  let o=frame(K.green,K.gold);
  o+=R(-50,P(petal(0,15,4.5,72,11),K.leaf),72,11);
  o+=P(B,K.green)+sc(.74,P(B,K.gold,1.2))+sc(.48,P(B,K.red,1.8));
  o+=ring(6,P(petal(0,5.5,1.8,50,64),K.yellow,.5),0,50,64)+D(50,64,1.3);
  [[31,52],[28,62],[31,73],[39,82],[52,85.5],[65,81],[74,71],[77.5,60],[77,49],[74,38]].forEach(p=>o+=D(p[0],p[1],.9));
  return o;
});

add('flute','Flute & Feather','The bamboo flute (bansuri) and peacock feather belong to Krishna, celebrated at Janmashtami.',()=>{
  let o=frame(K.blue,K.gold);
  let f=`<g transform="translate(5 3.5) scale(.44)">${R(22,featherCore(),50,97)}</g>`;
  f+=P('M11 45H89A5 5 0 0 1 89 55H11A5 5 0 0 1 11 45Z',K.bronze);
  f+=L('M20 45V55M23.5 45V55M77 45V55M80.5 45V55',K.red,1.5);
  for(let x=33;x<=68;x+=7)f+=D(x,50,1.7,K.brown);
  f+=L('M79 55Q84 63 80 70',K.red,1.3)+C(80,72.5,2.8,K.red,.6)+L('M72 55Q68 62 71 67',K.yellow,1.3)+C(71,69.5,2.4,K.yellow,.6);
  o+=R(-32,f);
  return o;
});

add('pongal','Pongal Pot','At Pongal in Tamil Nadu, rice and milk are boiled in a new pot until they joyfully overflow.',()=>{
  let o=frame(K.orange,K.leaf);
  const cane=x=>{let s=L(`M${x} 92L${x} 22`,W,5.4)+L(`M${x} 92L${x} 22`,K.cane,4);
    for(let y=82;y>=30;y-=10)s+=L(`M${x-2} ${y}H${x+2}`,W,.8);
    return s+fan(3,-34,34,P(petal(0,15,2.6,x,23),K.leaf,.7),x,23)};
  o+=R(-9,cane(17),17,92)+R(9,cane(83),83,92);
  o+=C(50,15,5.5,K.gold)+ring(10,L('M50 6.5L50 4.5',K.gold,1.2),0,50,15);
  o+=P('M33 52C17 59 20 87 40 91L60 91C80 87 83 59 67 52Z',K.clay);
  o+=P('M31 45L69 45L67 53L33 53Z',K.darkclay);
  o+=E(40,55,3,6.5,K.cream,.7)+E(61,56.5,3,8,K.cream,.7);
  o+=C(36,42,5.2,K.cream,.7)+C(64,42,5.2,K.cream,.7)+C(45,39,6.2,K.cream,.7)+C(55,39,6.2,K.cream,.7)+C(50,35,5,K.cream,.7);
  o+=L('M34 53.5Q50 59 66 53.5',K.yellow,1.6);
  o+=ring(8,D(50,67.5,.9),0,50,74)+C(50,74,3.6,K.gold,.6)+L('M27 80Q50 88 73 80',W,.9);
  return o+E(50,92,12,2.2,K.darkclay);
});

add('footprints','Lakshmi Padam',"On Diwali night, tiny footprints are drawn at the door to welcome Goddess Lakshmi into the home.",()=>{
  let o=frame(K.red,K.gold);
  const foot=(cx,s)=>{
    let t=P(`M${cx-7*s} 80C${cx-11*s} 68 ${cx-9*s} 54 ${cx-8*s} 46C${cx-7*s} 38 ${cx+8*s} 38 ${cx+9*s} 46C${cx+10*s} 56 ${cx+9*s} 70 ${cx+6*s} 80C${cx+3*s} 86 ${cx-4*s} 86 ${cx-7*s} 80Z`,K.red);
    [3.7,2.9,2.5,2.2,1.9].forEach((r,i)=>t+=C(cx+s*(6.5-i*3.9),31.5+i*1.5,r,K.red,.7));
    t+=ring(6,D(cx,57,.8),0,cx,62)+C(cx,62,2.2,K.gold,.5)+D(cx,74,1);
    return t};
  o+=foot(33,1)+foot(67,-1);
  o+=ring(8,P(petal(1,7.5,2.3,50,15),K.pink,.6),0,50,15)+C(50,15,2,K.gold,.5);
  o+=ring(8,P(petal(1,5,1.7,50,90),K.gold,.5),0,50,90)+D(50,90,1);
  return o;
});

add('marigold','Marigold','Marigolds (genda) are strung into bright garlands for doorways, weddings and every festival.',rng=>{
  const c=pick(rng,[[K.orange,K.gold,K.yellow],[K.gold,K.yellow,K.orange],[K.red,K.orange,K.gold]]);
  let o=frame(c[0],K.leaf)+ring(6,P(petal(26,42,6.5),K.leaf),30);
  [[38,18,9,0],[31,16,8.5,10],[24,14,8,0],[17,12,7.5,15],[10,10,6,0]].forEach(([r,n,w,off],i)=>{
    o+=ring(n,C(50,50-r+w*.45,w*.62,c[i%3],.7),off)});
  return o+C(50,50,4,c[1],.7);
});

window.MOTIFS=M;

/* Rangavalli mandala: n-fold symmetry, built so a petal layer crosses every ring boundary. */
const PALS=[
  {bg:'#1b2f7a',bg2:'#ffc928',c:['#c62828','#ffc928','#e8457a','#f26b21']},
  {bg:'#1f5c33',bg2:'#f6a400',c:['#d92b2b','#5dbb3a','#f26b21','#ffd54a']},
  {bg:'#7a1436',bg2:'#fff1c9',c:['#e8457a','#f6a400','#17a69b','#8a55c9']},
  {bg:'#3a1d6e',bg2:'#17a69b',c:['#f7a1c0','#8a55c9','#ffd54a','#e8457a']},
  {bg:'#0f4c5c',bg2:'#f26b21',c:['#ffd54a','#17a69b','#e8457a','#fff1c9']},
  {bg:'#5a1f12',bg2:'#ffd54a',c:['#f26b21','#d92b2b','#fff1c9','#4caf50']}];
window.mandalaArt=(n,k,rng)=>{
  const pal=pick(rng,PALS),w=46/k,cols=pal.c;let ci=Math.floor(rng()*cols.length),o='';
  const col=()=>cols[ci++%cols.length];
  const rim=pick(rng,['diya','scallop','bud','diya']),half=180/n;
  if(rim==='scallop'){const s=Math.min(5.2,Math.PI*40.5/n),c1=col();
    o+=ring(n,C(50,4.4+s,s,c1,.7))+(n<=10?ring(n,C(50,4.4+s,s*.9,pal.bg2,.7),half):'')}
  if(rim==='bud'){const c1=col();o+=ring(n,P(petal(37,46,Math.min(3.6,70/n)),c1,.7))+ring(n,P(petal(38,43.5,Math.min(2.4,45/n)),K.leaf,.6),half)}
  o+=C(50,50,41.5,pal.bg);
  if(rim==='diya')o+=ring(n,P('M46.3 8.5Q50 14 53.7 8.5Z',K.clay,.5)+P(petal(0,4.8,1.6,50,8.9),K.yellow,.5),half);
  o+=ring(n*2,D(50,50-39.6,.55));
  for(let i=k-1;i>=1;i--){
    const c=46*i/k,r1=Math.min(38.5,c+w*.85),r0=Math.max(1.5,c-w*.9),h=r1-r0,odd=(k-1-i)%2;
    if(i<k-1){const rd=c+w*.42;o+=C(50,50,rd,odd?pal.bg2:pal.bg)+ring(n*2,D(50,50-rd+1.6,.5,odd?pal.bg:W))}
    const wid=Math.min(h*.62,Math.PI*((r0+r1)/2)/n*(.92+rng()*.2)),a=col(),b=col(),style=rng();
    let p=P(petal(r0,r1,wid),a);
    if(style<.6&&h>7)p+=P(petal(r0+h*.24,r1-h*.2,wid*.5),b,.6)+D(50,50-(r0+h*.52),Math.min(.9,wid*.18));
    else if(h>6)p+=L(`M50 ${50-r0-h*.25}L50 ${50-r1+h*.22}`,W,.6);
    o+=ring(n,p,odd?half:0);
    if(i===k-1&&k<=4&&n<=12){const y=50-Math.min(38.5,r1+1.5);
      o+=ring(n,L(`M50 ${y+7}c0 -4 -5 -3.6 -4.4 -.6c.4 1.8 2.6 1.6 2.4 -.2M50 ${y+7}c0 -4 5 -3.6 4.4 -.6c-.4 1.8 -2.6 1.6 -2.4 -.2`,W,.6),odd?0:half)}
  }
  const rc=Math.min(6.5,w*.5);
  o+=C(50,50,rc,K.gold)+ring(n,D(50,50-rc*.62,Math.min(.7,rc*.14),K.brown))+D(50,50,rc*.22,K.red);
  return o;
};
})();
