/* Copyright (c) 2026 Celia. All rights reserved. */
import {analyze} from './teaching';
import {analyzeResearch} from './research';
self.onmessage=({data})=>{try{self.postMessage({advice:data.research?analyzeResearch(data.board,data.turn):analyze(data.board,data.turn)});}catch{self.postMessage({error:'分析暂时失败，请重新分析或调整棋局。'});}};
