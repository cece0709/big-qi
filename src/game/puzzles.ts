/* Copyright (c) 2026 Celia. All rights reserved. */
import {apply,inCheck,moves,names,reason,type Kind,type Move,type Piece,type Side} from './rules.ts';
export type Puzzle={id:string;name:string;category:string;goal:'mate'|'stalemate'|'gain'|'escape'|'technique';board:Piece[];line:{move:Move;why:string}[];hint:string;lesson:string};
type Unit=[string,Side,Kind,number,number];
type Step=[string,number,number,string];
function make(id:string,name:string,category:string,goal:Puzzle['goal'],units:Unit[],steps:Step[],hint:string,lesson:string):Puzzle{return {id,name,category,goal,board:units.map(([id,side,kind,x,y])=>({id,side,kind,x,y})),line:steps.map(([id,x,y,why])=>({move:{id,x,y},why})),hint,lesson};}
const kings=(redX:number,blackX:number,blackY=0):Unit[]=>[['rk','red','k',redX,9],['bk','black','k',blackX,blackY]];
export const puzzles:Puzzle[]=[
 make('white-face','白脸将 · 借帅封路','车兵杀法','mate',[...kings(4,5),['r','red','r',0,2]],[['r',5,2,'车占住将所在的直线。将向前仍受车攻击，向中路躲又会与红帅照面，因此无路可走。']],'先看红帅封住了哪一条竖线，再用车封住另一条。','帅虽在远处，也能利用将帅不能照面的规则封路。'),
 make('two-rooks','双车协作 · 一封一杀','车兵杀法','mate',[...kings(3,4),['r','red','r',0,1],['r2','red','r',8,2]],[['r2',8,0,'右车到底线将军，左车守住将的前进线。两辆车各管一排，将没有安全落点。']],'一辆车守住第二排，另一辆车去底线。','分工比堆在一条线上更重要。'),
 make('rook-ladder','双车错 · 连续收网','车兵杀法','mate',[...kings(3,4,1),['r','red','r',0,2],['r2','red','r',8,3]],[['r2',8,1,'右车横着将军。左车封住下一排，黑将只能退回底线。'],['bk',4,0,'这是黑方唯一的合法应将：横走仍被右车照着，向前被左车封住。'],['r',0,0,'左车到底线接力将军，右车继续守住第二排，完成将杀。']],'先用右车将军，保留左车的封锁线。','将军与封路交替进行，不能两辆车一起追着将跑。'),
 make('horse-cannon','马后炮 · 马作炮架','马炮杀法','mate',[...kings(3,4),['n','red','n',4,2],['c','red','c',0,4]],[['c',4,4,'炮移到马后，隔着马将军。马同时控制将左右的两个落点，炮控制直线。']],'马的位置已合适，把炮移到它后方的同一条竖线。','马腿畅通，马的封路与炮的直线攻击才能同时生效。'),
 make('double-cannon','重炮 · 前后照应','马炮杀法','mate',[...kings(3,4),['a','black','a',3,0],['a2','black','a',5,0],['c','red','c',4,3],['c2','red','c',0,5]],[['c2',4,5,'后炮以先前的炮为炮架将军。若士补到中间，前炮反而能借这个士继续将军。']],'让两门炮在将的同一条线上前后站好。','重炮的特点是：补一个子挡后炮，可能会给前炮送来炮架。'),
 make('smother','闷宫 · 借对方的子','马炮杀法','mate',[...kings(3,4),['a','black','a',3,0],['a2','black','a',5,0],['r','black','r',4,1],['c','red','c',0,3]],[['c',0,0,'炮到底线，借左士作炮架。将左右被士占住，前方被车堵住；左士也无法跳进已有车的宫心来解围。']],'对方的士可以当炮架，拥挤的九宫也可能成为弱点。','守子多不等于安全，要给自己的将留出活动空间。'),
 make('elbow-horse','卧槽马 · 近身进攻','马炮杀法','mate',[...kings(3,4),['n','red','n',0,2],['p','red','p',4,2],['r','red','r',5,3]],[['n',2,1,'马跳到贴近底线的卧槽位置将军。红帅封左侧，车封右侧，兵守住将前方，黑将无路可走。']],'马从左边跳进卧槽位，别忘了检查马腿。','马负责攻击，车、兵与帅负责封路。'),
 make('palace-horse','挂角马 · 直指宫心','马炮杀法','mate',[...kings(5,4),['n','red','n',1,3],['a','black','a',3,0],['r','red','r',6,1]],[['n',3,2,'马挂到九宫前角，将军指向底线中将。黑士占住左边，红帅封右边，车控制将的前方。']],'马可以跳到九宫前角，斜着攻击底线的将。','挂角前先看马腿是否被堵，再检查对方能否走到另一侧。'),
 make('fishing-horse','钓鱼马 · 马控车杀','马炮杀法','mate',[...kings(3,4),['n','red','n',6,2],['r','red','r',8,3]],[['r',8,0,'车到底线将军。钓鱼马控制宫心，黑将无法前进；在底线上左右移动也仍受车攻击。']],'马已经守住宫心，让车沿底线发起攻击。','不要急着移动这匹马，它正在替车封住关键出口。'),
 make('side-tiger','侧面虎 · 护车近将','马炮杀法','mate',[...kings(4,5),['n','red','n',6,3],['r','red','r',0,1]],[['r',5,1,'车贴近黑将将军，侧面的马保护这辆车。黑将不能吃车，也不能进入红帅控制的中线。']],'车可以贴将，但落点必须得到马的保护。','贴身将军前，先问一句：我的车有根吗？'),
 make('corner-control','八角马 · 封住斜门','马炮杀法','mate',[...kings(3,5),['n','red','n',3,2],['r','red','r',8,3]],[['r',5,3,'车转到黑将所在竖线将军。九宫角上的马封住底线中点和将的前方，配合车完成将杀。']],'保留角上的马，把车转到黑将所在的线。','马不必亲自将军，也可以靠控制出口帮助取胜。'),
 make('twin-horses','双马配合 · 一攻一守','马炮杀法','mate',[...kings(3,4),['n','red','n',0,2],['n2','red','n',6,2]],[['n',2,1,'左马入卧槽将军，右马控制宫心与右侧，红帅封左侧。两匹马各有任务。']],'用左马进攻，右马继续看住出口。','这是双马协作的简化练习；实战中每匹马的腿都必须畅通。'),
 make('two-pawns','双兵入宫 · 互相保护','车兵杀法','mate',[...kings(5,4),['p','red','p',3,1],['p2','red','p',4,2]],[['p2',4,1,'中兵前进一步将军，旁边的兵保护它，并封住左侧；红帅借照面规则封住右侧。']],'两个兵靠近后能互保，先进中兵。','过河兵能横着控制相邻位置，两个兵可以相互接应。'),
 make('heart-pawn','小刀剜心 · 兵吃宫心士','车兵杀法','mate',[...kings(3,4),['a','black','a',4,1],['p','red','p',3,1],['p2','red','p',5,1]],[['p',4,1,'左兵横吃宫心士，直接威胁黑将。右兵保护宫心兵并封右侧，红帅封左侧，完成将杀。']],'过河兵能横吃；宫心的士是突破口。','兵深入九宫后，吃掉关键守子可能比追吃大子更有力量。'),
 make('iron-bolt','铁门栓 · 守子不能动','配合杀法','mate',[...kings(3,4),['a','black','a',4,1],['b','black','b',4,2],['c','red','c',4,5],['r','red','r',0,3]],[['r',0,0,'车到底线将军。士或象若离开中路挡车，会只剩一个炮架，中炮随即将军；因此无法有效解围。']],'中炮看似没将军，其实限制了士象的移动。','被牵制的守子不能随便离开防线。'),
 make('double-check','双将 · 两路同时进攻','配合杀法','mate',[...kings(3,4),['a','black','a',3,0],['a2','black','a',5,0],['n','red','n',4,2],['r','red','r',4,4]],[['n',2,1,'马跳开后自身将军，又露出身后车的直线攻击。挡住车仍挡不住马，黑将也没有安全位置。']],'移开车前的马，同时让马也攻击黑将。','应对双将必须同时消除两路威胁，不能只盯着一个攻击子。'),
 make('open-leg','拔簧马 · 先松开马腿','配合杀法','mate',[...kings(3,4),['n','red','n',2,1],['r','red','r',3,1],['p','red','p',5,1]],[['r',4,1,'车平到宫心将军，同时腾开马腿，马也开始将军。红兵保护车并封右路，红帅封左路。']],'车正堵着自己的马腿，移动车可以一举两得。','挪开挡路的子，可能让原本没有威胁的马突然发挥作用。'),
 make('stalemate','困毙 · 不将军也能赢','残局要点','stalemate',[...kings(4,5),['r','red','r',0,2]],[['r',0,1,'车封住黑将的前方，但并未将军。黑将左边受到红帅照面规则限制，其他方向也不能走，形成困毙。']],'这题目标不是将军，而是让对方无合法走法。','象棋中无合法走法的一方判负；这与国际象棋的逼和规则不同。'),
 make('horse-fork','马捉双 · 将军再得车','得子解围','gain',[...kings(5,4),['r','black','r',0,0],['n','red','n',3,3]],[['n',2,1,'马同时攻击黑将和左下角的黑车。黑方必须先应将，无法先把车撤走。'],['bk',3,0,'演示黑将向左躲开；若将改走宫心，红马下一步仍可吃车。'],['n',0,0,'红马吃掉黑车，完成先将军、后得子的捉双路线。']],'找一个马的位置，可以同时攻击将和车。','对方被将军时必须先解围，这给你下一步吃子创造机会。'),
 make('pin','牵制 · 让马不敢离线','得子解围','technique',[...kings(3,4),['n','black','n',4,2],['r','red','r',0,4]],[['r',4,4,'车转到马与将的同一条线上。马若直接跳开，会暴露黑将；黑方需要先移动将或另找解围办法。']],'把车、黑马、黑将排成一条直线。','牵制限制对手活动，但不等于马上能吃到这匹马。'),
 make('capture-attacker','解将之一 · 吃掉攻击子','得子解围','escape',[...kings(4,3),['r','black','r',4,5],['rr','red','r',0,5]],[['rr',4,5,'红车吃掉正在将军的黑车，竖线上的威胁消失，红帅安全。']],'先检查能否直接吃掉正在将军的棋子。','被将军时先解将，不能继续走与帅安全无关的棋。'),
 make('block-check','解将之二 · 垫子挡车','得子解围','escape',[...kings(4,3),['r','black','r',4,3],['rr','red','r',0,8]],[['rr',4,8,'车挡在黑车与红帅之间，切断攻击线。这个落点还受到红帅保护，黑车不能白吃挡路的红车。']],'挡路的棋子最好有根，选靠近红帅的交点。','挡车可解除直线将军；炮将军则要特别计算炮架数量。'),
 make('king-escape','解将之三 · 移帅避锋','得子解围','escape',[...kings(4,3),['r','black','r',4,3]],[['rk',5,9,'红帅横走到右侧，离开黑车的攻击线。左边会与黑将照面，因此不能走。']],'先排除将帅照面的方向，再找安全位置。','帅的每个候选落点都要检查，不能只看眼前的将军子。'),
 make('remove-screen','撤炮架 · 让炮打不着','得子解围','escape',[...kings(4,3),['c','black','c',4,0],['n','red','n',4,6]],[['n',6,5,'马离开中线，黑炮与红帅之间不再有炮架。炮不能隔零枚棋子吃帅，因此将军解除。']],'红马正充当对方的炮架，试着把它移走。','解炮将可以吃炮、移帅，也可以改变炮架数量。'),
 make('block-leg','蹩马腿 · 化解马将','得子解围','escape',[...kings(4,3),['n','black','n',3,7],['r','red','r',0,8]],[['r',3,8,'车占住黑马迈出第一步的位置，堵住马腿，黑马暂时不能攻击红帅。']],'找出黑马攻击红帅时先经过哪一格。','马的攻击不是跳过所有障碍；堵住对应的马腿就能解除这一方向的攻击。'),
];
export const goalText:Record<Puzzle['goal'],string>={mate:'完成将杀',stalemate:'造成困毙',gain:'将军得车',escape:'解除将军',technique:'形成牵制'};
export function notation(board:Piece[],m:Move){const p=board.find(p=>p.id===m.id)!;return `${p.side==='red'?'红':'黑'}${names[p.side][p.kind]}：${p.x+1}路${p.y+1}行 → ${m.x+1}路${m.y+1}行`;}
export function puzzleFrames(p:Puzzle){const result=[p.board];for(const s of p.line)result.push(apply(result[result.length-1],s.move));return result;}
export function isMate(board:Piece[]){return board.some(p=>p.side==='black'&&p.kind==='k')&&inCheck(board,'black')&&!moves(board,'black').length;}
export function attemptPuzzle(p:Puzzle,board:Piece[],ply:number,m:Move):{accepted:boolean;complete:boolean;message:string}{
 const piece=board.find(q=>q.id===m.id);if(!piece||piece.side!=='red')return {accepted:false,complete:false,message:'请先选一枚红方棋子。'};
 const issue=reason(board,piece,m.x,m.y);if(issue)return {accepted:false,complete:false,message:issue};
 const next=apply(board,m),s=p.line[ply],matches=s&&m.id===s.move.id&&m.x===s.move.x&&m.y===s.move.y;
 const alternative=p.goal==='mate'?isMate(next):p.goal==='stalemate'?!inCheck(next,'black')&&!moves(next,'black').length:p.goal==='escape'?!inCheck(next,'red'):false;
 if(matches||alternative)return {accepted:true,complete:!!alternative||ply===p.line.length-1,message:matches?s.why:'这步也达成了本关目标，是另一种有效解法。'};
 return {accepted:false,complete:false,message:'这是合法走法，但还没有走出本关目标的参考路线。棋盘已保留，可以继续尝试，或打开提示与答案。'};
}
