/* Copyright (c) 2026 Celia. All rights reserved. */
import {Chess,type InputMove,type PieceSymbol} from './engine';
export const lessons:Record<PieceSymbol,{name:string;rule:string;tip:string}>={
 k:{name:'王 · 全局的核心',rule:'每次向任何方向走一格。王不能走进受攻击的格子，两位王不能相邻。',tip:'将死是王被攻击且无合法解救方式；对局通过将死结束，不需要把王吃掉。'},
 q:{name:'后 · 纵横与斜线',rule:'横着、竖着、沿斜线走任意格，不能越过棋子。',tip:'后很强，但太早独自冲出去，容易被对方小子追赶。'},
 r:{name:'车 · 占住开放线',rule:'横着或竖着走任意格，不能越过棋子。',tip:'车在没有兵挡路的线路上更活跃；也能与王配合完成王车易位。'},
 b:{name:'象 · 斜线上的远行者',rule:'沿斜线走任意格，不能越过棋子。没有河界，也没有“象眼”的限制。',tip:'每只象始终留在同一种颜色的格子上，两只象可以照顾不同颜色。'},
 n:{name:'马 · 唯一能跳子的棋子',rule:'走日字：一边两格，另一边一格。可以跳过其他棋子，没有蹩马腿。',tip:'马在中央通常有更多可走的格子；一步同时攻击两枚棋子叫捉双。'},
 p:{name:'兵 · 小步向前，也能升变',rule:'向前一格，起始位置可以走两格，途中不能有子。吃子时向前斜走一格。',tip:'走到底线必须升变为后、车、象或马；兵不能后退。'},
};
export type ChessPuzzle={id:string;name:string;fen:string;goal:'mate'|'gain'|'pin'|'escape';hint:string;line:(InputMove&{why:string})[]};
const opening=new Chess();['e4','e5','Bc4','Nc6','Qh5','Nf6'].forEach(m=>opening.move(m));
export const chessPuzzles:ChessPuzzle[]=[
 {id:'queen-net',name:'后王协作 · 收拢最后一格',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',goal:'mate',hint:'把后靠近黑王，但让白王保护它。',line:[{from:'g6',to:'g7',why:'后到 g7 将军，白王保护后，后也封住黑王周围的格子，形成将死。'}]},
 {id:'back-rank',name:'底线将死 · 被兵堵住的王',fen:'6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',goal:'mate',hint:'黑王前面的兵堵住了退路，车可以侵入底线。',line:[{from:'e1',to:'e8',why:'车进入第八横线将军，黑王前方被自己的兵占据，无法躲到安全格。'}]},
 {id:'scholar',name:'瞄准 f7 · 象后配合',fen:opening.fen(),goal:'mate',hint:'白象已经瞄准 f7，后可以加入进攻。',line:[{from:'h5',to:'f7',why:'后吃掉 f7 的兵并将军，c4 的象保护后。黑王被自己的子挡住，不能逃离。'}]},
 {id:'smothered',name:'闷杀 · 马越过防线',fen:'6rk/6pp/8/6N1/8/8/8/K7 w - - 0 1',goal:'mate',hint:'马可以跳子，用它攻击被己方棋子围住的王。',line:[{from:'g5',to:'f7',why:'马跳到 f7 攻击 h8 的王。王周围都是本方棋子，而马的攻击无法靠垫子挡住。'}]},
 {id:'ladder',name:'双车阶梯 · 交替进攻',fen:'8/4k3/R7/7R/8/8/8/K7 w - - 0 1',goal:'mate',hint:'先让右车在第七横线将军，左车继续封第六横线。',line:[{from:'h5',to:'h7',why:'右车将军，左车封住第六横线，黑王只能退向第八横线。'},{from:'e7',to:'e8',why:'演示黑王退到 e8；若退到 d8 或 f8，最后一手 Ra8 也能将死。'},{from:'a6',to:'a8',why:'左车进入第八横线，右车封住第七横线，形成双车阶梯将死。'}]},
 {id:'bishops',name:'双象封线 · 王来助攻',fen:'5B1k/5K2/8/8/8/3B4/8/8 w - - 0 1',goal:'mate',hint:'一只象封住 h7，另一只象到 g7 将军。',line:[{from:'f8',to:'g7',why:'g7 的象将军，d3 的象控制 h7，白王守住 g8 并保护进攻的象，黑王没有安全格。'}]},
 {id:'double-check',name:'双将 · 象与车同时出击',fen:'3qkb2/5p2/8/8/8/8/4B3/4R1K1 w - - 0 1',goal:'mate',hint:'把挡在车前的象移开，并让象也攻击黑王。',line:[{from:'e2',to:'b5',why:'象斜线将军，同时露出 e1 车的攻击。挡车不能挡象，黑王也没有安全位置。'}]},
 {id:'fork',name:'马捉双 · 将军后得车',fen:'2r1k3/7p/8/5N2/8/8/P7/K7 w - - 0 1',goal:'gain',hint:'找一格，马能同时攻击 e8 的王与 c8 的车。',line:[{from:'f5',to:'d6',why:'马在 d6 同时攻击黑王和黑车，黑方必须先应将。'},{from:'e8',to:'f8',why:'这里演示黑王走到 f8。其他应手仍要面对车被攻击的威胁。'},{from:'d6',to:'c8',why:'马吃掉车。在某些王的应手下，马可能被回吃；用马换车通常仍有子力收益。'}]},
 {id:'pin',name:'绝对牵制 · 马不能离线',fen:'4k3/4n3/8/8/8/8/8/R6K w - - 0 1',goal:'pin',hint:'让白车、黑马和黑王处在同一条竖线上。',line:[{from:'a1',to:'e1',why:'车对着 e 线上的马与王。马不能直接跳开，否则会让自己的王暴露在车的攻击下。'}]},
 {id:'block',name:'先救王 · 垫子解将',fen:'1k2r3/8/8/8/8/8/R7/4K3 w - - 0 1',goal:'escape',hint:'让白车挡在黑车与白王之间。',line:[{from:'a2',to:'e2',why:'白车挡住 e 线，解除将军。车还受到白王保护，黑车不能无代价吃掉它。'}]},
];
