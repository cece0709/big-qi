/* Copyright (c) 2026 Celia. All rights reserved. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {LanguageProvider,LanguageSelector} from './locale/context';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><LanguageSelector/><App/></LanguageProvider></React.StrictMode>);

if('serviceWorker' in navigator && import.meta.env.PROD){window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js').then(reg=>{const notify=()=>{if(reg.waiting)window.dispatchEvent(new CustomEvent('yijian-update',{detail:reg}));};notify();reg.addEventListener('updatefound',()=>{const installing=reg.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)notify();});});}).catch(error=>console.warn('Offline cache unavailable',error));});}
