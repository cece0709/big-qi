import {jsx as base,jsxs as bases,Fragment} from 'react/jsx-runtime';
import {LocalizedElement} from './element';
export {Fragment};
export type {JSX} from 'react/jsx-runtime';
export const jsx:typeof base=(type,props,key)=>typeof type==='string'?base(LocalizedElement,{...(props as object),tag:type},key):base(type,props,key);
export const jsxs:typeof bases=(type,props,key)=>typeof type==='string'?bases(LocalizedElement,{...(props as object),tag:type},key):bases(type,props,key);
