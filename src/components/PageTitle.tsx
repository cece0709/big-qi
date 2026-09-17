/* Copyright (c) 2026 Celia. All rights reserved. */
export default function PageTitle({tag,title,description}:{tag:string;title:string;description:string}){return <div className="page-title"><div className="eyebrow"><span/>{tag}</div><h1>{title}</h1><p>{description}</p></div>}

