/* Copyright (c) 2026 Celia. All rights reserved. */
import type {Piece,Side,Move} from './game/rules';
export type Page='home'|'play'|'learn'|'puzzles'|'review'|'teaching';
export type RecordStep={board:Piece[];turn:Side;label:string;last?:Move};
