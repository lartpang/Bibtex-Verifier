(() => {
  "use strict";
  const B = window.BibLib;
  const CROSSREF_API="https://api.crossref.org/works",SS_MATCH="https://api.semanticscholar.org/graph/v1/paper/search/match",
    SS_SEARCH="https://api.semanticscholar.org/graph/v1/paper/search",SS_PAPER="https://api.semanticscholar.org/graph/v1/paper",SS_FIELDS="paperId,url,title,authors,year,venue,publicationVenue,externalIds",
    DBLP_API="https://dblp.org/search/publ/api",ARXIV_API="https://export.arxiv.org/api/query",
    OR_API="https://api2.openreview.net",ZENODO_API="https://zenodo.org/api/records",MAX_RETRIES=2,RETRY_MS=800,FETCH_TIMEOUT=8000;

  const rS={ssD:300,crD:80,dblpD:200,arxivD:200,orD:300,zenodoD:250,
    ssMn:200,ssMx:2000,crMn:50,crMx:1500,dblpMn:150,dblpMx:1500,arxivMn:150,arxivMx:1500,orMn:300,orMx:2000,zenodoMn:150,zenodoMx:2000,
    lSS:0,lCR:0,lDBLP:0,lArx:0,lOR:0,lZenodo:0,ssOk:0,crOk:0,dblpOk:0,arxivOk:0,orOk:0,zenodoOk:0};
  const rK={ss:{d:"ssD",mx:"ssMx",mn:"ssMn",ok:"ssOk",l:"lSS"},cr:{d:"crD",mx:"crMx",mn:"crMn",ok:"crOk",l:"lCR"},
    dblp:{d:"dblpD",mx:"dblpMx",mn:"dblpMn",ok:"dblpOk",l:"lDBLP"},arxiv:{d:"arxivD",mx:"arxivMx",mn:"arxivMn",ok:"arxivOk",l:"lArx"},
    or:{d:"orD",mx:"orMx",mn:"orMn",ok:"orOk",l:"lOR"},zenodo:{d:"zenodoD",mx:"zenodoMx",mn:"zenodoMn",ok:"zenodoOk",l:"lZenodo"}};
  function rBack(s){const k=rK[s];if(!k)return;rS[k.d]=Math.min(rS[k.d]*1.3,rS[k.mx]);rS[k.ok]=0;}
  function rSucc(s){const k=rK[s];if(!k)return;rS[k.ok]++;if(rS[k.ok]>=2){rS[k.d]=Math.max(rS[k.d]*0.85,rS[k.mn]);rS[k.ok]=0;}}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function gS(u){if(u.includes("semanticscholar.org"))return"ss";if(u.includes("crossref.org"))return"cr";if(u.includes("dblp.org"))return"dblp";if(u.includes("arxiv.org"))return"arxiv";if(u.includes("openreview.net"))return"or";if(u.includes("zenodo.org"))return"zenodo";return"cr";}

  let _authErrCb=null,_logCb=null;

  async function rF(url,{retries=MAX_RETRIES,is404=false,txt=false,headers={}}={}){
    const s=gS(url),k=rK[s],el=Date.now()-rS[k.l];if(el<rS[k.d])await sleep(rS[k.d]-el);rS[k.l]=Date.now();
    for(let a=0;a<=retries;a++){
      const ctrl=new AbortController(),tid=setTimeout(()=>ctrl.abort(),FETCH_TIMEOUT);
      try{
        const r=await fetch(url,{signal:ctrl.signal,headers});clearTimeout(tid);
        if(r.ok){rSucc(s);return txt?r.text():r.json();}
        if(r.status===404&&is404){_logCb?.("info",`HTTP 404 from ${s}; treated as no result`);return null;}
        if((r.status===401||r.status===403)&&s==="ss"){_authErrCb?.(s,r.status);return null;}
        if(r.status===429){rBack(s);if(a<retries){_logCb?.("retry",`Retry ${s} after HTTP 429 (${a+1}/${retries})`);await sleep(RETRY_MS*Math.pow(2,a));continue;}}
        _logCb?.("warning",`HTTP ${r.status} from ${s}; source returned no usable result`);
        return null;
      }catch(e){clearTimeout(tid);rBack(s);if(a<retries){_logCb?.("retry",`Retry ${s} after ${e?.name||"request error"} (${a+1}/${retries})`);await sleep(RETRY_MS*Math.pow(2,a));continue;}_logCb?.("warning",`Request failed for ${s}: ${e?.name||"error"}`);return null;}
    }return null;}

  function bU(b,p){const u=new URL(b);for(const[k,v]of Object.entries(p))u.searchParams.set(k,v);return u.toString();}
  function jP(url,{timeout=FETCH_TIMEOUT}={}){
    return new Promise((resolve,reject)=>{
      if(typeof document==="undefined"){reject(new TypeError("JSONP unavailable"));return;}
      const cb=`__bibDblpJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const u=new URL(url);u.searchParams.set("callback",cb);
      const s=document.createElement("script");let done=false;
      const clean=()=>{if(done)return;done=true;clearTimeout(tid);delete window[cb];s.remove();};
      window[cb]=data=>{clean();resolve(data);};
      s.onerror=()=>{clean();reject(new TypeError("JSONP load failed"));};
      const tid=setTimeout(()=>{clean();const e=new Error("JSONP timeout");e.name="AbortError";reject(e);},timeout);
      s.src=u.toString();document.head.appendChild(s);
    });}

  async function searchSSMatch(t,h){const d=await rF(bU(SS_MATCH,{query:t,fields:SS_FIELDS}),{is404:true,headers:h});if(!d?.data?.[0])return null;return B.ssToStandard(d.data[0]);}
  async function searchSSByDoi(doi,h){const d=await rF(bU(`${SS_PAPER}/${encodeURIComponent(`DOI:${doi}`)}`,{fields:SS_FIELDS}),{is404:true,headers:h});return d?[B.ssToStandard(d)]:[];}
  async function searchSSSearch(t,h){const d=await rF(bU(SS_SEARCH,{query:t,limit:"5",fields:SS_FIELDS}),{headers:h});return(d?.data||[]).map(B.ssToStandard);}
  async function searchCrossref(t){const d=await rF(bU(CROSSREF_API,{"query.title":t,rows:"5",select:"title,author,published-print,published-online,published,issued,container-title,group-title,event,volume,issue,page,DOI,publisher,URL,type,ISSN,ISBN"}));return(d?.message?.items||[]).map(B.crossrefToStandard);}
  async function searchCrossrefDoi(doi){const d=await rF(`${CROSSREF_API}/${encodeURIComponent(doi)}`);return d?.message?[B.crossrefToStandard(d.message)]:[];}
  async function searchDBLP(t){const d=await jP(bU(DBLP_API,{q:t,format:"jsonp",h:"5",c:"0"}),{timeout:12000});const h=d?.result?.hits?.hit;if(!h)return[];return(Array.isArray(h)?h:[h]).map(x=>B.dblpToStandard(x.info)).filter(Boolean);}
  async function searchZenodo(t,e){
    const zd=B.zenodoDoiFromEntry?B.zenodoDoiFromEntry(e):"";
    const q=zd?`doi:"${zd}"`:`title:"${t.replace(/"/g," ")}"`;
    const d=await rF(bU(ZENODO_API,{q,size:"5",sort:"bestmatch"}));
    return(d?.hits?.hits||[]).map(B.zenodoToStandard).filter(p=>p.title);}
  function parseArxivXml(xml){
    if(!xml)return[];const papers=[],eR=/<entry>([\s\S]*?)<\/entry>/g;let em;
    while((em=eR.exec(xml))!==null){const ex=em[1],tM=/<title[^>]*>([\s\S]*?)<\/title>/i.exec(ex),iM=/<id>([\s\S]*?)<\/id>/i.exec(ex),pM=/<published>([\s\S]*?)<\/published>/i.exec(ex);
      const aR=/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g,auths=[];let am;while((am=aR.exec(ex))!==null)auths.push(am[1].trim());
      const aid=(iM?.[1]||"").replace(/^https?:\/\/arxiv\.org\/abs\//i,"").replace(/v\d+$/i,""),pt=(tM?.[1]||"").replace(/\s+/g," ").trim(),yr=pM?pM[1].slice(0,4):"";
      const sourceUrl=aid?`https://arxiv.org/abs/${aid}`:(iM?.[1]||"");
      papers.push({title:pt,author:auths.map(n=>{const p=n.split(/\s+/).filter(Boolean);return p.length>=2?`${p[p.length-1]}, ${p.slice(0,-1).join(" ")}`:n;}).join(" and "),year:yr,journal:aid?`arXiv preprint arXiv:${aid}`:"arXiv preprint",volume:"",number:"",pages:"",doi:aid?`10.48550/arXiv.${aid}`:"",publisher:"",url:sourceUrl,_source:"arxiv",_source_url:sourceUrl});}return papers;}
  async function searchArxivById(id){
    if(!id)return[];
    const xml=await rF(bU(ARXIV_API,{id_list:id,start:"0",max_results:"1"}),{txt:true});
    return parseArxivXml(xml);}
  async function searchArxiv(t){
    const xml=await rF(bU(ARXIV_API,{search_query:`ti:"${t}"`,start:"0",max_results:"5",sortBy:"relevance",sortOrder:"descending"}),{txt:true});
    return parseArxivXml(xml);}
  async function searchOR(t){try{const d=await rF(bU(`${OR_API}/notes/search`,{term:t,limit:"5"}));return(d?.notes||[]).map(n=>B.openreviewToStandard(n)).filter(p=>p.title);}catch{return[];}}

  async function checkExternalUrl(url){
    if(!/^https?:\/\//i.test(String(url||"")))return false;
    for(const opts of [{method:"HEAD"},{method:"GET",mode:"no-cors"}]){
      const ctrl=new AbortController(),tid=setTimeout(()=>ctrl.abort(),FETCH_TIMEOUT);
      try{
        const r=await fetch(url,{...opts,signal:ctrl.signal});
        clearTimeout(tid);
        if(r.type==="opaque"||r.ok)return true;
        if(r.status>=400)return false;
      }catch{clearTimeout(tid);}
    }
    return false;
  }

  function linkCandidate(entry,url){
    const c={...entry};
    c.title=c.title||"";
    c.url=url;
    c._source="link_check";
    c._source_url=url;
    return c;
  }

  function hasStrongPublished(candidates,ct){
    return candidates.some(c=>!B.isArxivCandidate(c)&&B.classifyVersion(c)!=="preprint"&&B.titleSimilarity(ct,c.title||"")>=B.TITLE_MATCH_THRESHOLD);}
  function bestPreprintCandidate(candidates,ct){
    const preprints=candidates.filter(c=>(B.isArxivCandidate(c)||B.classifyVersion(c)==="preprint")&&B.titleSimilarity(ct,c.title||"")>=B.MIN_TITLE_SIM);
    return rankCandidates({},ct,preprints)[0]||null;}

  async function lookupTiered(title,entry,logFn,getEngines,getApiKey){
    _logCb=logFn;
    const enabled=new Set(getEngines()),ct=B.stripLatex(title||entry?.title||entry?.ID||"");
    enabled.add("zenodo");enabled.add("arxiv");
    const ssKey=getApiKey?getApiKey("semantic_scholar"):"";
    const ssH=ssKey?{"x-api-key":ssKey}:{};
    const allCandidates=[],seen=new Set();
    function addCandidates(list){let added=0;for(const c of list){const k=(B.normalizeTitle(c.title||""))+"||"+(c._source||"");if(!seen.has(k)){seen.add(k);allCandidates.push(c);added++;}}return added;}
    function logDisabled(id,label){if(!enabled.has(id))logFn("skip",`Skipped ${label}: disabled`);}
    function candidateMatches(c){const doi=B.doiFromEntry?B.doiFromEntry(entry):"";return c?(c._source==="link_check"||B.titleSimilarity(ct,c.title||"")>=B.MIN_TITLE_SIM||(doi&&B.normalizeDoi&&B.normalizeDoi(c.doi)===doi)):false;}
    function finalize(){const ranked=rankCandidates(entry,ct,allCandidates).filter(candidateMatches).slice(0,8);if(!ranked.length){logFn("warning",`Not found: ${ct.slice(0,50)}`);return{best:null,candidates:[]};}ranked.slice(0,3).forEach((c,i)=>logFn("candidate",`Candidate #${i+1} ${c._source||"unknown"} ${Math.round(B.titleSimilarity(ct,c.title||""))}%: ${(c.title||"").slice(0,70)}`));logFn("decision",`Selected ${ranked[0]._source||"unknown"}: ${(ranked[0].title||"").slice(0,70)}`);return{best:ranked[0],candidates:ranked};}
    async function addSource(label,fn){try{logFn("query",`${label}: ${ct.slice(0,55)}`);const r=await fn();logFn("info",`${label} returned ${r.length} raw candidates`);logFn("info",`${label} added ${addCandidates(r)} unique candidates`);return r;}catch(e){logFn("warning",`${label} failed: ${e?.message||e?.name||"error"}`);return[];}}

    if(B.isLikelyNonPublicationEntry&&B.isLikelyNonPublicationEntry(entry)){
      const url=B.urlFromEntry(entry);
      logFn("query",`Link check: ${url}`);
      if(await checkExternalUrl(url)){
        addCandidates([linkCandidate(entry,url)]);
        return finalize();
      }
      logFn("warning",`Link check failed: ${url}`);
      return{best:null,candidates:[]};
    }

    if(B.hasZenodoSignal&&B.hasZenodoSignal(entry)){
      await addSource("Zenodo",()=>searchZenodo(ct,entry).catch(()=>[]));
      if(hasStrongPublished(allCandidates,ct))return finalize();
    }else logFn("skip","Skipped Zenodo: no Zenodo signal in entry");

    logDisabled("crossref","T1 CrossRef");logDisabled("semantic_scholar","T1 S2");logDisabled("dblp","T1 DBLP");
    if(enabled.has("crossref")){
      await addSource("T1 CrossRef",()=>searchCrossref(ct).catch(()=>[]));
      if(hasStrongPublished(allCandidates,ct))return finalize();
    }
    if(enabled.has("semantic_scholar")){
      await addSource("T1 S2",async()=>{
        const sm=await searchSSMatch(ct,ssH);
        if(sm&&B.titleSimilarity(ct,sm.title||"")>=B.MIN_TITLE_SIM)return[sm];
        return searchSSSearch(ct,ssH).catch(()=>[]);
      });
      if(hasStrongPublished(allCandidates,ct))return finalize();
    }
    if(enabled.has("dblp")){
      await addSource("T1 DBLP",()=>searchDBLP(ct).catch(()=>[]));
      if(hasStrongPublished(allCandidates,ct))return finalize();
    }

    const doi=B.doiFromEntry?B.doiFromEntry(entry):"";
    if(doi&&!B.isArxivDoi(doi)&&!hasStrongPublished(allCandidates,ct)){
      const idTasks=[];
      if(enabled.has("crossref"))idTasks.push(searchCrossrefDoi(doi).then(r=>{logFn("query",`ID CrossRef DOI: ${doi}`);return r;}).catch(()=>[]));
      if(enabled.has("semantic_scholar"))idTasks.push(searchSSByDoi(doi,ssH).then(r=>{logFn("query",`ID S2 DOI: ${doi}`);return r;}).catch(()=>[]));
      const idResults=(await Promise.all(idTasks)).flat();
      logFn("info",`Identifier lookup returned ${idResults.length} raw candidates`);
      logFn("info",`Identifier lookup added ${addCandidates(idResults)} unique candidates`);
      if(hasStrongPublished(allCandidates,ct))return finalize();
    }else if(doi&&B.isArxivDoi(doi))logFn("skip",`Skipped published DOI lookup for arXiv DOI: ${doi}`);
    else logFn("skip","Skipped DOI lookup: no DOI in entry");

    if(!hasStrongPublished(allCandidates,ct)){
      logDisabled("openreview","OpenReview");
      if(enabled.has("openreview")){
        await addSource("OpenReview",()=>searchOR(ct).catch(()=>[]));
        if(hasStrongPublished(allCandidates,ct))return finalize();
      }
    }

    if(!hasStrongPublished(allCandidates,ct)){
      const preprint=bestPreprintCandidate(allCandidates,ct);
      const arxivId=(B.arxivIdFromEntry?B.arxivIdFromEntry(entry):"")||(preprint&&B.arxivIdFromEntry?B.arxivIdFromEntry(preprint):"");
      if(arxivId)await addSource("arXiv ID",()=>searchArxivById(arxivId).catch(()=>[]));
      else if(preprint?.title)await addSource("arXiv preprint title",()=>searchArxiv(preprint.title).catch(()=>[]));
      else await addSource("arXiv final title",()=>searchArxiv(ct).catch(()=>[]));
    }

    return finalize();}

  function rankCandidates(entry,ct,candidates){
    const oy=parseInt(entry.year||"0",10);
    const isPub=c=>!B.isArxivCandidate(c)&&B.classifyVersion(c)!=="preprint";
    return[...candidates].sort((a,b)=>{
      const tsA=B.titleSimilarity(ct,a.title||""),tsB=B.titleSimilarity(ct,b.title||"");
      // tiebreak 1: published before preprint
      const pA=isPub(a)?1:0,pB=isPub(b)?1:0;
      if(pB!==pA&&tsA>=B.MIN_TITLE_SIM&&tsB>=B.MIN_TITLE_SIM)return pB-pA;
      if(Math.abs(tsB-tsA)>0.5)return tsB-tsA;
      // tiebreak 2: closer year
      if(oy>0){const dyA=a.year?Math.abs(parseInt(a.year,10)-oy):999,dyB=b.year?Math.abs(parseInt(b.year,10)-oy):999;if(dyA!==dyB)return dyA-dyB;}
      return tsB-tsA;
    });}

  function selBest(o,cs){if(!cs.length)return null;if(cs.length===1)return cs[0];const oy=parseInt(o.year||"0",10),s=[...cs];
    if(oy>0)s.sort((a,b)=>Math.abs(parseInt(a.year||"0",10)-oy)-Math.abs(parseInt(b.year||"0",10)-oy));
    else{const ot=B.normalizeTitle(o.title||"");s.sort((a,b)=>B.titleSimilarity(ot,b.title||"")-B.titleSimilarity(ot,a.title||""));}return s[0];}
  window.BibVerify={lookupTiered,rS,rK,rBack,rSucc,setAuthErrCb(cb){_authErrCb=cb;}};
})();
