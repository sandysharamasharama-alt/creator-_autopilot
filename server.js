import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(), PORT=process.env.PORT||3000;
const dbFile=path.join(__dirname,"data","db.json");
const seed={settings:{brandName:"Creator Autopilot",niche:"AI & Technology",timezone:"Asia/Kolkata",autoPilot:false,dailyPosts:1},posts:[],connections:{youtube:false,instagram:false,facebook:false}};
const read=()=>{if(!fs.existsSync(dbFile))fs.writeFileSync(dbFile,JSON.stringify(seed,null,2));return JSON.parse(fs.readFileSync(dbFile,"utf8"))};
const write=d=>fs.writeFileSync(dbFile,JSON.stringify(d,null,2));
app.use(express.json({limit:"5mb"})); app.use(express.static(__dirname)));

app.get("/api/health",(_,r)=>r.json({ok:true,version:"2.0.0"}));
app.get("/api/dashboard",(_,r)=>{const d=read();const p=d.posts;r.json({
 stats:{posts:p.length,published:p.filter(x=>x.status==="Published").length,scheduled:p.filter(x=>x.status==="Scheduled").length,views:p.reduce((a,x)=>a+Number(x.views||0),0)},
 posts:p,settings:d.settings,connections:d.connections
})});
app.get("/api/posts",(_,r)=>r.json(read().posts));
app.post("/api/posts",(q,r)=>{const d=read(),b=q.body;if(!b.title?.trim())return r.status(400).json({error:"Title required"});
 const p={id:Date.now(),title:b.title.trim(),platform:b.platform||"YouTube",status:b.status||"Draft",date:b.date||"",script:b.script||"",caption:b.caption||"",views:0};
 d.posts.unshift(p);write(d);r.status(201).json(p)});
app.patch("/api/posts/:id",(q,r)=>{const d=read(),p=d.posts.find(x=>String(x.id)===q.params.id);if(!p)return r.status(404).json({error:"Not found"});Object.assign(p,q.body);write(d);r.json(p)});
app.delete("/api/posts/:id",(q,r)=>{const d=read();d.posts=d.posts.filter(x=>String(x.id)!==q.params.id);write(d);r.json({ok:true})});

const ideas=n=>[`3 ${n} secrets nobody tells beginners`,`5 ${n} tools worth trying this week`,`I tested the latest ${n} workflow`,`7 mistakes creators make with ${n}`,`The fastest way to learn ${n}`];
app.post("/api/ai/ideas",(q,r)=>r.json({provider:process.env.OPENAI_API_KEY?"configured":"demo",ideas:ideas(q.body.niche||read().settings.niche)}));
app.post("/api/ai/script",(q,r)=>{const t=q.body.title||"Your next video";r.json({provider:process.env.OPENAI_API_KEY?"configured":"demo",title:t,hook:`Stop scrolling: here is what you need to know about ${t}.`,script:`HOOK\\n${t}\\n\\nBODY\\n1. Explain the problem.\\n2. Give three useful points.\\n3. Show a practical example.\\n4. End with one clear takeaway.\\n\\nCTA\\nFollow for more, save this post, and share it with another creator.`})});
app.post("/api/ai/caption",(q,r)=>r.json({caption:`${q.body.title||"New post"} 🚀\\n\\nHere are the key ideas you need to know. Save this for later and follow for more.\\n\\n#AI #Creators #ContentCreation`}));
app.post("/api/ai/plan",(q,r)=>{const d=read(),n=q.body.niche||d.settings.niche;const out=ideas(n).slice(0,Math.max(1,Math.min(7,Number(q.body.days)||7))).map((title,i)=>({title,platform:["YouTube","Instagram","Facebook"][i%3],date:new Date(Date.now()+i*86400000).toISOString().slice(0,10)}));r.json({plan:out})});

app.post("/api/settings",(q,r)=>{const d=read();d.settings={...d.settings,...q.body};write(d);r.json(d.settings)});
app.post("/api/connections/:platform",(q,r)=>{const d=read(),p=q.params.platform;if(!(p in d.connections))return r.status(400).json({error:"Unsupported platform"});d.connections[p]=!!q.body.connected;write(d);r.json({platform:p,connected:d.connections[p]})});
app.post("/api/publish/:platform",(q,r)=>{const p=q.params.platform,d=read();if(!d.connections[p])return r.status(400).json({error:`${p} is not connected`});r.status(501).json({error:"Real OAuth/upload adapter required before publishing.",platform:p})});

app.use((_,r)=>r.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log(`Creator Autopilot v2: http://localhost:${PORT}`));
