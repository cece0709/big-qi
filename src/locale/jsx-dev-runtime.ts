import {jsxDEV as base,Fragment} from 'react/jsx-dev-runtime';
import {LocalizedElement} from './element';
export {Fragment};
export type {JSX} from 'react/jsx-dev-runtime';
export const jsxDEV:typeof base=(type,props,key,staticChildren,source,self)=>typeof type==='string'?base(LocalizedElement,{...(props as object),tag:type},key,staticChildren,source,self):base(type,props,key,staticChildren,source,self);
