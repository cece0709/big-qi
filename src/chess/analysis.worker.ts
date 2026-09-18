/* Copyright (c) 2026 Celia. All rights reserved. */
import {analyze} from './engine';
self.onmessage=({data})=>{try{self.postMessage({advice:analyze(data.state||data.fen)});}catch{self.postMessage({error:'暂时无法分析这个局面，请重新检查摆局。'});}};
