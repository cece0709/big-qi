import {opponent} from './difficulty';
self.onmessage=({data})=>{try{self.postMessage({move:opponent(data.board,data.side,data.difficulty)});}catch{self.postMessage({error:true});}};
