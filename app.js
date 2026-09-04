/* =========================================================================
   STATE
   ========================================================================= */
const S = {
  tab: 'upload',
  files: { conditions:null, varConditions:null, fvConditions:null, orders:[], loginHours:null, valinor:null },
  data: { conditions:[], varConditions:[], fvConditions:[], orders:[], loginHours:[], valinor:[], storeClosureLogins:[] },
  condMap:{}, varMap:{}, fvMap:{},
  rules: [],
  duplicates: [],      // groups of duplicate/near-duplicate hub names found in Conditions
  duplicateChoice: {},  // baseName -> chosen hub_name
  newStores: [],       // hub_names seen in Orders/LoginHours but missing from Conditions
  newStoreDraft: {},   // hub_name -> {rcType, minOrders, mgAmount, varPay}
  results: { mg:[], v:[], fv:[] },
  unmatchedSubtitles: [],
  weekLabel: '',
  computed:false,
  orderOnlyExcludedCount: 0,
  hubNameMap: {}, // raw hub_name found in Orders/Login Hours -> the Conditions hub_name it should be treated as
  storeClosureIncidents: [], // [{id, storeName, date, windows:[{start,end}], amountAddedMode:'Y'|'N', amountPerHour}]
  storeClosureUploadError: '',
  rc: { sheetNames:[], sheets:{}, selectedSheet:'' },
  rcReview: [],
  uploadErrors: { orders:'', loginHours:'', valinor:'' },
  condFilter: { rcType:'ALL', search:'' },
  varFilter: { search:'' },
  subtitleFilter: { search:'', showMatched:false },
  ruleFilter: { search:'' },
  resultsFilter: { search:'' },
  ephFilter: { search:'' },
  ordersFilter: { search:'' },
  loginHoursFilter: { search:'' }
};

const DEFAULT_RULES = [
  {pattern:"F+V_Weekly_Order Incentive", considered:"Y"},
  {pattern:"F+V_Weekly Pay", considered:"Y"},
  {pattern:"Daily_MinG Arrear", considered:"Y"},
  {pattern:"Weekly_Order_Incentive", considered:"Y"},
  {pattern:"Weekly_Order Incentive", considered:"N"},
  {pattern:"RBC", considered:"N"},
  {pattern:"Order_Pay", considered:"Y"},
  {pattern:"Order Pay", considered:"Y"},
  {pattern:"MinG Pay", considered:"Y"},
  {pattern:"Ming_Pay", considered:"Y"},
  {pattern:"Per Order_Incentive", considered:"Y"},
  {pattern:"Per Order Incentive", considered:"Y"},
  {pattern:"MG Arrear_Pay", considered:"N"},
  {pattern:"Distance_Pay", considered:"N"},
  {pattern:"Surge_Incentive", considered:"N"},
  {pattern:"Daily_Order Incentive", considered:"N"},
  {pattern:"Daily_Order_Incentive", considered:"N"},
  {pattern:"Loging_Incentive", considered:"N"},
  {pattern:"Loging Incentive", considered:"N"},
  {pattern:"LM Pay", considered:"N"},
  {pattern:"Onboarding_Adjustment", considered:"X"}
];

/* =========================================================================
   RULES PERSISTENCE (plain browser localStorage — this is a real deployed
   site, so normal browser storage works fine here)
   ========================================================================= */
const RULES_KEY = 'arrear-console-considered-rules';
function loadRules(){
  try{
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function saveRules(){
  try{ localStorage.setItem(RULES_KEY, JSON.stringify(S.rules)); }
  catch(e){ console.warn('Could not save rules to localStorage', e); }
}
function exportRulesFile(){
  const blob = new Blob([JSON.stringify(S.rules, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'considered-rules.json'; a.click();
  URL.revokeObjectURL(url);
}
function importRulesFile(file, cb){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      if(Array.isArray(parsed)) { S.rules = parsed; saveRules(); cb && cb(true); }
      else cb && cb(false);
    }catch(e){ cb && cb(false); }
  };
  reader.readAsText(file);
}

/* =========================================================================
   PARSING HELPERS
   ========================================================================= */
function excelSerialToDate(n){
  const utc = Math.round((n - 25569) * 86400 * 1000);
  return new Date(utc);
}
// Extracts a date object's LOCAL calendar date (year/month/day as displayed), not its
// UTC date. SheetJS (with cellDates:true) builds Date objects at local midnight for a
// plain Excel date cell — calling .toISOString() on that converts to UTC first, which
// silently rolls the date back by one day for anyone in a timezone ahead of UTC (e.g.
// India, UTC+5:30). This is why dates and login hours were shifting back a day.
function localDateStr(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function toDateStr(v){
  if(v===null||v===undefined||v==='') return '';
  if(v instanceof Date) return localDateStr(v);
  if(typeof v === 'number') return excelSerialToDate(v).toISOString().slice(0,10);
  const s = String(v).trim();
  // try yyyy-mm-dd already
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const d = new Date(s);
  if(!isNaN(d.getTime())) return localDateStr(d);
  return s;
}
// Like toDateStr, but keeps the full date+time instant (for Store Closure's
// first_seen/last_seen columns, which carry a real clock time, not just a date). Reuses
// the same timezone-safe excelSerialToDate math — it already handles any fractional
// serial (a whole day plus a time-of-day fraction) correctly, no truncation needed.
function toDateTimeVal(v){
  if(v===null||v===undefined||v==='') return null;
  if(v instanceof Date) return v;
  if(typeof v === 'number') return excelSerialToDate(v);
  const d = new Date(String(v).trim());
  return isNaN(d.getTime()) ? null : d;
}
function norm(s){ return (s===null||s===undefined) ? '' : String(s).trim(); }
// Rider IDs (and similar identifiers) sometimes export as "123" from one tool and
// "123.0" from another (a whole-number float rendered with a decimal). Left as plain
// strings, those two would never match when joining Orders/Login Hours/Valinor by rider
// ID, silently breaking the join with no error — exactly the kind of bug that shows up
// as "Login Hours is always 0" even though the file loaded fine. Strip a trailing
// ".0"/".00" etc. so both forms normalize to the same key.
function normId(s){
  let v = norm(s);
  if(/^\d+\.0+$/.test(v)) v = v.replace(/\.0+$/, '');
  return v;
}
function normHeader(h){ return String(h||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function findKey(rowKeys, candidates){
  const nk = rowKeys.map(k=>({raw:k, n:normHeader(k)}));
  for(const c of candidates){
    const cn = normHeader(c);
    const hit = nk.find(x=>x.n===cn);
    if(hit) return hit.raw;
  }
  return null;
}
function num(v){ const n = parseFloat(v); return isNaN(n)?0:n; }
// Distinguishes "blank cell" (no tier defined) from a genuine 0 threshold. Using num()
// for tier columns would turn a blank cell into 0, which then matches "orders>=0" for
// every rider and silently short-circuits the whole tier ladder to the wrong tier.
function numOrNull(v){
  if(v===null||v===undefined||String(v).trim()==='') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
// Some RC exports fill an unused tier column with a literal 0 instead of leaving it
// blank (confirmed directly against real hub data), while others genuinely leave it
// blank — both need to mean the same thing: "this tier doesn't apply". A tier beyond
// the first (O2, O3, ... O7) can never legitimately start at 0 orders (that would be
// indistinguishable from / lower than the first tier), so treating a 0 there as "not
// defined" is safe regardless of which way the source data represents it. Only the
// first tier (index 0) can legitimately be a real 0. Without this, the tier-scan (which
// checks tiers from the top down) matches a trailing 0 immediately, since "orders >= 0"
// is always true — silently short-circuiting the whole ladder to the wrong tier.
function normalizeTierArray(values){
  return values.map((v,i)=> (i>0 && v===0) ? null : v);
}

function parseWorkbookFirstSheet(ab){
  // cellDates is deliberately OFF: SheetJS's own serial->Date conversion is broken for
  // any timezone with a non-zero UTC offset (it can land nearly a full day early — e.g.
  // 11:59:50 PM the previous day in India, UTC+5:30). Reading the raw serial number and
  // converting it ourselves via excelSerialToDate (pure UTC arithmetic, no ambiguity)
  // avoids that bug entirely.
  const wb = XLSX.read(ab, {type:'array', cellDates:false});
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  return XLSX.utils.sheet_to_json(ws, {defval:null, raw:true});
}
function parseCSVText(text){
  const parsed = Papa.parse(text, {header:true, skipEmptyLines:true, dynamicTyping:false});
  return parsed.data;
}
async function readFileAsRows(file){
  const ext = file.name.split('.').pop().toLowerCase();
  if(ext==='csv' || ext==='tsv'){
    const text = await file.text();
    return parseCSVText(text);
  } else {
    const ab = await file.arrayBuffer();
    return parseWorkbookFirstSheet(ab);
  }
}

// Wraps file reading + normalizing with real diagnostics instead of silent failure.
// Returns {ok, rows, message}. On 0 usable rows, message explains exactly why
// (empty file, or the actual column headers found vs. what was expected) so the
// person doesn't have to open DevTools to figure out what went wrong.
async function loadAndDiagnose(file, normalizeFn, expectedColsDesc){
  let rawRows;
  try{
    rawRows = await readFileAsRows(file);
  }catch(e){
    return {ok:false, rows:[], message:'Could not read this file: '+e.message+'. Is it a valid .xlsx/.xls/.csv?'};
  }
  if(!rawRows || !rawRows.length){
    return {ok:false, rows:[], message:'This file has no data rows (the sheet may be empty, or data is on a different sheet than the first one).'};
  }
  let normalized;
  try{
    normalized = normalizeFn(rawRows);
  }catch(e){
    return {ok:false, rows:[], message:'Error while processing this file: '+e.message};
  }
  if(!normalized.length){
    const headersFound = Object.keys(rawRows[0]||{}).filter(h=>h!==undefined && h!==null && h!=='').join(', ') || '(no column headers detected)';
    return {ok:false, rows:[], message:'Found '+rawRows.length+' row(s), but none matched the expected columns. Expected columns like: '+expectedColsDesc+'. Columns actually found in your file: '+headersFound};
  }
  return {ok:true, rows:normalized, message:''};
}

/* =========================================================================
   RC WORKBOOK -> CONDITIONS / VAR CONDITIONS / F+V CONDITIONS GENERATOR
   Validated against real RC + Conditions files:
   - V-type and F+V/F+V1/F+V2/F+V3-type hubs: fully reliable, derived directly.
   - MG-type hubs: MG Amount + Var Pay are usually in RC (~85% of hubs); Min
     Orders is NOT reliably stored in RC for MG-type at all. Anything uncertain
     is flagged in the returned `review` list rather than silently guessed.
   ========================================================================= */
const RC_NON_WEEK_SHEETS = new Set(['rc changes','sheet7','rc conditions','rc details']);
function detectWeekSheets(sheetNames){
  return sheetNames.filter(n => !RC_NON_WEEK_SHEETS.has(String(n).trim().toLowerCase()));
}
async function readWorkbookAllSheetsAOA(file){
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, {type:'array', cellDates:false}); // see note in parseWorkbookFirstSheet
  const sheets = {};
  wb.SheetNames.forEach(name=>{
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:null, raw:true});
  });
  return {sheetNames: wb.SheetNames, sheets};
}
function findRCHeaderRow(aoa){
  for(let r=0;r<Math.min(6,aoa.length);r++){
    const row = aoa[r]||[];
    const c0 = (row[0]!==undefined && row[0]!==null) ? String(row[0]).toLowerCase().replace(/[^a-z]/g,'') : '';
    if(c0==='hubname') return r;
  }
  return -1;
}
function parseRCCell(v){
  if(v===null||v===undefined||v==='') return {num:null, text:null};
  if(typeof v === 'number') return {num:v, text:null};
  const s = String(v).trim();
  if(/^\d+(\.\d+)?(\s*\+\s*\d+(\.\d+)?)+$/.test(s)){
    const sum = s.split('+').reduce((a,x)=>a+parseFloat(x.trim()),0);
    return {num:sum, text:null};
  }
  const n = parseFloat(s);
  if(!isNaN(n) && String(n)===s) return {num:n, text:null};
  if(/[a-zA-Z]/.test(s)) return {num:null, text:s};
  const n2 = parseFloat(s);
  return {num: isNaN(n2)?null:n2, text: isNaN(n2)? s : null};
}
function generateFromRC(aoa, prevConditionsMap){
  prevConditionsMap = prevConditionsMap || {};
  const headerRowIdx = findRCHeaderRow(aoa);
  const result = {conditions:[], varConditions:[], fvConditions:[], review:[]};
  if(headerRowIdx===-1){
    result.review.push({hub_name:'(sheet)', reason:'Could not find a header row with "hub_name" in column A on this sheet — is this the right tab?'});
    return result;
  }
  for(let r=headerRowIdx+1; r<aoa.length; r++){
    const row = aoa[r]||[];
    const hub_name = (row[0]!==undefined && row[0]!==null) ? String(row[0]).trim() : '';
    if(!hub_name) continue;
    const rc_type = (row[2]!==undefined && row[2]!==null) ? String(row[2]).trim().toUpperCase() : '';
    if(!rc_type) continue;

    const O = []; for(let i=3;i<=9;i++) O.push(parseRCCell(row[i]));
    const MG = []; for(let i=10;i<=16;i++) MG.push(parseRCCell(row[i]));
    const VAR = []; for(let i=17;i<=23;i++) VAR.push(parseRCCell(row[i]));
    function n0(p){ return (p && p.num!==null) ? p.num : 0; }

    if(rc_type==='V'){
      const o1raw = n0(O[0]);
      let o1 = o1raw; if(!o1) o1 = 1;
      const Ofull = normalizeTierArray(O.map((p,i)=> i===0? o1 : (p.num!==null? p.num : null)));
      const Vfull = VAR.map((p,i)=> {
        if(i===0) return n0(VAR[0]);
        if(Ofull[i]===null || Ofull[i]===undefined) return null;
        return p.num!==null? p.num : null;
      });
      result.varConditions.push({hub_name, O:Ofull, V:Vfull});
      result.conditions.push({hub_name, rc_type:'V', min_orders:o1raw, mg_amount:0, var_pay:n0(VAR[0]),
        eph_eligible:false, eph_min_hours:59, eph_min_orders:80, eph_amount:6000});
      [...O,...VAR].forEach(p=>{ if(p && p.text) result.review.push({hub_name, reason:'Non-numeric RC value found: "'+p.text+'" — check manually.'}); });
    }
    else if(['F+V','F+V1','F+V2','F+V3'].includes(rc_type)){
      const o1 = n0(O[0]);
      const varPay = n0(VAR[0]);
      result.conditions.push({hub_name, rc_type, min_orders:o1, mg_amount:0, var_pay:varPay,
        eph_eligible:false, eph_min_hours:59, eph_min_orders:80, eph_amount:6000});
      // Confirmed tier count per type — F+V/F+V2 use exactly 5 tiers (O1..O5), F+V1/F+V3
      // use exactly 4 (O1..O4). Any value in an RC column beyond that is stray, not a
      // real extra tier (confirmed directly: a hub with an unintended non-zero value in
      // an O6 column was silently getting a wrong top-tier threshold as a result — the
      // real formulas for these types never reference a 6th/7th tier at all). Capping
      // here means such stray values can never again change a calculation, regardless
      // of which specific hub or week they show up in.
      const maxTiers = (rc_type==='F+V'||rc_type==='F+V2') ? 5 : 4;
      const Ofull = normalizeTierArray(O.map((p,i)=> i<maxTiers ? p.num : null));
      const Afull = MG.map((p,i)=> i<maxTiers ? p.num : null);
      // Confirmed top-tier behavior directly against real numbers (not the source Excel,
      // which has a bug here): F+V/F+V1/F+V2/F+V3 all continue past their top tier as
      // (flat tier amount) + (orders beyond threshold) x Var Pay — no flat bonus, except
      // plain F+V which uses its own confirmed MAX(...) shape instead. bonus_flat stays
      // 0 here; it's only meant for a manual per-hub override via a hand-uploaded F+V
      // Conditions file, not something RC or these formulas ever produce automatically.
      result.fvConditions.push({hub_name, rc_type, O:Ofull, A:Afull, bonus_flat:0, bonus_rate:null});
      [...O,...MG,...VAR].forEach(p=>{ if(p && p.text) result.review.push({hub_name, reason:'Non-numeric RC value found: "'+p.text+'" — check manually.'}); });
    }
    else if(rc_type==='MG'){
      const var2 = n0(VAR[1]);
      const var1 = n0(VAR[0]);
      const usedDefaultVarPay = !var2 && !var1;
      const varPay = var2 || var1 || 50;
      // Find the first non-zero MG tier (MG1..MG7) and use its paired O-threshold as
      // Min Orders. RC often leaves MG1 blank for a hub while the real rate sits in
      // MG2 (or later) — checking MG1 alone was missing these entirely.
      let tierIdx = -1;
      for(let i=0;i<7;i++){ if(n0(MG[i])>0){ tierIdx = i; break; } }
      let min_orders, mg_amount;
      const prev = prevConditionsMap[hub_name];
      if(tierIdx!==-1){
        mg_amount = n0(MG[tierIdx]);
        min_orders = n0(O[tierIdx]);
        if(tierIdx>0){
          result.review.push({hub_name, reason:'RC has MG1 blank but MG'+(tierIdx+1)+' populated — used O'+(tierIdx+1)+' as Min Orders and MG'+(tierIdx+1)+' as MG Amount. Verify this is correct.'});
        }
        if(usedDefaultVarPay){
          result.review.push({hub_name, reason:'RC has no Var Pay value for this hub — defaulted to 50 (the most common rate). Verify this is correct.'});
        }
      } else if(prev){
        min_orders = prev.min_orders; mg_amount = prev.mg_amount;
        result.review.push({hub_name, reason:'RC has no rate data for this MG hub this week — carried forward from last week\'s Conditions file. Confirm it\'s still correct.'});
      } else {
        min_orders = 0; mg_amount = 0;
        result.review.push({hub_name, reason:'RC has no rate data for this MG hub, and no previous-week Conditions file was supplied — left at 0. Fill in manually.'});
      }
      result.conditions.push({hub_name, rc_type:'MG', min_orders, mg_amount, var_pay:varPay,
        eph_eligible:false, eph_min_hours:59, eph_min_orders:80, eph_amount:6000});
    }
    else {
      result.review.push({hub_name, reason:'Unrecognised RC Type "'+rc_type+'" — add this hub manually.'});
    }
  }
  return result;
}

/* =========================================================================
   NORMALIZERS  -> convert raw parsed rows into a clean canonical shape
   ========================================================================= */
function normalizeConditions(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const hub = findKey(keys,['hub_name','hub']);
    const rct = findKey(keys,['rc type','rctype','type']);
    const minO = findKey(keys,['min orders','minorders']);
    const mgAmt = findKey(keys,['mg amount','mgamount']);
    const varPay = findKey(keys,['var pay','varpay']);
    const ephElig = findKey(keys,['eph eligible','epheligible']);
    const ephHrs = findKey(keys,['eph min hours','eph min login hours']);
    const ephOrd = findKey(keys,['eph min orders']);
    const ephAmt = findKey(keys,['eph amount']);
    return {
      hub_name: norm(r[hub]),
      rc_type: norm(r[rct]).toUpperCase(),
      min_orders: num(r[minO]),
      mg_amount: num(r[mgAmt]),
      var_pay: num(r[varPay]),
      eph_eligible: (norm(r[ephElig]).toUpperCase()==='Y'),
      eph_min_hours: ephHrs? num(r[ephHrs]) : 59,
      eph_min_orders: ephOrd? num(r[ephOrd]) : 80,
      eph_amount: ephAmt? num(r[ephAmt]) : 6000
    };
  }).filter(r=>r.hub_name);
}
function normalizeVarConditions(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const hub = findKey(keys,['hub_name','hub']);
    const O=[],V=[];
    for(let i=1;i<=7;i++){
      const ok = findKey(keys,['o'+i]);
      const vk = findKey(keys,['var'+i]);
      O.push(ok? numOrNull(r[ok]) : null);
      V.push(vk? numOrNull(r[vk]) : null);
    }
    return {hub_name:norm(r[hub]), O:normalizeTierArray(O), V};
  }).filter(r=>r.hub_name);
}
function normalizeFVConditions(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const hub = findKey(keys,['hub_name','hub']);
    const rct = findKey(keys,['rc type','rctype','type']);
    const bonusFlat = findKey(keys,['bonus flat','bonusflat','top bonus']);
    const bonusRateOverride = findKey(keys,['bonus rate','var pay override']);
    const O=[],A=[];
    for(let i=1;i<=7;i++){
      const ok = findKey(keys,['o'+i]);
      const ak = findKey(keys,['amt'+i,'mg'+i]);
      O.push(ok? numOrNull(r[ok]) : null);
      A.push(ak? numOrNull(r[ak]) : null);
    }
    const maxTiers = (norm(r[rct]).toUpperCase()==='F+V' || norm(r[rct]).toUpperCase()==='F+V2') ? 5 : 4;
    return {
      hub_name:norm(r[hub]),
      rc_type:norm(r[rct]).toUpperCase(),
      O: normalizeTierArray(O.map((v,i)=> i<maxTiers ? v : null)),
      A: A.map((v,i)=> i<maxTiers ? v : null),
      bonus_flat: bonusFlat? num(r[bonusFlat]) : 0,
      bonus_rate: bonusRateOverride? num(r[bonusRateOverride]) : null
    };
  }).filter(r=>r.hub_name);
}
function normalizeLoginHours(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const rid = findKey(keys,['rider_id','riderid','rider id','employee id','employeeid','emp id','partner id','driver id','delivery partner id']);
    const dt = findKey(keys,['date','login date','work date','shift date']);
    const hub = findKey(keys,['hub_name','store','store_name','hub','store name','station','outlet']);
    const lh = findKey(keys,['login_hours','loginhours','login hours','login hrs','loginhrs','hours','total login hours','logged hours','duration','hrs logged']);
    return { rider_id: normId(r[rid]), date: toDateStr(r[dt]), hub_name: norm(r[hub]), login_hours: num(r[lh]) };
  }).filter(r=>r.rider_id && r.hub_name);
}
function normalizeValinor(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const rid = findKey(keys,['rider_id','riderid','rider id']);
    const dt = findKey(keys,['date']);
    const sub = findKey(keys,['payout_sub_title','payoutsubtitle','sub title']);
    const amt = findKey(keys,['amount']);
    return { rider_id: normId(r[rid]), date: toDateStr(r[dt]), payout_sub_title: norm(r[sub]), amount: num(r[amt]) };
  }).filter(r=>r.rider_id);
}
// Store Closure: needs first_seen/last_seen as real clock timestamps (not just a date),
// unlike the app's regular Login Hours file which only has a daily total.
function normalizeStoreClosureLogins(rows){
  return rows.filter(r=>r && Object.keys(r).length).map(r=>{
    const keys = Object.keys(r);
    const rid = findKey(keys,['rider_id','riderid','rider id']);
    const rname = findKey(keys,['rider_name','ridername','rider name','name']);
    const dt = findKey(keys,['date']);
    const hub = findKey(keys,['hub_name','hub','store_name','store name']);
    const storeCode = findKey(keys,['store_code','storecode','store code']);
    const lh = findKey(keys,['login_hours','login hours']);
    const fs = findKey(keys,['first_seen','firstseen','first seen']);
    const ls = findKey(keys,['last_seen','lastseen','last seen']);
    return {
      rider_id: normId(r[rid]),
      rider_name: norm(r[rname]),
      date: toDateStr(r[dt]),
      hub_name: norm(r[hub]),
      store_code: storeCode? norm(r[storeCode]) : '',
      login_hours: num(r[lh]),
      first_seen: toDateTimeVal(r[fs]),
      last_seen: toDateTimeVal(r[ls])
    };
  }).filter(r=>r.rider_id && r.hub_name && r.date && r.first_seen && r.last_seen);
}
function normalizeOrdersAny(rowsArr){
  // rowsArr: array of {name, rows} from possibly multiple uploaded order files
  let out = [];
  for(const {rows} of rowsArr){
    if(!rows.length) continue;
    const keys = Object.keys(rows[0]||{});
    const hasRawStatus = findKey(keys,['raw status']);
    if(hasRawStatus){
      // raw per-order file -> group by store+date+rider, count DELIVERED
      const storeK = findKey(keys,['store']);
      const dateK = findKey(keys,['date']);
      const riderK = findKey(keys,['rider id','riderid']);
      const statusK = hasRawStatus;
      const grouped = {};
      for(const r of rows){
        if(!r) continue;
        const st = norm(r[statusK]).toUpperCase();
        if(st!=='DELIVERED') continue;
        const store = norm(r[storeK]);
        const date = toDateStr(r[dateK]);
        const rider = normId(r[riderK]);
        if(!store||!rider) continue;
        const key = rider+'|'+date+'|'+store;
        grouped[key] = (grouped[key]||0)+1;
      }
      for(const key in grouped){
        const [rider_id,date,hub_name] = key.split('|');
        out.push({rider_id, date, hub_name, delivered_orders: grouped[key]});
      }
    } else {
      // pre-aggregated file
      const riderK = findKey(keys,['rider_id','riderid']);
      const storeK = findKey(keys,['store_name','hub_name','store']);
      const dateK = findKey(keys,['event_ist','date']);
      const evK = findKey(keys,['event']);
      const ordK = findKey(keys,['delivered_orders','orders']);
      for(const r of rows){
        if(!r) continue;
        if(evK && norm(r[evK]).toUpperCase()!=='DELIVERED') continue;
        const rider_id = normId(r[riderK]);
        const hub_name = norm(r[storeK]);
        const date = toDateStr(r[dateK]);
        if(!rider_id||!hub_name) continue;
        out.push({rider_id, date, hub_name, delivered_orders: num(r[ordK])});
      }
    }
  }
  return out;
}

/* =========================================================================
   DUPLICATE HUB DETECTION  (e.g. "X (Moved to 12 Aug)")
   ========================================================================= */
function baseHubName(name){ return name.replace(/\s*\(.*?\)\s*$/,'').trim(); }
function detectDuplicates(conditions){
  const groups = {};
  for(const c of conditions){
    const base = baseHubName(c.hub_name);
    groups[base] = groups[base] || [];
    groups[base].push(c);
  }
  const dups = [];
  for(const base in groups){
    const variants = groups[base];
    const distinctNames = [...new Set(variants.map(v=>v.hub_name))];
    if(distinctNames.length > 1){
      dups.push({base, variants});
    }
  }
  return dups;
}
// Never silently defaults to a "(Moved to ...)"/suffixed entry — those exist specifically
// to mark a hub as no longer current. Prefers the plain hub_name if one exists; if every
// variant has a suffix (genuinely ambiguous), returns null so the person must choose
// explicitly rather than the app guessing which one is "less wrong."
function pickDefaultDuplicate(variants){
  const clean = variants.find(v => baseHubName(v.hub_name) === v.hub_name.trim());
  return clean ? clean.hub_name : null;
}

/* =========================================================================
   RULES ENGINE (Considered Y/N)
   ========================================================================= */
function matchConsidered(subtitle, rules){
  const s = (subtitle||'').toLowerCase();
  for(const r of rules){
    if(s.includes(r.pattern.toLowerCase())) return r.considered;
  }
  return null; // unmatched
}
// Builds an O(1) exact-match lookup for the common case where a rule's pattern is a
// full, literal title (e.g. after "Replace with one row per unique title"). Falls back
// to the ordinary ordered substring scan only for rules that don't exactly match, so
// matching stays fast even with thousands of rules. An exact match is always a valid
// substring match too, so this never contradicts the plain matchConsidered() result for
// any rule list generated by this app; it can only diverge if a person manually adds a
// short general pattern that overlaps a literal title added separately, in which case
// the more specific exact match taking priority is the more useful behavior anyway.
function buildRuleIndex(rules){
  const exactMap = new Map();
  for(const r of rules){
    const key = r.pattern.toLowerCase();
    if(!exactMap.has(key)) exactMap.set(key, r.considered);
  }
  return {exactMap, rules};
}
function matchConsideredIndexed(subtitle, index){
  const s = (subtitle||'').toLowerCase();
  if(index.exactMap.has(s)) return index.exactMap.get(s);
  for(const r of index.rules){
    if(s.includes(r.pattern.toLowerCase())) return r.considered;
  }
  return null;
}

/* =========================================================================
   COMPUTE ENGINE
   ========================================================================= */
// Walk backward from a matched V-type tier to find the most recent tier with a real,
// non-zero rate. Confirmed directly against real RC data (e.g. O1=1/Var1=50, O2=6/Var2=0):
// RC sometimes stores a genuine 0 at a tier's rate instead of leaving it blank, and that
// 0 means "not really set", not "pay nothing" — falls back all the way to Var1 (index 0)
// as the base case, since Var1 is always populated for every real V-type hub.
function findVarRate(vc, tierIdx){
  for(let i=tierIdx; i>=0; i--){
    if(vc.V[i]!==null && vc.V[i]!==undefined && vc.V[i]!==0) return vc.V[i];
  }
  return vc.V[0]||0;
}
// Store Closure: sums overlap hours between a rider's [first_seen, last_seen] and one
// or more configured windows on a given date. Confirmed directly against real formulas
// and real data across three separate examples (including a two-window same-day case).
// windows: [{start:'HH:MM', end:'HH:MM'}, ...] — if end <= start, the window is treated
// as rolling past midnight into the next day (e.g. start:'18:00', end:'00:00').
function computeWindowOverlapHours(firstSeen, lastSeen, dateStr, windows){
  if(!firstSeen || !lastSeen || !windows || !windows.length || !dateStr) return 0;
  const [y,m,d] = dateStr.split('-').map(Number);
  let total = 0;
  windows.forEach(w=>{
    if(!w.start || !w.end) return;
    const [sh,sm] = w.start.split(':').map(Number);
    const [eh,em] = w.end.split(':').map(Number);
    const winStart = new Date(Date.UTC(y, m-1, d, sh, sm, 0));
    let winEnd = new Date(Date.UTC(y, m-1, d, eh, em, 0));
    if(winEnd.getTime() <= winStart.getTime()) winEnd = new Date(winEnd.getTime() + 24*60*60*1000);
    const overlapStartMs = Math.max(firstSeen.getTime(), winStart.getTime());
    const overlapEndMs = Math.min(lastSeen.getTime(), winEnd.getTime());
    total += Math.max(0, (overlapEndMs - overlapStartMs) / (1000*60*60));
  });
  return Math.round(total*100)/100;
}
// Sums this rider's Considered=Y Valinor amount for one specific date — reused for
// Store Closure's "Added Amount: Yes" mode, matching the same rules already configured
// on the Considered Rules page rather than requiring a separate manual entry.
function getConsideredYAmount(rider_id, date, ruleIndex){
  let sum = 0;
  for(const v of S.data.valinor){
    if(v.rider_id!==rider_id || v.date!==date) continue;
    if(matchConsideredIndexed(v.payout_sub_title, ruleIndex)==='Y') sum += v.amount;
  }
  return sum;
}
function computeStoreClosureResults(incident){
  const matching = S.data.storeClosureLogins.filter(r=> r.hub_name===incident.storeName && r.date===incident.date);
  const ruleIndex = buildRuleIndex(S.rules);
  return matching.map(r=>{
    const login_hours = computeWindowOverlapHours(r.first_seen, r.last_seen, incident.date, incident.windows);
    const eph_balancing = Math.round(login_hours * (incident.amountPerHour||0) * 100)/100;
    const amount_added = incident.amountAddedMode==='Y' ? getConsideredYAmount(r.rider_id, incident.date, ruleIndex) : 0;
    const pending_amount = Math.max(eph_balancing - amount_added, 0);
    return {rider_id:r.rider_id, rider_name:r.rider_name, hub_name:r.hub_name, date:r.date,
      login_hours, eph_balancing, amount_added, pending_amount};
  }).sort((a,b)=> b.eph_balancing-a.eph_balancing);
}
function buildMaps(){
  S.condMap = {}; for(const c of S.data.conditions) S.condMap[c.hub_name]=c;
  S.varMap = {}; for(const v of S.data.varConditions) S.varMap[v.hub_name]=v;
  S.fvMap = {}; for(const f of S.data.fvConditions) S.fvMap[f.hub_name]=f;
}
// Applies any confirmed hub-name mapping (e.g. Orders/Login Hours file has a truncated
// name missing the store-code suffix, Conditions has the full name) before a hub_name is
// used to build a join key or looked up in Conditions.
function resolveHubName(name){
  return S.hubNameMap[name] || name;
}
// Finds hub_name values in Orders/Login Hours that don't match Conditions even after
// applying confirmed mappings, but DO look like the same hub under a different name
// (one is a prefix of the other, case-insensitive) — surfaced for manual confirmation
// rather than auto-applied, since more than one candidate can genuinely match a short
// prefix and guessing wrong would silently misroute real pay data.
function detectHubNameMismatches(){
  const condNames = S.data.conditions.map(c=>c.hub_name);
  const rawNames = new Set();
  S.data.orders.forEach(o=>rawNames.add(o.hub_name));
  S.data.loginHours.forEach(l=>rawNames.add(l.hub_name));
  const results = [];
  rawNames.forEach(raw=>{
    if(S.condMap[raw]) return; // exact match already, nothing to do
    if(S.hubNameMap[raw]) return; // already confirmed by the user
    const rawLower = raw.toLowerCase();
    const candidates = condNames.filter(cn=>{
      const cnLower = cn.toLowerCase();
      return cnLower!==rawLower && (cnLower.startsWith(rawLower) || rawLower.startsWith(cnLower));
    });
    if(candidates.length){
      results.push({raw, candidates, best: candidates.length===1 ? candidates[0] : null});
    }
  });
  return results.sort((a,b)=>a.raw.localeCompare(b.raw));
}
function computeNewStores(){
  const allHubsSeen = new Set();
  S.data.orders.forEach(o=>allHubsSeen.add(resolveHubName(o.hub_name)));
  S.data.loginHours.forEach(l=>allHubsSeen.add(resolveHubName(l.hub_name)));
  S.newStores = [...allHubsSeen].filter(h=>!S.condMap[h]).sort();
  // Seed real draft state (not just a display fallback) so "Include" defaults to
  // actually being included in the computation, not just visually checked.
  S.newStores.forEach(h=>{
    if(!S.newStoreDraft[h]) S.newStoreDraft[h] = {rcType:'MG', minOrders:0, mgAmount:0, varPay:0, include:true};
  });
}

function runCompute(){
  buildMaps();

  // apply duplicate resolution: build resolvedConditions using chosen variant per duplicate group, plus all non-duplicate rows
  const dupBaseSet = new Set(S.duplicates.map(d=>d.base));
  let resolvedConditions = S.data.conditions.filter(c=>!dupBaseSet.has(baseHubName(c.hub_name)));
  for(const d of S.duplicates){
    const chosenName = S.duplicateChoice[d.base] !== undefined ? S.duplicateChoice[d.base] : pickDefaultDuplicate(d.variants);
    const chosen = chosenName ? d.variants.find(v=>v.hub_name===chosenName) : null;
    if(chosen) resolvedConditions.push(chosen);
    // If ambiguous (no plain variant, no explicit choice made), the hub is left out of
    // Conditions entirely rather than guessing — it'll surface as a "new store" needing
    // a decision instead of silently computing against the wrong rate.
  }
  // add any user-classified new stores
  for(const hub in S.newStoreDraft){
    const draft = S.newStoreDraft[hub];
    if(draft && draft.include){
      resolvedConditions.push({
        hub_name: hub, rc_type: draft.rcType, min_orders: num(draft.minOrders),
        mg_amount: num(draft.mgAmount), var_pay: num(draft.varPay),
        eph_eligible:false, eph_min_hours:59, eph_min_orders:80, eph_amount:6000
      });
    }
  }
  S.condMap = {}; for(const c of resolvedConditions) S.condMap[c.hub_name]=c;

  // index orders (daily + weekly)
  const ordersDaily = {};  // rider|date|hub -> sum
  const ordersWeekly = {}; // rider|hub -> sum
  for(const o of S.data.orders){
    const hn = resolveHubName(o.hub_name);
    const kd = o.rider_id+'|'+o.date+'|'+hn;
    ordersDaily[kd] = (ordersDaily[kd]||0) + o.delivered_orders;
    const kw = o.rider_id+'|'+hn;
    ordersWeekly[kw] = (ordersWeekly[kw]||0) + o.delivered_orders;
  }
  // index login hours (daily + weekly)
  const lhDaily = {};
  const lhWeekly = {};
  for(const l of S.data.loginHours){
    const hn = resolveHubName(l.hub_name);
    const kd = l.rider_id+'|'+l.date+'|'+hn;
    lhDaily[kd] = (lhDaily[kd]||0) + l.login_hours;
    const kw = l.rider_id+'|'+hn;
    lhWeekly[kw] = (lhWeekly[kw]||0) + l.login_hours;
  }
  // index valinor: by rider|date (daily) and by rider alone (weekly)
  const valDaily = {};  // rider|date -> {Y,N}
  const valRider = {};  // rider -> {Y,N}
  const unmatched = new Set();
  const ruleIndex = buildRuleIndex(S.rules);
  for(const v of S.data.valinor){
    const c = matchConsideredIndexed(v.payout_sub_title, ruleIndex);
    if(c===null){ unmatched.add(v.payout_sub_title); continue; }
    if(c==='X'){ continue; } // deliberately excluded — counts toward neither Y nor N
    const kd = v.rider_id+'|'+v.date;
    valDaily[kd] = valDaily[kd] || {Y:0,N:0};
    valDaily[kd][c] += v.amount;
    valRider[v.rider_id] = valRider[v.rider_id] || {Y:0,N:0};
    valRider[v.rider_id][c] += v.amount;
  }
  S.unmatchedSubtitles = [...unmatched];

  // detect new stores (present in orders/login hours but not in resolved conditions)
  computeNewStores();

  // --- MG & V (daily) ---
  const mgRows=[], vRows=[];
  // Driven by Login Hours, not a union with Orders: a rider who has order rows but no
  // Login Hours entry at all for that day isn't one of "our" riders for this calculation
  // (e.g. marketplace/MKT riders, who have orders but were never logged for hours) —
  // confirmed explicitly. Orders-only combinations are excluded rather than silently
  // included with a fabricated 0 login hours.
  const dailyKeys = new Set(Object.keys(lhDaily));
  const orderOnlyKeys = new Set([...Object.keys(ordersDaily)].filter(k=>{
    if(lhDaily.hasOwnProperty(k)) return false;
    const hub_name = k.split('|')[2];
    const cond = S.condMap[hub_name];
    return cond && (cond.rc_type==='MG' || cond.rc_type==='V');
  }));
  S.orderOnlyExcludedCount = orderOnlyKeys.size;
  for(const key of dailyKeys){
    const [rider_id, date, hub_name] = key.split('|');
    const cond = S.condMap[hub_name];
    if(!cond) continue;
    const orders = ordersDaily[key]||0;
    const loginHrs = lhDaily[key]||0;
    const va = valDaily[rider_id+'|'+date] || {Y:0,N:0};

    if(cond.rc_type==='MG'){
      const meetsCond = (loginHrs>=8.5 && orders>=cond.min_orders);
      const actual = meetsCond ? Math.max(cond.mg_amount, orders*cond.var_pay) : orders*cond.var_pay;
      const pending = Math.max(actual - va.Y, 0);
      mgRows.push({date,hub_name,rider_id,rc_type:cond.rc_type,login_hours:loginHrs,orders,min_orders:cond.min_orders,
        mg_amount:cond.mg_amount, var_pay:cond.var_pay, amount_added:va.Y, incentives:va.N,
        total_added:va.Y+va.N, actual_amount:actual, pending_amount:pending});
    } else if(cond.rc_type==='V'){
      const vc = S.varMap[hub_name];
      let actual;
      if(!vc){ actual = orders*cond.var_pay; }
      else {
        let tierIdx = 0;
        for(let i=6;i>=0;i--){
          if(vc.O[i]!==null && orders>=vc.O[i]){ tierIdx=i; break; }
        }
        actual = orders*findVarRate(vc, tierIdx);
      }
      const pending = Math.max(actual - va.Y, 0);
      const totalAdded = va.Y+va.N;
      // V-type EPH: a different formula shape entirely from F+V's — a fixed daily
      // guarantee of 900 (Total Added + Pending), triggered by daily login hours >= 8.5
      // (not a per-hub configurable threshold like F+V uses). No per-hub Max Login
      // Hours/Max Orders here — confirmed as a fixed formula for V-type.
      let ephBalancing = 0;
      if(cond.eph_eligible && orders>=0 && loginHrs>=8.5 && (totalAdded+pending)<900){
        ephBalancing = 900 - (totalAdded+pending);
      }
      vRows.push({date,rider_id,hub_name,login_hours:loginHrs,orders,amount_added:va.Y,incentives:va.N,
        total_added:totalAdded, actual_amount:actual, pending_amount:pending, eph_balancing:ephBalancing});
    }
  }

  // --- F+V family (weekly) ---
  const fvRows=[];
  const weeklyKeys = new Set(Object.keys(lhWeekly));
  const weeklyOrderOnlyKeys = new Set([...Object.keys(ordersWeekly)].filter(k=>{
    if(lhWeekly.hasOwnProperty(k)) return false;
    const hub_name = k.split('|')[1];
    const cond = S.condMap[hub_name];
    return cond && ['F+V','F+V1','F+V2','F+V3'].includes(cond.rc_type);
  }));
  S.orderOnlyExcludedCount += weeklyOrderOnlyKeys.size;
  for(const key of weeklyKeys){
    const [rider_id, hub_name] = key.split('|');
    const cond = S.condMap[hub_name];
    if(!cond) continue;
    if(!(cond.rc_type==='F+V'||cond.rc_type==='F+V1'||cond.rc_type==='F+V2'||cond.rc_type==='F+V3')) continue;
    const orders = ordersWeekly[key]||0;
    const fvc = S.fvMap[hub_name];
    const varPay = cond.var_pay;
    let actual;
    if(!fvc){
      actual = orders*varPay;
    } else {
      // find highest defined tier reached
      let tierIdx = -1;
      for(let i=6;i>=0;i--){ if(fvc.O[i]!==null && orders>=fvc.O[i]){ tierIdx=i; break; } }
      if(tierIdx===-1){
        actual = orders*varPay;
      } else if(tierIdx===6 || fvc.O[tierIdx+1]===null){
        // Top defined tier — each type has its own confirmed, distinct formula here:
        //   F+V:   MAX(orders x VarPay, orders x 50 + 300) — the "50" here is a literal
        //          constant from the confirmed source formula, NOT the hub's actual Var
        //          Pay. This only differs from using the real Var Pay for hubs whose Var
        //          Pay isn't 50 (confirmed explicitly to keep it literal, not "fixed").
        //   F+V1/F+V2/F+V3: flat tier amount + (orders beyond threshold) x VarPay, no
        //          bonus. (F+V1 was earlier confirmed as a hard cap with no continuation;
        //          that was superseded by a later, explicit formula confirming it uses
        //          this same continuation shape as F+V2/F+V3 instead.)
        const rate = fvc.bonus_rate!==null? fvc.bonus_rate : varPay;
        const overflow = Math.max(orders - fvc.O[tierIdx], 0);
        if(cond.rc_type==='F+V'){
          actual = Math.max(orders*varPay, orders*50+300);
        } else {
          actual = (fvc.A[tierIdx]||0) + overflow*rate + (fvc.bonus_flat||0);
        }
      } else {
        // A flat tier amount of exactly 0 is a placeholder, not a real match (confirmed:
        // plain F+V's first tier is always 0 in RC — it means "no MG floor here, just pay
        // per order", not "pay exactly zero"). Treat it the same as "no amount defined"
        // and fall back to orders*VarPay, same as the null case.
        actual = (fvc.A[tierIdx]!==null && fvc.A[tierIdx]!==0) ? fvc.A[tierIdx] : orders*varPay;
      }
    }
    const va = valRider[rider_id] || {Y:0,N:0};
    const pendingBase = Math.max(actual - va.Y, 0);
    const weeklyLoginHours = Math.round((lhWeekly[key]||0)*100)/100;

    let ephBalancing = 0, totalPending = pendingBase;
    if(cond.eph_eligible){
      const wLogin = weeklyLoginHours;
      const wOrders = orders;
      if(wLogin>=cond.eph_min_hours && wOrders>=cond.eph_min_orders){
        ephBalancing = Math.max(cond.eph_amount, actual);
      } else {
        ephBalancing = actual;
      }
      // Pending is what's still owed against the EPH guarantee itself (Amount Added is
      // already what's been paid out), not the EPH "gap" added on top of a separately
      // computed base pending — those two clamp independently and can overstate pending
      // whenever Actual is below Amount Added (common once EPH raises the effective floor).
      totalPending = Math.max(ephBalancing - va.Y, 0);
    }

    fvRows.push({rider_id,hub_name,rc_type:cond.rc_type,login_hours:weeklyLoginHours,orders,var_pay:varPay,
      amount_added:va.Y, incentives:va.N, total_added:va.Y+va.N,
      actual_amount:actual, pending_amount:pendingBase,
      eph_eligible:cond.eph_eligible?'Y':'N', eph_balancing:ephBalancing, total_pending:totalPending});
  }

  S.results = {mg:mgRows, v:vRows, fv:fvRows};
  S.computed = true;
}

/* =========================================================================
   EXPORT
   ========================================================================= */
function downloadWorkbook(){
  const wb = XLSX.utils.book_new();
  function sheetFrom(rows, cols, labels){
    const data = [labels||cols, ...rows.map(r=>cols.map(c=>r[c]))];
    return XLSX.utils.aoa_to_sheet(data);
  }

  // Raw input sheets — the same data you uploaded, so this workbook is a self-contained
  // record of both inputs and outputs for the week.
  XLSX.utils.book_append_sheet(wb, sheetFrom(S.data.loginHours,
    ['rider_id','date','hub_name','login_hours'], ['rider_id','date','hub_name','login_hours']), 'Login Hours');

  const ruleIndex = buildRuleIndex(S.rules);
  const valinorRows = S.data.valinor.map(v=>({...v, considered: matchConsideredIndexed(v.payout_sub_title, ruleIndex) || 'Unmatched'}));
  XLSX.utils.book_append_sheet(wb, sheetFrom(valinorRows,
    ['rider_id','date','payout_sub_title','amount','considered'], ['rider_id','date','payout_sub_title','amount','considered']), 'Valinor Added Data');

  XLSX.utils.book_append_sheet(wb, sheetFrom(S.data.orders,
    ['rider_id','date','hub_name','delivered_orders'], ['rider_id','date','hub_name','delivered_orders']), 'Orders');

  XLSX.utils.book_append_sheet(wb, sheetFrom(S.data.conditions,
    ['hub_name','rc_type','min_orders','mg_amount','var_pay','eph_eligible','eph_min_hours','eph_min_orders','eph_amount'],
    ['hub_name','RC Type','Min Orders','MG Amount','Var Pay','EPH Eligible','EPH Min Hours','EPH Min Orders','EPH Amount']), 'Conditions');

  const uniqueTitles = getUniqueSubtitles().map(u=>({...u, considered: matchConsideredIndexed(u.title, ruleIndex) || 'Unmatched'}));
  XLSX.utils.book_append_sheet(wb, sheetFrom(uniqueTitles,
    ['title','count','considered'], ['payout_sub_title','rows','considered']), 'Unique Valinor Titles');

  // Computed output sheets
  const mgCols = ['date','hub_name','rider_id','rc_type','login_hours','orders','min_orders','mg_amount','var_pay','amount_added','incentives','total_added','actual_amount','pending_amount'];
  const vCols = ['date','rider_id','hub_name','login_hours','orders','amount_added','incentives','total_added','actual_amount','pending_amount','eph_balancing'];
  const fvCols = ['rider_id','hub_name','rc_type','login_hours','orders','var_pay','amount_added','incentives','total_added','actual_amount','pending_amount','eph_eligible','eph_balancing','total_pending'];
  XLSX.utils.book_append_sheet(wb, sheetFrom(S.results.mg, mgCols), 'MG');
  XLSX.utils.book_append_sheet(wb, sheetFrom(S.results.fv, fvCols), 'F+V');
  XLSX.utils.book_append_sheet(wb, sheetFrom(S.results.v, vCols), 'Var');

  if(S.storeClosureIncidents.length){
    let scRows = [];
    S.storeClosureIncidents.forEach(inc=>{
      const ready = inc.storeName && inc.date && inc.windows.some(w=>w.start&&w.end) && inc.amountPerHour>0;
      if(!ready) return;
      const windowsLabel = inc.windows.filter(w=>w.start&&w.end).map(w=>w.start+'-'+w.end).join(' & ');
      computeStoreClosureResults(inc).forEach(r=>{
        scRows.push({...r, store_name: inc.storeName, incident_date: inc.date, windows: windowsLabel, amount_per_hour: inc.amountPerHour});
      });
    });
    XLSX.utils.book_append_sheet(wb, sheetFrom(scRows,
      ['store_name','incident_date','windows','rider_id','rider_name','login_hours','amount_per_hour','amount_added','eph_balancing','pending_amount'],
      ['Store Name','Date','Window(s)','Rider ID','Rider Name','Login Hours','Amount/Hour','Amount Added','EPH Balancing','Pending Amount']), 'Store Closure');
  }

  const fname = 'Payout_Calculator_' + (S.weekLabel? S.weekLabel.replace(/\s+/g,'_') : 'export') + '.xlsx';
  XLSX.writeFile(wb, fname);
}

/* =========================================================================
   RENDERING
   ========================================================================= */
const TABS = [
  {id:'upload', label:'1. Upload Data'},
  {id:'checks', label:'2. Review Rates'},
  {id:'orders', label:'3. Orders'},
  {id:'loginhours', label:'4. Login Hours'},
  {id:'rules', label:'5. Considered Rules'},
  {id:'eph', label:'6. EPH Balancing'},
  {id:'results', label:'7. Results'},
  {id:'storeclosure', label:'8. Store Closure'}
];

function fmtMoney(n){ return '\u20B9' + Math.round(n||0).toLocaleString('en-IN'); }

function renderNav(){
  const nav = document.getElementById('navtabs');
  nav.innerHTML = TABS.map(t=>{
    let badge='';
    if(t.id==='checks'){
      const n = (S.duplicates.length + S.newStores.length + S.rcReview.length);
      if(n>0) badge = `<span class="badge">${n}</span>`;
    }
    return `<button class="navbtn ${S.tab===t.id?'active':''}" data-tab="${t.id}"><span class="dot"></span>${t.label}${badge}</button>`;
  }).join('');
  nav.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}

function uploadSlotHTML(id, title, required, desc, count){
  const filled = count>0;
  return `
  <div class="upslot ${filled?'filled':''}">
    <div class="row">
      <label class="title">${title}</label>
      ${required?'<span class="req">required</span>':'<span class="req" style="color:#9AA1AB;">optional</span>'}
    </div>
    <div class="desc">${desc}</div>
    <input type="file" id="${id}" accept=".xlsx,.xls,.csv" ${id==='f_orders'?'multiple':''}/>
    <div class="status ${filled?'ok':''}" id="${id}_status">${filled? ('&#10003; '+count+' rows loaded') : 'No file loaded yet'}</div>
  </div>`;
}

const MG_RATES_KEY = 'arrear-console-mg-rates-memory';
function loadMgRatesMemory(){
  try{ const raw = localStorage.getItem(MG_RATES_KEY); return raw? JSON.parse(raw): {}; }
  catch(e){ return {}; }
}
function saveMgRatesMemory(map){
  try{ localStorage.setItem(MG_RATES_KEY, JSON.stringify(map)); }
  catch(e){ console.warn('Could not save MG rate memory', e); }
}
// Runs the RC generator (if ready) and refreshes Conditions/Var Conditions/F+V Conditions.
// Called automatically whenever the RC file or week selection changes -- no button needed.
function autoGenerateConditions(){
  const aoa = S.rc.sheets[S.rc.selectedSheet];
  if(!aoa) return;
  const prevMap = loadMgRatesMemory();
  const result = generateFromRC(aoa, prevMap);
  S.data.conditions = result.conditions;
  S.data.varConditions = result.varConditions;
  S.data.fvConditions = result.fvConditions;
  S.rcReview = result.review;
  // Remember every MG-type hub's rate this run so next week can carry it forward automatically.
  const mem = loadMgRatesMemory();
  result.conditions.forEach(c=>{
    if(c.rc_type==='MG' && c.mg_amount>0){
      mem[c.hub_name] = {min_orders:c.min_orders, mg_amount:c.mg_amount};
    }
  });
  saveMgRatesMemory(mem);
}

function renderUpload(){
  const main = document.getElementById('main');
  const readyCount = [(!!S.rc.selectedSheet), S.data.orders.length, S.data.loginHours.length, S.data.valinor.length].filter(Boolean).length;
  const hasAnyData = S.rc.sheetNames.length || S.data.orders.length || S.data.loginHours.length || S.data.valinor.length;
  main.innerHTML = `
    <h1 class="pagetitle">Upload this week's data</h1>
    <p class="pagesub">Just four files. Conditions, Var Conditions, and F+V Conditions are generated automatically from the RC workbook &mdash; you'll review and can edit them on the next page. Your progress is saved automatically in this browser, so refreshing the page won't lose anything.</p>
    ${hasAnyData? '<button class="btn ghost small" id="btnNewWeek" style="margin-bottom:16px;">Start a new week (clears everything saved)</button>' : ''}
    <div class="card">
      <div class="grid2">
        <div class="upslot ${S.rc.sheetNames.length?'filled':''}">
          <div class="icon-badge">&#128203;</div>
          <div class="row"><label class="title">1. RC workbook</label><span class="req">required</span></div>
          <div class="desc">The full multi-tab RC file (e.g. RC_-_Amazon.xlsx). Generates Conditions, Var Conditions, and F+V Conditions automatically.</div>
          <input type="file" id="f_rc" accept=".xlsx,.xls">
          <div class="status ${S.rc.sheetNames.length?'ok':''}">${S.rc.sheetNames.length? ('&#10003; loaded') : 'No file loaded yet'}</div>
          ${S.rc.sheetNames.length ? `
            <div style="margin-top:8px;">
              <label style="font-size:11.5px;color:var(--text-dim);display:block;margin-bottom:4px;">Which week? <span class="req">required</span></label>
              <div style="display:flex;gap:6px;">
                <select id="rcSheetSelect" style="flex:1;${!S.rc.selectedSheet?'border-color:var(--red);':''}">
                  <option value="" ${!S.rc.selectedSheet?'selected':''} disabled>&mdash; Select a week &mdash;</option>
                  ${S.rc.sheetNames.map(n=>`<option value="${n}" ${n===S.rc.selectedSheet?'selected':''}>${n}</option>`).join('')}
                </select>
                ${S.rc.selectedSheet? '<button class="btn ghost small" id="btnRegenCond" title="Re-runs RC generation for the currently selected week — use this after an app update, or if you edited the RC file and re-uploaded it without changing the week selection.">Regenerate</button>' : ''}
              </div>
              ${!S.rc.selectedSheet? '<div class="status" style="color:var(--red);margin-top:4px;">Pick the week before continuing &mdash; nothing is generated until you choose.</div>' : ''}
            </div>` : ''}
        </div>
        <div class="upslot ${S.data.orders.length?'filled':''}">
          <div class="icon-badge">&#128722;</div>
          <div class="row"><label class="title">2. Orders file(s)</label><span class="req">required</span></div>
          <div class="desc">Delivered orders &mdash; raw per-order export, or pre-aggregated by rider/store/date. You can select multiple files.</div>
          <input type="file" id="f_orders" accept=".xlsx,.xls,.csv" multiple>
          <div class="status ${S.data.orders.length?'ok':''}">${S.data.orders.length? ('&#10003; '+S.data.orders.length+' rows loaded') : 'No file loaded yet'}</div>
          ${S.uploadErrors.orders ? `<div class="status" style="color:var(--red);margin-top:4px;">${S.uploadErrors.orders}</div>` : ''}
        </div>
        <div class="upslot ${S.data.loginHours.length?'filled':''}">
          <div class="icon-badge">&#128100;</div>
          <div class="row"><label class="title">3. Login Hours file</label><span class="req">required</span></div>
          <div class="desc">rider_id, date, hub_name, login_hours (daily)</div>
          <input type="file" id="f_loginhours" accept=".xlsx,.xls,.csv">
          <div class="status ${S.data.loginHours.length?'ok':''}">${S.data.loginHours.length? ('&#10003; '+S.data.loginHours.length+' rows loaded') : 'No file loaded yet'}</div>
          ${S.uploadErrors.loginHours ? `<div class="status" style="color:var(--red);margin-top:4px;">${S.uploadErrors.loginHours}</div>` : ''}
        </div>
        <div class="upslot ${S.data.valinor.length?'filled':''}">
          <div class="icon-badge">&#128179;</div>
          <div class="row"><label class="title">4. Valinor Added Data</label><span class="req">required</span></div>
          <div class="desc">rider_id, date, payout_sub_title, amount</div>
          <input type="file" id="f_valinor" accept=".xlsx,.xls,.csv">
          <div class="status ${S.data.valinor.length?'ok':''}">${S.data.valinor.length? ('&#10003; '+S.data.valinor.length+' rows loaded') : 'No file loaded yet'}</div>
          ${S.uploadErrors.valinor ? `<div class="status" style="color:var(--red);margin-top:4px;">${S.uploadErrors.valinor}</div>` : ''}
        </div>
      </div>
      ${S.data.conditions.length ? `<div class="alertbox ok" style="margin-top:16px;"><span>&#10003;</span><div><b>Generated from RC:</b> ${S.data.conditions.length} hubs, ${S.data.varConditions.length} Var-type tier sets, ${S.data.fvConditions.length} F+V-family tier sets.${S.rcReview.length? ' '+S.rcReview.length+' item(s) flagged for review on the next page.':''}</div></div>` : ''}
    </div>
    <div class="card">
      <h2>Week label</h2>
      <div class="hint">Used to name your downloaded workbook file.</div>
      <input type="text" id="weeklabel" placeholder="e.g. 17 Aug - 23 Aug" value="${S.weekLabel}" style="width:260px;">
    </div>
    <button class="btn amber" id="btnRunChecks" ${readyCount<4?'disabled':''}>Continue to Review &rarr;</button>
    ${readyCount<4? '<div class="hint" style="margin-top:8px;">Upload all four files to continue.</div>' : ''}
  `;
  document.getElementById('weeklabel').oninput = e=> S.weekLabel = e.target.value;
  const newWeekBtn = document.getElementById('btnNewWeek');
  if(newWeekBtn) newWeekBtn.onclick = async ()=>{
    if(!confirm('This clears all uploaded data, generated Conditions, and computed results from this browser. Your Considered Rules are kept. Continue?')) return;
    await clearSavedState();
    S.data = { conditions:[], varConditions:[], fvConditions:[], orders:[], loginHours:[], valinor:[], storeClosureLogins:[] };
    S.rc = { sheetNames:[], sheets:{}, selectedSheet:'' };
    S.rcReview = []; S.duplicates = []; S.duplicateChoice = {}; S.newStores = []; S.newStoreDraft = {}; S.hubNameMap = {};
    S.storeClosureIncidents = []; S.storeClosureUploadError = '';
    S.results = { mg:[], v:[], fv:[] }; S.computed = false; S.unmatchedSubtitles = [];
    S.weekLabel = ''; S.uploadErrors = { orders:'', loginHours:'', valinor:'' };
    S.tab = 'upload';
    render();
  };

  document.getElementById('f_rc').onchange = async e=>{
    const file = e.target.files[0];
    if(!file) return;
    try{
      const {sheetNames, sheets} = await readWorkbookAllSheetsAOA(file);
      S.rc.sheetNames = detectWeekSheets(sheetNames);
      S.rc.sheets = sheets;
      S.rc.selectedSheet = ''; // must be explicitly chosen — no default, no auto-generate yet
    }catch(err){
      alert('Could not read the RC workbook: '+err.message);
    }
    render();
  };
  document.getElementById('f_orders').onchange = async e=>{
    try{
      const bundles = [];
      for(const f of e.target.files){ bundles.push({name:f.name, rows: await readFileAsRows(f)}); }
      const normalized = normalizeOrdersAny(bundles);
      if(!normalized.length){
        const sample = bundles[0] && bundles[0].rows[0] ? Object.keys(bundles[0].rows[0]).join(', ') : '(no rows read)';
        S.data.orders = [];
        S.uploadErrors.orders = 'No rows matched the expected columns. Columns found: '+sample;
      } else {
        S.data.orders = normalized;
        S.uploadErrors.orders = '';
      }
    }catch(err){
      S.data.orders = [];
      S.uploadErrors.orders = 'Error reading file(s): '+err.message;
    }
    render();
  };
  document.getElementById('f_loginhours').onchange = async e=>{
    const file = e.target.files[0];
    if(!file) return;
    const result = await loadAndDiagnose(file, normalizeLoginHours, 'rider_id, date, hub_name, login_hours');
    S.data.loginHours = result.rows;
    S.uploadErrors.loginHours = result.message;
    render();
  };
  document.getElementById('f_valinor').onchange = async e=>{
    const file = e.target.files[0];
    if(!file) return;
    const result = await loadAndDiagnose(file, normalizeValinor, 'rider_id, date, payout_sub_title, amount');
    S.data.valinor = result.rows;
    S.uploadErrors.valinor = result.message;
    render();
  };
  const sheetSel = document.getElementById('rcSheetSelect');
  if(sheetSel) sheetSel.onchange = e=>{
    S.rc.selectedSheet = e.target.value;
    autoGenerateConditions();
    render();
  };
  const regenBtn = document.getElementById('btnRegenCond');
  if(regenBtn) regenBtn.onclick = ()=>{
    const before = JSON.stringify(S.data.fvConditions) + JSON.stringify(S.data.varConditions) + JSON.stringify(S.data.conditions);
    autoGenerateConditions();
    const after = JSON.stringify(S.data.fvConditions) + JSON.stringify(S.data.varConditions) + JSON.stringify(S.data.conditions);
    render();
    alert(before===after
      ? 'Regenerated from RC — no changes this time (the app was already using the latest generated Conditions for this week).'
      : 'Regenerated from RC — Conditions, Var Conditions, and F+V Conditions have been refreshed. Go to Results and click "Run computation" again to recalculate with the updated data.');
  };
  document.getElementById('btnRunChecks').onclick = ()=>{
    buildMaps();
    S.duplicates = detectDuplicates(S.data.conditions);
    computeNewStores();
    S.tab='checks'; render();
  };
}

function ephPassesFilter(c){
  const s = S.ephFilter.search.trim().toLowerCase();
  return !s || c.hub_name.toLowerCase().includes(s);
}
function renderEPHTable(){
  const wrap = document.getElementById('ephTableWrap');
  if(!wrap) return;
  const indexed = S.data.conditions.map((c,i)=>({c,i})).filter(({c})=>ephPassesFilter(c));
  const countEl = document.getElementById('ephCount');
  const s = S.ephFilter.search.trim();
  if(countEl) countEl.textContent = s ? (indexed.length+' of '+S.data.conditions.length) : S.data.conditions.length;
  wrap.innerHTML = `<div class="scrollbox"><table class="datatable"><thead><tr>
      <th>hub_name</th><th>RC Type</th><th>EPH Balancing</th><th>Max Login Hours</th><th>Max Orders</th>
    </tr></thead><tbody>
    ${indexed.map(({c,i})=>`<tr>
      <td style="font-family:var(--mono);">${c.hub_name}</td>
      <td><span class="pill ${c.rc_type.toLowerCase().includes('v')&&c.rc_type!=='V'?'fv':(c.rc_type==='V'?'v':'mg')}">${c.rc_type}</span></td>
      <td><select class="ephYN" data-i="${i}">
        <option value="N" ${!c.eph_eligible?'selected':''}>N</option>
        <option value="Y" ${c.eph_eligible?'selected':''}>Y</option>
      </select></td>
      <td><input type="number" class="ephHours" data-i="${i}" value="${c.eph_min_hours}" style="width:80px;" ${(!c.eph_eligible||c.rc_type==='V')?'disabled':''}></td>
      <td><input type="number" class="ephOrders" data-i="${i}" value="${c.eph_min_orders}" style="width:80px;" ${(!c.eph_eligible||c.rc_type==='V')?'disabled':''}></td>
    </tr>`).join('')}
    </tbody></table></div>
    ${indexed.length===0? '<div class="hint" style="margin-top:8px;">No hubs match this search.</div>':''}`;
  wrap.querySelectorAll('.ephYN').forEach(sel=> sel.onchange = e=>{
    S.data.conditions[e.target.dataset.i].eph_eligible = (e.target.value==='Y');
    renderEPHTable();
  });
  wrap.querySelectorAll('.ephHours').forEach(inp=> inp.onchange = e=>{ S.data.conditions[e.target.dataset.i].eph_min_hours = parseFloat(e.target.value)||0; });
  wrap.querySelectorAll('.ephOrders').forEach(inp=> inp.onchange = e=>{ S.data.conditions[e.target.dataset.i].eph_min_orders = parseFloat(e.target.value)||0; });
}
function renderEPH(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <h1 class="pagetitle">EPH Balancing</h1>
    <p class="pagesub">Mark which hubs get an EPH top-up guarantee. F+V-type hubs use Max Login Hours / Max Orders as the qualifying thresholds against a flat weekly guarantee (6000, since this runs weekly). V-type hubs use a fixed daily guarantee (900, when daily login hours &ge; 8.5) &mdash; Max Login Hours / Max Orders aren't used for V-type and stay disabled.</p>
    <div class="card">
      <h2>Stores (<span id="ephCount">0</span>)</h2>
      <div class="hint">Set to Y only for hubs that actually get EPH Balancing &mdash; leave the rest at N. For Y, fill in Max Login Hours and Max Orders (F+V-type only).</div>
      <input type="text" id="ephSearch" placeholder="Search hub name or code&hellip;" value="${S.ephFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;margin-bottom:12px;">
      <div id="ephTableWrap"></div>
    </div>
    <button class="btn ghost" data-tab="rules">&larr; Back to Considered Rules</button>
    <button class="btn amber" id="btnComputeFromEPH" style="margin-left:8px;">Run computation &rarr;</button>
    <div class="hint" style="margin-top:8px;">This recalculates using the Conditions data already in your browser. If you've just updated the app itself, or edited the RC file, go back to <b>Upload Data</b> and click <b>Regenerate</b> first &mdash; this button alone won't re-derive Conditions from RC.</div>
  `;
  renderEPHTable();
  document.getElementById('ephSearch').oninput = e=>{ S.ephFilter.search = e.target.value; renderEPHTable(); };
  document.getElementById('btnComputeFromEPH').onclick = ()=>{
    runCompute();
    S.tab='results'; render();
  };
  main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}

function rawDataTable(rows, filterState, cols, labels){
  const s = filterState.search.trim().toLowerCase();
  const filtered = s ? rows.filter(r => String(r.rider_id).toLowerCase().includes(s) || String(r.hub_name).toLowerCase().includes(s)) : rows;
  const shown = filtered.slice(0, 300);
  let h = `<div class="scrollbox"><table class="datatable"><thead><tr>${cols.map((c,i)=>`<th class="${typeof rows[0]?.[c]==='number'?'num':''}">${labels[i]}</th>`).join('')}</tr></thead><tbody>`;
  shown.forEach(r=>{
    h += '<tr>' + cols.map(c=>{
      const v = r[c];
      return `<td class="${typeof v==='number'?'num':''}">${v}</td>`;
    }).join('') + '</tr>';
  });
  h += '</tbody></table></div>';
  if(filtered.length>300) h += `<div class="hint" style="margin-top:8px;">Showing first 300 of ${filtered.length.toLocaleString()} matching rows.</div>`;
  return h;
}
function renderOrdersPage(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <h1 class="pagetitle">Orders</h1>
    <p class="pagesub">Every row from your uploaded Orders file for this week &mdash; ${S.data.orders.length.toLocaleString()} rows.</p>
    <div class="card">
      <input type="text" id="ordersSearch" placeholder="Search rider ID or hub name&hellip;" value="${S.ordersFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;margin-bottom:12px;">
      <div id="ordersTableWrap"></div>
    </div>
    <button class="btn ghost" data-tab="checks">&larr; Back to Review Rates</button>
    <button class="btn amber" data-tab="loginhours" style="margin-left:8px;">Continue to Login Hours &rarr;</button>
  `;
  const cols=['date','hub_name','rider_id','delivered_orders'];
  const labels=['Date','Hub','Rider','Delivered Orders'];
  document.getElementById('ordersTableWrap').innerHTML = rawDataTable(S.data.orders, S.ordersFilter, cols, labels);
  document.getElementById('ordersSearch').oninput = e=>{
    S.ordersFilter.search = e.target.value;
    document.getElementById('ordersTableWrap').innerHTML = rawDataTable(S.data.orders, S.ordersFilter, cols, labels);
  };
  main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}
function renderLoginHoursPage(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <h1 class="pagetitle">Login Hours</h1>
    <p class="pagesub">Every row from your uploaded Login Hours file for this week &mdash; ${S.data.loginHours.length.toLocaleString()} rows.</p>
    <div class="card">
      <input type="text" id="lhSearch" placeholder="Search rider ID or hub name&hellip;" value="${S.loginHoursFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;margin-bottom:12px;">
      <div id="lhTableWrap"></div>
    </div>
    <button class="btn ghost" data-tab="orders">&larr; Back to Orders</button>
    <button class="btn amber" data-tab="rules" style="margin-left:8px;">Continue to Considered Rules &rarr;</button>
  `;
  const cols=['date','hub_name','rider_id','login_hours'];
  const labels=['Date','Hub','Rider','Login Hours'];
  document.getElementById('lhTableWrap').innerHTML = rawDataTable(S.data.loginHours, S.loginHoursFilter, cols, labels);
  document.getElementById('lhSearch').oninput = e=>{
    S.loginHoursFilter.search = e.target.value;
    document.getElementById('lhTableWrap').innerHTML = rawDataTable(S.data.loginHours, S.loginHoursFilter, cols, labels);
  };
  main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}
function renderRules(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <h1 class="pagetitle">Considered Rules</h1>
    <p class="pagesub">These decide whether a Valinor payout line counts as <b>Amount Added</b> (Y) or an <b>Incentive</b> (N). Rules are checked top to bottom &mdash; the first pattern that appears anywhere in the payout_sub_title wins. Edit freely; this list is saved for next time.</p>
    <div class="card">
      <h2>Rule order &amp; matching (<span id="ruleCount">0</span>)</h2>
      <div class="hint">Add, reorder, or remove patterns any time your payout structure changes. Saved automatically to this browser &mdash; use Export/Import to move your rules to another machine or keep a backup file.</div>
      <input type="text" id="ruleSearch" placeholder="Search rules&hellip;" value="${S.ruleFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;margin-bottom:10px;">
      <div id="rulesList"></div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <input type="text" id="newPattern" placeholder="new pattern, e.g. Surge_Incentive" style="flex:1;">
        <select id="newConsidered"><option value="Y">Y &ndash; Considered</option><option value="N">N &ndash; Incentive</option><option value="X">X &ndash; Exclude entirely</option></select>
        <button class="btn primary small" id="addRuleBtn">Add rule</button>
      </div>
      <div style="position:relative;display:inline-block;margin-top:10px;">
        <button class="btn ghost small" id="rulesMenuBtn" title="More options" style="padding:8px 14px;font-size:16px;line-height:1;">&#8942;</button>
        <div id="rulesMenuDropdown" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:1px solid #E4E6E9;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:8px;min-width:280px;z-index:20;">
          <button class="btn ghost small" id="exportRulesBtn" style="width:100%;text-align:left;margin-bottom:4px;display:block;">Export rules (.json)</button>
          <label class="btn ghost small" style="width:100%;text-align:left;display:block;cursor:pointer;margin-bottom:4px;box-sizing:border-box;">Import rules (.json)<input type="file" id="importRulesInput" accept=".json" style="display:none;"></label>
          <button class="btn danger small" id="resetRulesBtn" style="width:100%;text-align:left;margin-bottom:4px;display:block;">Reset to defaults</button>
          <button class="btn primary small" id="expandToTitlesBtn" style="width:100%;text-align:left;display:block;">Replace with one row per unique title from Valinor data</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Payout titles needing a rule (<span id="subtitleCount">0</span>)</h2>
      <div class="hint">Titles already matched by a rule above aren't shown here &mdash; only ones with no rule yet. Add a pattern for each so nothing silently drops out of the calculation.</div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
        <input type="text" id="subtitleSearch" placeholder="Search payout titles&hellip;" value="${S.subtitleFilter.search.replace(/"/g,'&quot;')}" style="flex:1;min-width:220px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-dim);white-space:nowrap;">
          <input type="checkbox" id="subtitleShowMatched" ${S.subtitleFilter.showMatched?'checked':''}>
          Show already-matched titles too
        </label>
      </div>
      <div id="subtitleTableWrap"></div>
    </div>
    <button class="btn ghost" data-tab="loginhours">&larr; Back to Login Hours</button>
    <button class="btn amber" data-tab="eph" style="margin-left:8px;">Continue to EPH Balancing &rarr;</button>
  `;
  renderRuleRows();
  document.getElementById('ruleSearch').oninput = e=>{ S.ruleFilter.search = e.target.value; renderRuleRows(); };
  renderSubtitlesTable();
  document.getElementById('subtitleSearch').oninput = e=>{ S.subtitleFilter.search = e.target.value; renderSubtitlesTable(); };
  document.getElementById('subtitleShowMatched').onchange = e=>{ S.subtitleFilter.showMatched = e.target.checked; renderSubtitlesTable(); };
  document.getElementById('addRuleBtn').onclick = ()=>{
    const p = document.getElementById('newPattern').value.trim();
    const c = document.getElementById('newConsidered').value;
    if(!p) return;
    S.rules.push({pattern:p, considered:c});
    saveRules();
    render();
  };
  document.getElementById('rulesMenuBtn').onclick = e=>{
    e.stopPropagation();
    const dd = document.getElementById('rulesMenuDropdown');
    dd.style.display = dd.style.display==='none' ? 'block' : 'none';
  };
  document.getElementById('exportRulesBtn').onclick = exportRulesFile;
  document.getElementById('importRulesInput').onchange = e=>{
    if(!e.target.files[0]) return;
    importRulesFile(e.target.files[0], ok=>{
      if(ok) render(); else alert('That file could not be read as a rules JSON export.');
    });
  };
  document.getElementById('resetRulesBtn').onclick = ()=>{
    if(!confirm('Reset to the built-in default rules? Your edits will be lost unless exported.')) return;
    S.rules = DEFAULT_RULES.slice();
    saveRules();
    render();
  };
  document.getElementById('expandToTitlesBtn').onclick = ()=>{
    const unique = getUniqueSubtitles();
    if(!unique.length){ alert('Upload Valinor data first (Upload Data tab) — there\'s nothing to expand yet.'); return; }
    const msg = 'This replaces your current '+S.rules.length+' pattern(s) with '+unique.length+' row(s) — one per unique title in your uploaded Valinor data.\n\n'
      + 'Each title keeps whatever Y/N your current rules would give it right now. Titles that don\'t match anything today default to N (excluded) — review those afterward using the list below.\n\n'
      + 'Export your current rules first if you might want them back. Continue?';
    if(!confirm(msg)) return;
    unique.sort((a,b)=> b.count-a.count);
    S.rules = unique.map(u => ({
      pattern: u.title,
      considered: matchConsidered(u.title, S.rules) || 'N'
    }));
    saveRules();
    render();
  };
  main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}
function renderRuleRows(){
  const el = document.getElementById('rulesList');
  const s = S.ruleFilter.search.trim().toLowerCase();
  const indexed = S.rules.map((r,i)=>({r,i}));
  const filtered = s ? indexed.filter(({r})=>r.pattern.toLowerCase().includes(s)) : indexed;
  const countEl = document.getElementById('ruleCount');
  if(countEl) countEl.textContent = s ? (filtered.length+' of '+S.rules.length) : S.rules.length;
  const cap = 300;
  const shown = filtered.slice(0,cap);
  el.innerHTML = shown.map(({r,i})=>`
    <div class="rulerow">
      <div class="idx">${i+1}</div>
      <input type="text" value="${r.pattern.replace(/"/g,'&quot;')}" data-i="${i}" class="ruleInput" style="width:100%;">
      <select data-i="${i}" class="ruleSel">
        <option value="Y" ${r.considered==='Y'?'selected':''}>Y</option>
        <option value="N" ${r.considered==='N'?'selected':''}>N</option>
        <option value="X" ${r.considered==='X'?'selected':''}>X</option>
        <option value="DELETE">&mdash; Delete this rule &mdash;</option>
      </select>
      <div style="display:flex;gap:4px;">
        <button class="arrowbtn" data-i="${i}" data-dir="-1">&uarr;</button>
        <button class="arrowbtn" data-i="${i}" data-dir="1">&darr;</button>
      </div>
      <button class="btn danger small" data-del="${i}">Remove</button>
    </div>
  `).join('') + (filtered.length>cap? `<div class="hint" style="margin-top:8px;">Showing first ${cap} of ${filtered.length} matching rules &mdash; search to narrow further.</div>`:'');
  el.querySelectorAll('.ruleInput').forEach(inp=> inp.onchange = e=>{ S.rules[e.target.dataset.i].pattern = e.target.value; saveRules(); renderSubtitlesTable(); });
  el.querySelectorAll('.ruleSel').forEach(sel=> sel.onchange = e=>{
    const i = parseInt(e.target.dataset.i);
    if(e.target.value==='DELETE'){
      S.rules.splice(i,1);
      saveRules();
      render();
      return;
    }
    S.rules[i].considered = e.target.value;
    saveRules();
    renderSubtitlesTable();
  });
  el.querySelectorAll('.arrowbtn').forEach(btn=> btn.onclick = e=>{
    const i = parseInt(btn.dataset.i), dir = parseInt(btn.dataset.dir);
    const j = i+dir;
    if(j<0||j>=S.rules.length) return;
    [S.rules[i],S.rules[j]] = [S.rules[j],S.rules[i]];
    saveRules();
    render();
  });
  el.querySelectorAll('[data-del]').forEach(btn=> btn.onclick = e=>{
    S.rules.splice(parseInt(btn.dataset.del),1);
    saveRules();
    render();
  });
}
function getUniqueSubtitles(){
  const map = new Map();
  S.data.valinor.forEach(v=>{
    const t = v.payout_sub_title || '';
    map.set(t, (map.get(t)||0)+1);
  });
  return [...map.entries()].map(([title,count])=>({title,count}));
}
function renderSubtitlesTable(){
  const wrap = document.getElementById('subtitleTableWrap');
  if(!wrap) return;
  const all = getUniqueSubtitles();
  const s = S.subtitleFilter.search.trim().toLowerCase();
  const ruleIndex = buildRuleIndex(S.rules);
  let base = all;
  if(!S.subtitleFilter.showMatched){
    base = base.filter(r => matchConsideredIndexed(r.title, ruleIndex)===null);
  }
  const filtered = s ? base.filter(r=>r.title.toLowerCase().includes(s)) : base;
  filtered.sort((a,b)=> b.count-a.count);
  const countEl = document.getElementById('subtitleCount');
  if(countEl) countEl.textContent = filtered.length + (S.subtitleFilter.showMatched? ' of '+all.length : ' unmatched');
  if(!all.length){
    wrap.innerHTML = '<div class="hint">No Valinor data uploaded yet &mdash; upload it on the Upload tab to see payout titles here.</div>';
    return;
  }
  if(!filtered.length){
    wrap.innerHTML = `<div class="alertbox ok"><span>&#10003;</span><div><b>Every payout title matches a rule</b> &mdash; nothing left needing attention.${s? ' (No results for this search.)':''}</div></div>`;
    return;
  }
  const cap = 1000;
  const shown = filtered.slice(0,cap);
  wrap.innerHTML = `<div class="scrollbox"><table class="datatable"><thead><tr>
      <th>Payout Sub Title</th><th class="num">Rows</th><th>Considered</th><th></th>
    </tr></thead><tbody>
    ${shown.map(r=>{
      const c = matchConsideredIndexed(r.title, ruleIndex);
      const pill = c==='Y' ? '<span class="pill y">Y</span>' : c==='N' ? '<span class="pill n">N</span>' : c==='X' ? '<span class="pill" style="background:#E4E6E9;color:#5B6472;">Excluded</span>' : '<span class="pill" style="background:#FFF1D6;color:#8A6A00;">Unmatched</span>';
      return `<tr>
        <td style="font-family:var(--mono);max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.title}</td>
        <td class="num">${r.count}</td>
        <td>${pill}</td>
        <td>${c===null? `<button class="btn ghost small quickAdd" data-s="${r.title.replace(/"/g,'&quot;')}">Add rule</button>` : ''}</td>
      </tr>`;
    }).join('')}
    </tbody></table></div>
    ${filtered.length>cap? `<div class="hint" style="margin-top:8px;">Showing first ${cap} of ${filtered.length} matching titles &mdash; narrow your search to see more specific ones.</div>`:''}`;
  wrap.querySelectorAll('.quickAdd').forEach(btn=> btn.onclick = ()=>{
    document.getElementById('newPattern').value = btn.dataset.s.slice(0,50);
    document.getElementById('newPattern').scrollIntoView({behavior:'smooth', block:'center'});
  });
}

function conditionsPassesFilter(c){
  const matchesType = S.condFilter.rcType==='ALL' || c.rc_type===S.condFilter.rcType;
  const s = S.condFilter.search.trim().toLowerCase();
  const matchesSearch = !s || c.hub_name.toLowerCase().includes(s);
  return matchesType && matchesSearch;
}
function renderConditionsTable(){
  const wrap = document.getElementById('condTableWrap');
  if(!wrap) return;
  const indexed = S.data.conditions.map((c,i)=>({c,i})).filter(({c})=>conditionsPassesFilter(c));
  const countEl = document.getElementById('condCount');
  const filtered = S.condFilter.search || S.condFilter.rcType!=='ALL';
  if(countEl) countEl.textContent = filtered ? (indexed.length+' of '+S.data.conditions.length) : S.data.conditions.length;
  wrap.innerHTML = `<div class="scrollbox"><table class="datatable"><thead><tr>
      <th>hub_name</th><th>RC Type</th><th>Min Orders</th><th>MG Amount</th><th>Var Pay</th>
    </tr></thead><tbody>
    ${indexed.map(({c,i})=>`<tr>
      <td style="font-family:var(--mono);">${c.hub_name}</td>
      <td><select class="condType" data-i="${i}">${['MG','V','F+V','F+V1','F+V2','F+V3'].map(t=>`<option value="${t}" ${c.rc_type===t?'selected':''}>${t}</option>`).join('')}</select></td>
      <td><input type="number" class="condMin" data-i="${i}" value="${c.min_orders}" style="width:70px;"></td>
      <td><input type="number" class="condMg" data-i="${i}" value="${c.mg_amount}" style="width:80px;"></td>
      <td><input type="number" class="condVar" data-i="${i}" value="${c.var_pay}" style="width:70px;"></td>
    </tr>`).join('')}
    </tbody></table></div>
    ${indexed.length===0? '<div class="hint" style="margin-top:8px;">No hubs match this search/filter.</div>':''}`;
  wrap.querySelectorAll('.condType').forEach(sel=> sel.onchange = e=>{ S.data.conditions[e.target.dataset.i].rc_type = e.target.value; });
  wrap.querySelectorAll('.condMin').forEach(inp=> inp.onchange = e=>{ S.data.conditions[e.target.dataset.i].min_orders = parseFloat(e.target.value)||0; });
  wrap.querySelectorAll('.condMg').forEach(inp=> inp.onchange = e=>{ S.data.conditions[e.target.dataset.i].mg_amount = parseFloat(e.target.value)||0; });
  wrap.querySelectorAll('.condVar').forEach(inp=> inp.onchange = e=>{ S.data.conditions[e.target.dataset.i].var_pay = parseFloat(e.target.value)||0; });
}
function varConditionsPassesFilter(v){
  const s = S.varFilter.search.trim().toLowerCase();
  return !s || v.hub_name.toLowerCase().includes(s);
}
function renderVarConditionsTable(){
  const wrap = document.getElementById('varTableWrap');
  if(!wrap) return;
  const tierCols = [1,2,3,4,5,6,7];
  const indexed = S.data.varConditions.map((v,i)=>({v,i})).filter(({v})=>varConditionsPassesFilter(v));
  const countEl = document.getElementById('varCount');
  if(countEl) countEl.textContent = S.varFilter.search ? (indexed.length+' of '+S.data.varConditions.length) : S.data.varConditions.length;
  wrap.innerHTML = `<div class="scrollbox"><table class="datatable"><thead><tr>
      <th>hub_name</th>${tierCols.map(n=>`<th>O${n}</th>`).join('')}${tierCols.map(n=>`<th>Var${n}</th>`).join('')}
    </tr></thead><tbody>
    ${indexed.map(({v,i})=>`<tr>
      <td style="font-family:var(--mono);">${v.hub_name}</td>
      ${tierCols.map(n=>`<td><input type="number" class="varO" data-i="${i}" data-t="${n-1}" value="${v.O[n-1]===null||v.O[n-1]===undefined?'':v.O[n-1]}" style="width:56px;"></td>`).join('')}
      ${tierCols.map(n=>`<td><input type="number" class="varV" data-i="${i}" data-t="${n-1}" value="${v.V[n-1]===null||v.V[n-1]===undefined?'':v.V[n-1]}" style="width:56px;"></td>`).join('')}
    </tr>`).join('')}
    </tbody></table></div>
    ${indexed.length===0? '<div class="hint" style="margin-top:8px;">No hubs match this search.</div>':''}`;
  wrap.querySelectorAll('.varO').forEach(inp=> inp.onchange = e=>{
    const v = e.target.value.trim();
    S.data.varConditions[e.target.dataset.i].O[e.target.dataset.t] = v===''? null : (parseFloat(v)||0);
  });
  wrap.querySelectorAll('.varV').forEach(inp=> inp.onchange = e=>{
    const v = e.target.value.trim();
    S.data.varConditions[e.target.dataset.i].V[e.target.dataset.t] = v===''? null : (parseFloat(v)||0);
  });
}

function renderChecks(){
  const main = document.getElementById('main');
  main.innerHTML = `
    <h1 class="pagetitle">Review rates</h1>
    <p class="pagesub">Conditions and Var Conditions were generated from RC &mdash; review and edit anything below before moving on. Nothing here silently guesses on your behalf.</p>
    <div id="checksBody"></div>
    <button class="btn ghost" data-tab="upload">&larr; Back</button>
    <button class="btn amber" data-tab="orders" style="margin-left:8px;">Continue to Orders &rarr;</button>
  `;
  const body = document.getElementById('checksBody');
  let html = '';

  const RC_TYPES = ['MG','V','F+V','F+V1','F+V2','F+V3'];
  html += `<div class="card"><h2>Conditions (<span id="condCount">${S.data.conditions.length}</span> hubs)</h2>
    <div class="hint">Generated from RC. Edit any cell directly &mdash; changes are used immediately when you compute.</div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
      <input type="text" id="condSearch" placeholder="Search hub name or code&hellip;" value="${S.condFilter.search.replace(/"/g,'&quot;')}" style="flex:0 1 240px;min-width:160px;">
      <select id="condTypeFilter" style="min-width:140px;">
        <option value="ALL" ${S.condFilter.rcType==='ALL'?'selected':''}>All RC Types</option>
        ${RC_TYPES.map(t=>`<option value="${t}" ${S.condFilter.rcType===t?'selected':''}>${t} only</option>`).join('')}
      </select>
    </div>
    <div id="condTableWrap"></div>
  </div>`;

  if(S.data.varConditions.length){
    html += `<div class="card"><h2>Var Conditions (<span id="varCount">${S.data.varConditions.length}</span> V-type hubs)</h2>
      <div class="hint">Generated from RC. Blank tiers mean that tier doesn't apply to this hub.</div>
      <div style="margin-bottom:12px;">
        <input type="text" id="varSearch" placeholder="Search hub name or code&hellip;" value="${S.varFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;">
      </div>
      <div id="varTableWrap"></div>
    </div>`;
  }

  if(S.duplicates.length){
    html += `<div class="card"><h2>Duplicate hub entries (${S.duplicates.length})</h2>
      <div class="hint">These hub names collapse to the same base name (e.g. a "(Moved to ...)" suffix). A plain, non-suffixed entry is auto-selected if one exists &mdash; a "Moved to" entry is never chosen automatically.</div>`;
    S.duplicates.forEach((d,i)=>{
      const current = S.duplicateChoice[d.base] !== undefined ? S.duplicateChoice[d.base] : pickDefaultDuplicate(d.variants);
      html += `<div style="padding:10px 0;border-bottom:1px solid #F0F1F2;">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px;">${d.base}</div>
        ${!current ? '<div class="alertbox warn" style="margin-bottom:8px;"><span>&#9888;</span><div>No plain entry to default to &mdash; every variant here has a suffix. Pick one below, or this hub is excluded from this week\'s calculation.</div></div>' : ''}
        ${d.variants.map(v=>`
          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0;">
            <input type="radio" name="dup_${i}" value="${v.hub_name}" ${current===v.hub_name?'checked':''}>
            <span style="font-family:var(--mono);">${v.hub_name}</span>
            <span class="pill ${v.rc_type.toLowerCase().includes('v')&&v.rc_type!=='V'?'fv':(v.rc_type==='V'?'v':'mg')}">${v.rc_type}</span>
          </label>`).join('')}
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="alertbox ok"><span>&#10003;</span><div><b>No duplicate hub entries found</b>in the Conditions sheet.</div></div>`;
  }

  const hubMismatches = detectHubNameMismatches();
  const confirmedMappings = Object.keys(S.hubNameMap);
  if(hubMismatches.length || confirmedMappings.length){
    html += `<div class="card"><h2>Hub name mismatches (${hubMismatches.length})</h2>
      <div class="hint">These hub names in Orders or Login Hours don't exactly match any Conditions hub &mdash; but look like the same hub under a shortened or differently-suffixed name (e.g. a missing store code). Confirm the correct match, or mark it as a genuinely different/new store.</div>`;
    hubMismatches.forEach((m,i)=>{
      html += `<div style="padding:10px 0;border-bottom:1px solid #F0F1F2;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-family:var(--mono);font-size:12.5px;flex:0 0 auto;">${m.raw}</span>
        <span style="color:var(--text-dim);">&rarr;</span>
        <select class="hubMapSelect" data-raw="${m.raw.replace(/"/g,'&quot;')}" style="flex:1;min-width:220px;">
          <option value="">Not a match &mdash; treat as a new/different store</option>
          ${m.candidates.map(c=>`<option value="${c.replace(/"/g,'&quot;')}" ${m.best===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <button class="btn ghost small hubMapConfirm" data-raw="${m.raw.replace(/"/g,'&quot;')}">Confirm</button>
      </div>`;
    });
    if(confirmedMappings.length){
      html += `<div style="margin-top:12px;"><div class="hint" style="margin-bottom:6px;">Already mapped:</div>`;
      confirmedMappings.forEach(raw=>{
        html += `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0;">
          <span style="font-family:var(--mono);">${raw}</span>
          <span style="color:var(--text-dim);">&rarr;</span>
          <span style="font-family:var(--mono);font-weight:600;">${S.hubNameMap[raw]}</span>
          <button class="btn ghost small hubMapUndo" data-raw="${raw.replace(/"/g,'&quot;')}" style="margin-left:auto;">Undo</button>
        </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }

  if(S.newStores.length){
    html += `<div class="card"><h2>New stores not in Conditions (${S.newStores.length})</h2>
      <div class="hint">These appear in Orders or Login Hours but have no row in Conditions. Classify each, or leave unchecked to exclude it from this week's calculation.</div>
      <div class="scrollbox"><table class="datatable"><thead><tr><th>Include</th><th>hub_name</th><th>RC Type</th><th>Min Orders</th><th>MG Amount</th><th>Var Pay</th></tr></thead><tbody>`;
    S.newStores.forEach(h=>{
      const d = S.newStoreDraft[h] || {rcType:'MG',minOrders:0,mgAmount:0,varPay:0,include:true};
      html += `<tr>
        <td><input type="checkbox" class="nsInclude" data-h="${h}" ${d.include?'checked':''}></td>
        <td style="font-family:var(--mono);">${h}</td>
        <td><select class="nsType" data-h="${h}">
          ${['MG','V','F+V','F+V1','F+V2','F+V3'].map(t=>`<option value="${t}" ${d.rcType===t?'selected':''}>${t}</option>`).join('')}
        </select></td>
        <td><input type="number" class="nsMin" data-h="${h}" value="${d.minOrders}" style="width:70px;"></td>
        <td><input type="number" class="nsMg" data-h="${h}" value="${d.mgAmount}" style="width:80px;"></td>
        <td><input type="number" class="nsVar" data-h="${h}" value="${d.varPay}" style="width:70px;"></td>
      </tr>`;
    });
    html += `</tbody></table></div></div>`;
  } else {
    html += `<div class="alertbox ok"><span>&#10003;</span><div><b>No unrecognised stores</b> &mdash; every hub in this week's activity data exists in Conditions.</div></div>`;
  }

  if(S.rcReview.length){
    html += `<div class="card"><h2>Generated from RC &mdash; needs a look (${S.rcReview.length})</h2>
      <div class="hint">These were flagged while generating Conditions from RC. Nothing was silently guessed &mdash; check each and edit the row directly in the tables above if needed.</div>
      <div class="scrollbox"><table class="datatable"><thead><tr><th>hub_name</th><th>Reason</th></tr></thead><tbody>
      ${S.rcReview.map(r=>`<tr><td style="font-family:var(--mono);">${r.hub_name}</td><td>${r.reason}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  }

  body.innerHTML = html;
  renderConditionsTable();
  renderVarConditionsTable();
  const condSearch = document.getElementById('condSearch');
  if(condSearch) condSearch.oninput = e=>{ S.condFilter.search = e.target.value; renderConditionsTable(); };
  const condTypeFilter = document.getElementById('condTypeFilter');
  if(condTypeFilter) condTypeFilter.onchange = e=>{ S.condFilter.rcType = e.target.value; renderConditionsTable(); };
  const varSearch = document.getElementById('varSearch');
  if(varSearch) varSearch.oninput = e=>{ S.varFilter.search = e.target.value; renderVarConditionsTable(); };

  body.querySelectorAll('input[type=radio]').forEach(r=> r.onchange = e=>{
    const base = e.target.name.replace('dup_','');
    const idx = parseInt(e.target.name.split('_')[1]);
    S.duplicateChoice[S.duplicates[idx].base] = e.target.value;
  });
  body.querySelectorAll('.nsInclude').forEach(cb=> cb.onchange = e=>{
    const h = e.target.dataset.h;
    S.newStoreDraft[h] = S.newStoreDraft[h] || {rcType:'MG',minOrders:0,mgAmount:0,varPay:0,include:true};
    S.newStoreDraft[h].include = e.target.checked;
  });
  ['nsType','nsMin','nsMg','nsVar'].forEach(cls=>{
    body.querySelectorAll('.'+cls).forEach(inp=> inp.onchange = e=>{
      const h = e.target.dataset.h;
      S.newStoreDraft[h] = S.newStoreDraft[h] || {rcType:'MG',minOrders:0,mgAmount:0,varPay:0,include:true};
      if(cls==='nsType') S.newStoreDraft[h].rcType = e.target.value;
      if(cls==='nsMin') S.newStoreDraft[h].minOrders = e.target.value;
      if(cls==='nsMg') S.newStoreDraft[h].mgAmount = e.target.value;
      if(cls==='nsVar') S.newStoreDraft[h].varPay = e.target.value;
    });
  });
  body.querySelectorAll('.hubMapConfirm').forEach(btn=> btn.onclick = ()=>{
    const raw = btn.dataset.raw;
    const sel = body.querySelector(`.hubMapSelect[data-raw="${CSS.escape(raw)}"]`);
    const target = sel ? sel.value : '';
    if(target){
      S.hubNameMap[raw] = target;
      // If this raw name had already been given "new store" classification (e.g. from
      // before it was recognized as a mismatch), drop that draft — it's a mapped hub now.
      delete S.newStoreDraft[raw];
    }
    // If left on "Not a match", nothing is mapped — it'll fall through to New Stores.
    render();
  });
  body.querySelectorAll('.hubMapUndo').forEach(btn=> btn.onclick = ()=>{
    delete S.hubNameMap[btn.dataset.raw];
    render();
  });

  main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}

let resultsSubtab = 'mg';
let currentTableRows = [];
let currentTableType = '';
const CLICKABLE_COLS = new Set(['hub_name','rider_id','orders','amount_added','actual_amount']);
function tableFor(rows, cols, labels, tableType){
  currentTableRows = rows;
  currentTableType = tableType;
  if(!rows.length) return '<div class="hint">No rows.</div>';
  const shown = rows.slice(0,300);
  let h = '<div class="scrollbox"><table class="datatable"><thead><tr>' + cols.map((c,i)=>`<th class="${typeof rows[0][c]==='number'?'num':''}">${labels[i]}</th>`).join('') + '</tr></thead><tbody>';
  shown.forEach((r,idx)=>{
    h += '<tr>' + cols.map(c=>{
      const v = r[c];
      const isNum = typeof v === 'number';
      const display = isNum? (c.includes('amount')||c.includes('added')||c.includes('incentives')||c.includes('pending')||c.includes('balancing') ? fmtMoney(v) : v) : v;
      const cellContent = CLICKABLE_COLS.has(c) ? `<span class="cell-link" data-idx="${idx}" data-col="${c}">${display}</span>` : display;
      return `<td class="${isNum?'num':''}">${cellContent}</td>`;
    }).join('') + '</tr>';
  });
  h += '</tbody></table></div>';
  if(rows.length>300) h += `<div class="hint" style="margin-top:8px;">Showing first 300 of ${rows.length.toLocaleString()} rows &mdash; full data is in the downloaded workbook.</div>`;
  return h;
}
function wireTableClicks(wrap){
  wrap.querySelectorAll('.cell-link').forEach(el=> el.onclick = ()=>{
    const idx = parseInt(el.dataset.idx);
    const col = el.dataset.col;
    const row = currentTableRows[idx];
    if(!row) return;
    if(col==='hub_name') openStoreModal(row.hub_name);
    else if(col==='rider_id') openRiderModal(row.rider_id, currentTableType);
    else if(col==='orders') openOrdersModal(row, currentTableType);
    else if(col==='amount_added') openAddedModal(row, currentTableType);
    else if(col==='actual_amount') openActualModal(row, currentTableType);
  });
}

/* =========================================================================
   MODALS
   ========================================================================= */
function openModal(titleHtml, bodyHtml){
  document.getElementById('modalCard').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <h3>${titleHtml}</h3>
      <button id="modalCloseBtn" class="btn ghost small" style="flex:0 0 auto;">&times;</button>
    </div>
    ${bodyHtml}
  `;
  document.getElementById('modalWrap').classList.add('show');
  document.getElementById('modalCloseBtn').onclick = closeModal;
}
function closeModal(){ document.getElementById('modalWrap').classList.remove('show'); }

function openStoreModal(hub_name){
  const cond = S.condMap[hub_name] || S.data.conditions.find(c=>c.hub_name===hub_name);
  const varc = S.varMap[hub_name];
  const fvc = S.fvMap[hub_name];
  if(!cond){ openModal(hub_name, '<p class="mhint">No Conditions data found for this hub.</p>'); return; }
  let body = `<div class="kv"><span>RC Type</span><b>${cond.rc_type}</b></div>
    <div class="kv"><span>Min Orders</span><b>${cond.min_orders}</b></div>
    <div class="kv"><span>MG Amount</span><b>${fmtMoney(cond.mg_amount)}</b></div>
    <div class="kv"><span>Var Pay</span><b>${cond.var_pay}</b></div>
    <div class="kv"><span>EPH Eligible</span><b>${cond.eph_eligible?'Y':'N'}</b></div>`;
  if(cond.eph_eligible){
    body += `<div class="kv"><span>EPH Max Login Hours</span><b>${cond.eph_min_hours}</b></div>
      <div class="kv"><span>EPH Max Orders</span><b>${cond.eph_min_orders}</b></div>
      <div class="kv"><span>EPH Amount</span><b>${fmtMoney(cond.eph_amount)}</b></div>`;
  }
  if(varc){
    body += `<h4 style="margin:16px 0 6px;font-size:12.5px;">Var Conditions tiers</h4>
      <div class="scrollbox"><table class="datatable"><thead><tr>${[1,2,3,4,5,6,7].map(n=>`<th>O${n}</th>`).join('')}${[1,2,3,4,5,6,7].map(n=>`<th>Var${n}</th>`).join('')}</tr></thead>
      <tbody><tr>${varc.O.map(x=>`<td class="num">${x===null?'':x}</td>`).join('')}${varc.V.map(x=>`<td class="num">${x===null?'':x}</td>`).join('')}</tr></tbody></table></div>`;
  }
  if(fvc){
    body += `<h4 style="margin:16px 0 6px;font-size:12.5px;">F+V Conditions tiers</h4>
      <div class="scrollbox"><table class="datatable"><thead><tr>${[1,2,3,4,5,6,7].map(n=>`<th>O${n}</th>`).join('')}${[1,2,3,4,5,6,7].map(n=>`<th>Amt${n}</th>`).join('')}</tr></thead>
      <tbody><tr>${fvc.O.map(x=>`<td class="num">${x===null?'':x}</td>`).join('')}${fvc.A.map(x=>`<td class="num">${x===null?'':x}</td>`).join('')}</tr></tbody></table></div>`;
  }
  openModal(hub_name, body);
}

function buildShareCardHTML(rider_id, rows, cols, labels){
  const rowsHtml = rows.map((r,i)=>`<tr style="background:${i%2===0?'#ffffff':'#F4F6F5'};">
    ${cols.map(c=>{
      const v = r[c];
      const isMoney = typeof v==='number' && (c.includes('amount')||c.includes('added')||c.includes('incentives')||c.includes('pending'));
      return `<td style="padding:8px 12px;border-bottom:1px solid #E4E6E9;font-size:13px;white-space:nowrap;color:#1B2420;">${isMoney?fmtMoney(v):v}</td>`;
    }).join('')}
  </tr>`).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;width:fit-content;">
    <div style="background:#132A24;color:#ffffff;padding:16px 20px;">
      <div style="font-size:19px;font-weight:800;">Rider ${rider_id}</div>
      <div style="font-size:12px;color:#D4D14E;margin-top:3px;">Payout Calculator Amazon</div>
    </div>
    <table style="border-collapse:collapse;">
      <thead><tr style="background:#3B8672;">
        ${labels.map(l=>`<th style="padding:9px 12px;font-size:11.5px;color:#ffffff;text-align:left;white-space:nowrap;">${l}</th>`).join('')}
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
}
function copyRiderImageToClipboard(rider_id, rows, cols, labels, btn){
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '&hellip;';

  // Build the image asynchronously as a Promise<Blob>, but do NOT await it before
  // calling navigator.clipboard.write() below -- some browsers (notably Safari) only
  // allow clipboard writes that happen synchronously within the click handler that
  // triggered them. Passing a pending promise as the ClipboardItem's data lets the
  // write be registered immediately while the actual image renders in the background.
  const blobPromise = (async ()=>{
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
    wrapper.innerHTML = buildShareCardHTML(rider_id, rows, cols, labels);
    document.body.appendChild(wrapper);
    const canvas = await html2canvas(wrapper.firstElementChild, {scale:2, backgroundColor:'#ffffff'});
    document.body.removeChild(wrapper);
    return await new Promise(resolve=> canvas.toBlob(resolve, 'image/png'));
  })();

  if(typeof ClipboardItem==='undefined' || !navigator.clipboard || !navigator.clipboard.write){
    btn.innerHTML = 'No clipboard image support';
    setTimeout(()=>{ btn.innerHTML = originalHtml; }, 2200);
    return;
  }
  navigator.clipboard.write([new ClipboardItem({'image/png': blobPromise})])
    .then(()=>{ btn.innerHTML = '&#10003;'; setTimeout(()=>{ btn.innerHTML = originalHtml; }, 1800); })
    .catch(e=>{
      console.warn('Could not copy image to clipboard', e);
      btn.innerHTML = 'Copy failed';
      setTimeout(()=>{ btn.innerHTML = originalHtml; }, 2200);
    });
}
function openRiderModal(rider_id, tableType){
  let cols, labels;
  if(tableType==='mg'){
    cols=['date','hub_name','rc_type','login_hours','orders','min_orders','mg_amount','var_pay','amount_added','incentives','total_added','actual_amount','pending_amount'];
    labels=['Date','Hub','Type','Login Hrs','Orders','Min Ord','MG Amt','Var Pay','Added','Incentives','Total Added','Actual','Pending'];
  } else if(tableType==='v'){
    cols=['date','hub_name','login_hours','orders','amount_added','incentives','actual_amount','pending_amount'];
    labels=['Date','Hub','Login Hrs','Orders','Added','Incentives','Actual','Pending'];
  } else {
    cols=['hub_name','rc_type','login_hours','orders','var_pay','amount_added','incentives','actual_amount','pending_amount'];
    labels=['Hub','Type','Login Hrs (wk)','Orders','Var Pay','Added','Incentives','Actual','Pending'];
  }
  const rows = S.results[tableType].filter(r=>r.rider_id===rider_id);
  const body = `
    <button class="btn ghost small icononly" id="copyImageBtn" title="Copy image to clipboard" style="margin-bottom:10px;">&#128203;</button>
    <div class="scrollbox"><table class="datatable"><thead><tr>${cols.map((c,i)=>`<th>${labels[i]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${cols.map(c=>{
      const v = r[c];
      const isMoney = typeof v==='number' && (c.includes('amount')||c.includes('added')||c.includes('incentives')||c.includes('pending'));
      return `<td class="${typeof v==='number'?'num':''}">${isMoney?fmtMoney(v):v}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
  openModal('Rider '+rider_id, body);
  const copyBtn = document.getElementById('copyImageBtn');
  if(copyBtn) copyBtn.onclick = ()=> copyRiderImageToClipboard(rider_id, rows, cols, labels, copyBtn);
}

function openOrdersModal(row, tableType){
  const isWeekly = tableType==='fv';
  const rows = S.data.orders.filter(o=> o.rider_id===row.rider_id && o.hub_name===row.hub_name && (isWeekly || o.date===row.date));
  const body = rows.length ? `<div class="scrollbox"><table class="datatable"><thead><tr><th>Date</th><th>Hub</th><th class="num">Delivered Orders</th></tr></thead>
    <tbody>${rows.map(o=>`<tr><td>${o.date}</td><td>${o.hub_name}</td><td class="num">${o.delivered_orders}</td></tr>`).join('')}</tbody></table></div>
    <p class="mhint" style="margin-top:10px;">${isWeekly? 'All days in the week for this rider at this hub, summed to the weekly Orders total shown.' : "The row(s) that make up this day's Orders total."}</p>`
    : '<p class="mhint">No matching order rows found.</p>';
  openModal('Orders &mdash; '+row.rider_id+' @ '+row.hub_name, body);
}

function openAddedModal(row, tableType){
  const isWeekly = tableType==='fv';
  const rows = S.data.valinor.filter(v=> v.rider_id===row.rider_id && (isWeekly || v.date===row.date));
  const ruleIndex = buildRuleIndex(S.rules);
  const body = rows.length ? `<div class="scrollbox"><table class="datatable"><thead><tr><th>Date</th><th>Payout Sub Title</th><th class="num">Amount</th><th>Considered</th></tr></thead>
    <tbody>${rows.map(v=>{
      const c = matchConsideredIndexed(v.payout_sub_title, ruleIndex);
      const pill = c==='Y' ? '<span class="pill y">Y</span>' : c==='N' ? '<span class="pill n">N</span>' : c==='X' ? '<span class="pill" style="background:#E4E6E9;color:#5B6472;">Excluded</span>' : '<span class="pill" style="background:#FFF1D6;color:#8A6A00;">Unmatched</span>';
      return `<tr><td>${v.date}</td><td style="font-family:var(--mono);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v.payout_sub_title}</td><td class="num">${fmtMoney(v.amount)}</td><td>${pill}</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="mhint" style="margin-top:10px;">Only rows marked Y count toward the Amount Added total shown. ${isWeekly?'All Valinor rows for this rider across the week (F+V matches by rider only, not by date).':'Rows for this rider on this specific date.'}</p>`
    : '<p class="mhint">No matching Valinor rows found for this rider.</p>';
  openModal('Valinor Added Data &mdash; '+row.rider_id, body);
}

function renderSlabTable(labelPrefix1, arr1, labelPrefix2, arr2, matchedIdx){
  const cols = [0,1,2,3,4,5,6].filter(i=> arr1[i]!==null && arr1[i]!==undefined);
  if(!cols.length) return '';
  return `<div class="scrollbox" style="margin-top:10px;"><table class="datatable"><thead><tr>
      ${cols.map(i=>`<th>${labelPrefix1}${i+1}</th>`).join('')}${cols.map(i=>`<th>${labelPrefix2}${i+1}</th>`).join('')}
    </tr></thead><tbody><tr>
      ${cols.map(i=>`<td class="num" style="${i===matchedIdx?'background:#E1F3E4;font-weight:700;':''}">${arr1[i]}</td>`).join('')}
      ${cols.map(i=>`<td class="num" style="${i===matchedIdx?'background:#E1F3E4;font-weight:700;':''}">${arr2[i]===null?'&mdash;':arr2[i]}</td>`).join('')}
    </tr></tbody></table></div>
    <p class="mhint" style="margin-top:6px;">Highlighted column is the tier that matched this rider's order count.</p>`;
}
function openActualModal(row, tableType){
  let lines = [];
  let slabHtml = '';
  let explainedActual = row.actual_amount; // overwritten below with the freshly-computed value
  if(tableType==='mg'){
    const meets = (row.login_hours>=8.5 && row.orders>=row.min_orders);
    lines.push(`Login Hours: ${row.login_hours} ${row.login_hours>=8.5?'&ge;':'&lt;'} 8.5 &rarr; ${row.login_hours>=8.5?'met':'not met'}`);
    lines.push(`Orders: ${row.orders} ${row.orders>=row.min_orders?'&ge;':'&lt;'} Min Orders (${row.min_orders}) &rarr; ${row.orders>=row.min_orders?'met':'not met'}`);
    explainedActual = meets ? Math.max(row.mg_amount, row.orders*row.var_pay) : row.orders*row.var_pay;
    if(meets){
      lines.push(`Both conditions met &rarr; Actual = MAX(MG Amount, Orders &times; Var Pay)`);
      lines.push(`= MAX(${fmtMoney(row.mg_amount)}, ${row.orders} &times; ${fmtMoney(row.var_pay)} = ${fmtMoney(row.orders*row.var_pay)})`);
    } else {
      lines.push(`Condition(s) not met &rarr; Actual = Orders &times; Var Pay = ${row.orders} &times; ${fmtMoney(row.var_pay)}`);
    }
    lines.push(`<b>= ${fmtMoney(explainedActual)}</b>`);
  } else if(tableType==='v'){
    const vc = S.varMap[row.hub_name];
    const cond = S.condMap[row.hub_name];
    if(!vc){
      explainedActual = row.orders*(cond?cond.var_pay:0);
      lines.push('No Var Conditions tier data for this hub &mdash; used Orders &times; Var Pay directly.');
      lines.push(`= ${row.orders} &times; ${fmtMoney(cond?cond.var_pay:0)} <b>= ${fmtMoney(explainedActual)}</b>`);
    } else {
      let tierIdx=0;
      for(let i=6;i>=0;i--){ if(vc.O[i]!==null && row.orders>=vc.O[i]){ tierIdx=i; break; } }
      const rate = findVarRate(vc, tierIdx);
      const rawTierRate = vc.V[tierIdx];
      explainedActual = row.orders*rate;
      if(rawTierRate===0 && rate!==0){
        lines.push(`Orders (${row.orders}) &ge; O${tierIdx+1} (${vc.O[tierIdx]}) &rarr; matched tier ${tierIdx+1}, but Var${tierIdx+1} is 0 in RC (not a real rate) &rarr; fell back to the most recent tier with a real rate: ${fmtMoney(rate)}`);
      } else {
        lines.push(`Orders (${row.orders}) &ge; O${tierIdx+1} (${vc.O[tierIdx]}) &rarr; matched tier ${tierIdx+1}, rate = ${fmtMoney(rate)}`);
      }
      lines.push(`= ${row.orders} &times; ${fmtMoney(rate)} <b>= ${fmtMoney(explainedActual)}</b>`);
      slabHtml = renderSlabTable('O', vc.O, 'Var', vc.V, tierIdx);
    }
  } else {
    const cond = S.condMap[row.hub_name];
    const fvc = S.fvMap[row.hub_name];
    const varPay = row.var_pay;
    const orders = row.orders;
    if(!fvc){
      explainedActual = orders*varPay;
      lines.push('No F+V Conditions tier data for this hub &mdash; used Orders &times; Var Pay directly.');
      lines.push(`= ${orders} &times; ${fmtMoney(varPay)} <b>= ${fmtMoney(explainedActual)}</b>`);
    } else {
      let tierIdx=-1;
      for(let i=6;i>=0;i--){ if(fvc.O[i]!==null && orders>=fvc.O[i]){ tierIdx=i; break; } }
      if(tierIdx===-1){
        explainedActual = orders*varPay;
        lines.push(`Orders (${orders}) below the first tier threshold &rarr; Orders &times; Var Pay`);
        lines.push(`= ${orders} &times; ${fmtMoney(varPay)} <b>= ${fmtMoney(explainedActual)}</b>`);
      } else if(tierIdx===6 || fvc.O[tierIdx+1]===null){
        lines.push(`Orders (${orders}) &ge; O${tierIdx+1} (${fvc.O[tierIdx]}) &rarr; top tier reached (${row.rc_type})`);
        if(row.rc_type==='F+V'){
          explainedActual = Math.max(orders*varPay, orders*50+300);
          lines.push(`F+V top tier: MAX(Orders&times;VarPay, Orders&times;50+300)`);
          lines.push(`= MAX(${orders}&times;${varPay}=${fmtMoney(orders*varPay)}, ${orders}&times;50+300=${fmtMoney(orders*50+300)})`);
        } else {
          const overflow = Math.max(orders-fvc.O[tierIdx],0);
          explainedActual = (fvc.A[tierIdx]||0) + overflow*varPay;
          lines.push(`${row.rc_type} top tier: Amt${tierIdx+1} + (orders beyond threshold) &times; VarPay`);
          lines.push(`= ${fmtMoney(fvc.A[tierIdx]||0)} + (${orders}-${fvc.O[tierIdx]}=${overflow}) &times; ${varPay} = ${fmtMoney(fvc.A[tierIdx]||0)} + ${fmtMoney(overflow*varPay)}`);
        }
        lines.push(`<b>= ${fmtMoney(explainedActual)}</b>`);
      } else {
        const flatAmt = fvc.A[tierIdx];
        if(flatAmt!==null && flatAmt!==0){
          explainedActual = flatAmt;
          lines.push(`Orders (${orders}) &ge; O${tierIdx+1} (${fvc.O[tierIdx]}), below the next tier &rarr; flat Amt${tierIdx+1}`);
        } else {
          explainedActual = orders*varPay;
          lines.push(`Orders (${orders}) &ge; O${tierIdx+1} (${fvc.O[tierIdx]}), but Amt${tierIdx+1} is 0 (a placeholder, no real MG floor at this tier) &rarr; Orders &times; Var Pay`);
          lines.push(`= ${orders} &times; ${fmtMoney(varPay)}`);
        }
        lines.push(`<b>= ${fmtMoney(explainedActual)}</b>`);
      }
      slabHtml = renderSlabTable('O', fvc.O, 'Amt', fvc.A, tierIdx);
    }
  }
  let staleWarning = '';
  if(Math.abs(explainedActual - row.actual_amount) > 0.01){
    staleWarning = `<div class="alertbox warn" style="margin-top:12px;"><span>&#9888;</span><div>This works out to <b>${fmtMoney(explainedActual)}</b> using the current Conditions data, but the table shows <b>${fmtMoney(row.actual_amount)}</b> &mdash; something (Conditions, Var Conditions, or F+V Conditions) has changed since this was last computed. Go to EPH Balancing and click "Run computation" again to refresh the table.</div></div>`;
  }
  openModal('How Actual was calculated &mdash; '+row.rider_id, `<div style="font-size:13px;line-height:1.9;">${lines.join('<br>')}</div>${slabHtml}${staleWarning}`);
}

function renderResults(){
  const main = document.getElementById('main');
  if(!S.computed){
    main.innerHTML = `<h1 class="pagetitle">Results</h1>
      <div class="alertbox warn"><span>&#9888;</span><div><b>Nothing computed yet.</b> Go to EPH Balancing and click "Run computation".</div></div>
      <button class="btn ghost" data-tab="eph">&larr; Go to EPH Balancing</button>`;
    main.querySelector('[data-tab]').onclick = ()=>{ S.tab='eph'; render(); };
    return;
  }
  function sum(arr,key){ return arr.reduce((a,r)=>a+(r[key]||0),0); }
  const mgActual = sum(S.results.mg,'actual_amount'), mgAdded = sum(S.results.mg,'amount_added'), mgPending = sum(S.results.mg,'pending_amount');
  const vActual = sum(S.results.v,'actual_amount'), vAdded = sum(S.results.v,'amount_added'), vPending = sum(S.results.v,'pending_amount'), vEph = sum(S.results.v,'eph_balancing');
  const fvActual = sum(S.results.fv,'actual_amount'), fvAdded = sum(S.results.fv,'amount_added'), fvPending = sum(S.results.fv,'pending_amount'), fvEph = sum(S.results.fv,'eph_balancing');
  const totalActual = mgActual+vActual+fvActual;
  const totalAdded = mgAdded+vAdded+fvAdded;
  const totalPending = mgPending+vPending+fvPending;
  const totalEph = vEph+fvEph;
  const riderSet = new Set([...S.results.mg.map(r=>r.rider_id), ...S.results.v.map(r=>r.rider_id), ...S.results.fv.map(r=>r.rider_id)]);

  // If Login Hours was uploaded but every single MG row still shows 0 login hours,
  // that's almost certainly a broken join (e.g. rider IDs not matching between files)
  // rather than genuinely nobody logging in at all — flag it instead of computing
  // silently on data that's probably wrong.
  const mgRows = S.results.mg;
  const mgRowsWithOrders = mgRows.filter(r=>r.orders>0);
  const loginHoursLikelyBroken = S.data.loginHours.length>0 && mgRowsWithOrders.length>0 && mgRowsWithOrders.every(r=>r.login_hours===0);

  main.innerHTML = `
    <h1 class="pagetitle">Results ${S.weekLabel? '&mdash; '+S.weekLabel:''}</h1>
    <p class="pagesub">Computed from your uploaded files using the MG / Var / F+V logic, EPH balancing, and Considered rules configured earlier.</p>
    ${loginHoursLikelyBroken? `<div class="alertbox err"><span>&#9888;</span><div><b>Every MG row shows 0 login hours</b>, even though a Login Hours file was uploaded. This almost always means rider IDs (or hub names) aren't matching between your Orders and Login Hours files &mdash; check they use the same format (e.g. one isn't "123" while the other is "123.0"), then re-upload and recompute. MG bonuses can't be evaluated correctly until this is fixed.</div></div>` : ''}
    ${S.orderOnlyExcludedCount>0? `<div class="alertbox warn"><span>&#9888;</span><div><b>${S.orderOnlyExcludedCount} order row(s) excluded</b> because there's no matching Login Hours entry at all (e.g. marketplace/MKT riders who aren't tracked for login hours) &mdash; only riders with a Login Hours record are included in MG/Var/F+V.</div></div>` : ''}
    <div class="statgrid">
      <div class="stat"><div class="label">Total Actual Amount</div><div class="value">${fmtMoney(totalActual)}</div></div>
      <div class="stat"><div class="label">Already Added</div><div class="value">${fmtMoney(totalAdded)}</div></div>
      <div class="stat"><div class="label">Pending Amount</div><div class="value">${fmtMoney(totalPending)}</div></div>
      <div class="stat"><div class="label">Riders</div><div class="value">${riderSet.size.toLocaleString()}</div></div>
    </div>
    <div class="card" style="padding:14px 18px;margin-bottom:20px;">
      <div class="scrollbox" style="border:none;">
        <table class="datatable"><thead><tr>
          <th></th><th class="num">Actual</th><th class="num">Added</th><th class="num">EPH Balancing</th><th class="num">Pending</th>
        </tr></thead><tbody>
          <tr><td><span class="pill mg">MG</span></td><td class="num">${fmtMoney(mgActual)}</td><td class="num">${fmtMoney(mgAdded)}</td><td class="num">&mdash;</td><td class="num">${fmtMoney(mgPending)}</td></tr>
          <tr><td><span class="pill v">Var</span></td><td class="num">${fmtMoney(vActual)}</td><td class="num">${fmtMoney(vAdded)}</td><td class="num">${fmtMoney(vEph)}</td><td class="num">${fmtMoney(vPending)}</td></tr>
          <tr><td><span class="pill fv">F+V</span></td><td class="num">${fmtMoney(fvActual)}</td><td class="num">${fmtMoney(fvAdded)}</td><td class="num">${fmtMoney(fvEph)}</td><td class="num">${fmtMoney(fvPending)}</td></tr>
          <tr style="font-weight:700;border-top:2px solid #D8DBDE;"><td>Total</td><td class="num">${fmtMoney(totalActual)}</td><td class="num">${fmtMoney(totalAdded)}</td><td class="num">${fmtMoney(totalEph)}</td><td class="num">${fmtMoney(totalPending)}</td></tr>
        </tbody></table>
      </div>
    </div>
    ${S.unmatchedSubtitles.length? `<div class="alertbox warn"><span>&#9888;</span><div><b>${S.unmatchedSubtitles.length} payout title(s) in Valinor data didn't match any Considered rule</b> and were excluded from Amount Added / Incentives. <a href="#" id="goRules">Review them in Considered Rules &rarr;</a></div></div>` : ''}
    <div class="tabs">
      <button class="tabbtn ${resultsSubtab==='mg'?'active':''}" data-rt="mg">MG (${S.results.mg.length})</button>
      <button class="tabbtn ${resultsSubtab==='v'?'active':''}" data-rt="v">Var (${S.results.v.length})</button>
      <button class="tabbtn ${resultsSubtab==='fv'?'active':''}" data-rt="fv">F+V (${S.results.fv.length})</button>
    </div>
    <input type="text" id="resultsSearch" placeholder="Search rider ID or hub name&hellip;" value="${S.resultsFilter.search.replace(/"/g,'&quot;')}" style="width:100%;max-width:340px;margin-bottom:12px;">
    <div id="resultsTableWrap"></div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button class="btn amber" id="btnDownload">Download workbook (.xlsx)</button>
      <button class="btn ghost" data-tab="eph">&larr; Back to EPH Balancing</button>
    </div>
  `;
  renderResultsTable();
  document.getElementById('resultsSearch').oninput = e=>{ S.resultsFilter.search = e.target.value; renderResultsTable(); };
  document.getElementById('goRules') && (document.getElementById('goRules').onclick = e=>{ e.preventDefault(); S.tab='rules'; render(); });
  main.querySelectorAll('.tabbtn').forEach(b=> b.onclick = ()=>{ resultsSubtab=b.dataset.rt; render(); });
  main.querySelector('[data-tab]').onclick = ()=>{ S.tab='eph'; render(); };
  document.getElementById('btnDownload').onclick = downloadWorkbook;
}
function renderResultsTable(){
  const wrap = document.getElementById('resultsTableWrap');
  const s = S.resultsFilter.search.trim().toLowerCase();
  function applySearch(rows){
    if(!s) return rows;
    return rows.filter(r => String(r.rider_id).toLowerCase().includes(s) || String(r.hub_name).toLowerCase().includes(s));
  }
  if(resultsSubtab==='mg'){
    wrap.innerHTML = tableFor(applySearch(S.results.mg),
      ['date','hub_name','rider_id','rc_type','login_hours','orders','min_orders','mg_amount','var_pay','amount_added','incentives','total_added','actual_amount','pending_amount'],
      ['Date','Hub','Rider','Type','Login Hrs','Orders','Min Ord','MG Amt','Var Pay','Added','Incentives','Total Added','Actual','Pending'], 'mg');
  } else if(resultsSubtab==='v'){
    wrap.innerHTML = tableFor(applySearch(S.results.v),
      ['date','hub_name','rider_id','login_hours','orders','amount_added','incentives','actual_amount','pending_amount','eph_balancing'],
      ['Date','Hub','Rider','Login Hrs','Orders','Added','Incentives','Actual','Pending','EPH Bal'], 'v');
  } else {
    wrap.innerHTML = tableFor(applySearch(S.results.fv),
      ['hub_name','rider_id','rc_type','login_hours','orders','var_pay','amount_added','incentives','actual_amount','eph_eligible','eph_balancing','total_pending'],
      ['Hub','Rider','Type','Login Hrs (wk)','Orders','Var Pay','Added','Incentives','Actual','EPH?','EPH Amt','Pending'], 'fv');
  }
  wireTableClicks(wrap);
}

/* =========================================================================
   STORE CLOSURE
   ========================================================================= */
function distinctStoreClosureHubs(){
  return [...new Set(S.data.storeClosureLogins.map(r=>r.hub_name))].sort();
}
function newIncidentId(){ return 'inc_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }
function findIncident(id){ return S.storeClosureIncidents.find(i=>i.id===id); }
function timeOptionsDatalist(){
  let opts = '';
  for(let h=0;h<24;h++){
    for(let m=0;m<60;m+=15){
      const hh = String(h).padStart(2,'0'), mm = String(m).padStart(2,'0');
      opts += `<option value="${hh}:${mm}">`;
    }
  }
  return opts;
}
function renderStoreClosure(){
  const main = document.getElementById('main');
  const hubs = distinctStoreClosureHubs();
  main.innerHTML = `
    <h1 class="pagetitle">Store Closure</h1>
    <p class="pagesub">Compute EPH-style compensation for a specific store closure window, using each rider's actual first-seen/last-seen login timestamps for that day &mdash; not the regular daily Login Hours total.</p>
    <div class="card">
      <h2>1. Login data (first &amp; last seen)</h2>
      <div class="hint">Needs columns: rider_id, rider_name, date, hub_name, login_hours, first_seen, last_seen &mdash; first_seen/last_seen must be real timestamps (date + clock time), not just a date.</div>
      <input type="file" id="f_storeClosure" accept=".xlsx,.xls,.csv">
      <div class="status ${S.data.storeClosureLogins.length?'ok':''}">${S.data.storeClosureLogins.length? ('&#10003; '+S.data.storeClosureLogins.length+' rows loaded, '+hubs.length+' distinct store(s)') : 'No file loaded yet'}</div>
      ${S.storeClosureUploadError? `<div class="status" style="color:var(--red);margin-top:4px;">${S.storeClosureUploadError}</div>` : ''}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <h2>2. Closure incidents (${S.storeClosureIncidents.length})</h2>
        <button class="btn primary small" id="btnAddIncident" ${!hubs.length?'disabled':''}>+ Add incident</button>
      </div>
      <div class="hint">One incident per store + date. Add more than one time window on the same incident if a store closed, reopened, then closed again the same day &mdash; hours from every window are summed per rider.</div>
      <div id="incidentsWrap"></div>
      ${!S.storeClosureIncidents.length? '<div class="hint" style="margin-top:8px;">No incidents yet &mdash; upload login data above, then click "Add incident".</div>' : ''}
    </div>
    <datalist id="timeOptions">${timeOptionsDatalist()}</datalist>
    <button class="btn ghost" data-tab="results">&larr; Back to Results</button>
  `;
  renderIncidents();
  document.getElementById('f_storeClosure').onchange = async e=>{
    const file = e.target.files[0];
    if(!file) return;
    const result = await loadAndDiagnose(file, normalizeStoreClosureLogins, 'rider_id, date, hub_name, login_hours, first_seen, last_seen');
    S.data.storeClosureLogins = result.rows;
    S.storeClosureUploadError = result.message;
    render();
  };
  document.getElementById('btnAddIncident').onclick = ()=>{
    S.storeClosureIncidents.push({
      id: newIncidentId(), storeName: hubs[0]||'', date:'', windows:[{start:'',end:''}],
      amountAddedMode:'N', amountPerHour: 0
    });
    render();
  };
  main.querySelector('[data-tab]').onclick = ()=>{ S.tab='results'; render(); };
}
function renderIncidents(){
  const wrap = document.getElementById('incidentsWrap');
  if(!wrap) return;
  const hubs = distinctStoreClosureHubs();
  wrap.innerHTML = S.storeClosureIncidents.map(inc=>{
    const ready = inc.storeName && inc.date && inc.windows.some(w=>w.start&&w.end) && inc.amountPerHour>0;
    const results = ready ? computeStoreClosureResults(inc) : [];
    const totalEph = results.reduce((s,r)=>s+r.eph_balancing,0);
    const totalAdded = results.reduce((s,r)=>s+r.amount_added,0);
    const totalPending = results.reduce((s,r)=>s+r.pending_amount,0);
    return `
    <div class="card" style="background:#F7F8F6;margin-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;flex:1;">
          <select class="incStore" data-id="${inc.id}" style="min-width:220px;">
            ${hubs.map(h=>`<option value="${h}" ${inc.storeName===h?'selected':''}>${h}</option>`).join('')}
          </select>
          <input type="date" class="incDate" data-id="${inc.id}" value="${inc.date}">
          <input type="number" class="incRate" data-id="${inc.id}" placeholder="Amount per hour" value="${inc.amountPerHour||''}" style="width:150px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;">Added?
            <select class="incAdded" data-id="${inc.id}">
              <option value="N" ${inc.amountAddedMode==='N'?'selected':''}>No</option>
              <option value="Y" ${inc.amountAddedMode==='Y'?'selected':''}>Yes (pull Considered=Y)</option>
            </select>
          </label>
        </div>
        <button class="btn danger small incRemove" data-id="${inc.id}">Remove</button>
      </div>
      <div style="margin-top:10px;">
        <div class="hint" style="margin-bottom:4px;">Windows (24-hour HH:MM &mdash; type to search or pick a suggestion; if End is earlier than Start, it's treated as rolling into the next day):</div>
        ${inc.windows.map((w,wi)=>`
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
            <input type="text" class="incWinStart" data-id="${inc.id}" data-wi="${wi}" list="timeOptions" placeholder="Start (e.g. 18:00)" value="${w.start}" style="width:170px;">
            <span>&ndash;</span>
            <input type="text" class="incWinEnd" data-id="${inc.id}" data-wi="${wi}" list="timeOptions" placeholder="End (e.g. 00:00)" value="${w.end}" style="width:170px;">
            <button class="btn ghost small incWinRemove" data-id="${inc.id}" data-wi="${wi}" ${inc.windows.length<=1?'disabled':''}>&times;</button>
          </div>
        `).join('')}
        <button class="btn ghost small incWinAdd" data-id="${inc.id}">+ Add window</button>
      </div>
      ${results.length? `
        <div class="scrollbox" style="margin-top:12px;"><table class="datatable"><thead><tr>
          <th>Rider ID</th><th>Rider Name</th><th class="num">Login Hours</th><th class="num">Added</th><th class="num">EPH Balancing</th><th class="num">Pending</th>
        </tr></thead><tbody>
          ${results.map(r=>`<tr><td>${r.rider_id}</td><td>${r.rider_name}</td><td class="num">${r.login_hours}</td><td class="num">${fmtMoney(r.amount_added)}</td><td class="num">${fmtMoney(r.eph_balancing)}</td><td class="num">${fmtMoney(r.pending_amount)}</td></tr>`).join('')}
          <tr style="font-weight:700;border-top:2px solid #D8DBDE;"><td colspan="3">Total (${results.length} rider${results.length===1?'':'s'})</td><td class="num">${fmtMoney(totalAdded)}</td><td class="num">${fmtMoney(totalEph)}</td><td class="num">${fmtMoney(totalPending)}</td></tr>
        </tbody></table></div>
      ` : (inc.storeName && inc.date ? `<div class="hint" style="margin-top:10px;">${ready? 'No riders logged in at this store on this date.' : 'Fill in at least one window and Amount per hour to see results.'}</div>` : '')}
    </div>`;
  }).join('');

  wrap.querySelectorAll('.incStore').forEach(el=> el.onchange = e=>{ findIncident(e.target.dataset.id).storeName = e.target.value; renderIncidents(); });
  wrap.querySelectorAll('.incDate').forEach(el=> el.onchange = e=>{ findIncident(e.target.dataset.id).date = e.target.value; renderIncidents(); });
  wrap.querySelectorAll('.incRate').forEach(el=> el.onchange = e=>{ findIncident(e.target.dataset.id).amountPerHour = parseFloat(e.target.value)||0; renderIncidents(); });
  wrap.querySelectorAll('.incAdded').forEach(el=> el.onchange = e=>{ findIncident(e.target.dataset.id).amountAddedMode = e.target.value; renderIncidents(); });
  wrap.querySelectorAll('.incRemove').forEach(el=> el.onclick = e=>{
    S.storeClosureIncidents = S.storeClosureIncidents.filter(i=>i.id!==e.target.dataset.id);
    renderIncidents();
  });
  wrap.querySelectorAll('.incWinStart').forEach(el=> el.onchange = e=>{
    findIncident(e.target.dataset.id).windows[parseInt(e.target.dataset.wi)].start = e.target.value;
    renderIncidents();
  });
  wrap.querySelectorAll('.incWinEnd').forEach(el=> el.onchange = e=>{
    findIncident(e.target.dataset.id).windows[parseInt(e.target.dataset.wi)].end = e.target.value;
    renderIncidents();
  });
  wrap.querySelectorAll('.incWinAdd').forEach(el=> el.onclick = e=>{
    findIncident(e.target.dataset.id).windows.push({start:'',end:''});
    renderIncidents();
  });
  wrap.querySelectorAll('.incWinRemove').forEach(el=> el.onclick = e=>{
    const inc = findIncident(e.target.dataset.id);
    if(inc.windows.length>1) inc.windows.splice(parseInt(e.target.dataset.wi),1);
    renderIncidents();
  });
}

/* =========================================================================
   PERSISTENCE (survives a page refresh)
   localStorage is far too small for this app's data volumes (tens of
   thousands of rows) — its browser limit is typically 5-10MB total. IndexedDB
   has no such practical limit for this use case, so the whole working state
   (uploaded files, generated Conditions, computed results, current tab) is
   saved there instead, debounced so rapid edits don't trigger a write per
   keystroke.
   ========================================================================= */
const IDB_NAME = 'payout-calculator-state';
const IDB_STORE = 'state';
function idbOpen(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){ reject(new Error('IndexedDB not available in this browser')); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}
async function idbSet(key, value){
  try{
    const db = await idbOpen();
    return await new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error);
    });
  }catch(e){ console.warn('Could not save state to IndexedDB', e); return false; }
}
async function idbGet(key){
  try{
    const db = await idbOpen();
    return await new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE,'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }catch(e){ console.warn('Could not load state from IndexedDB', e); return undefined; }
}
async function idbDelete(key){
  try{
    const db = await idbOpen();
    return await new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>reject(tx.error);
    });
  }catch(e){ return false; }
}
function buildStateSnapshot(){
  return {
    tab: S.tab,
    weekLabel: S.weekLabel,
    data: S.data,
    rc: { sheetNames: S.rc.sheetNames, sheets: S.rc.sheets, selectedSheet: S.rc.selectedSheet },
    rcReview: S.rcReview,
    duplicates: S.duplicates,
    duplicateChoice: S.duplicateChoice,
    newStores: S.newStores,
    newStoreDraft: S.newStoreDraft,
    hubNameMap: S.hubNameMap,
    storeClosureIncidents: S.storeClosureIncidents,
    results: S.results,
    computed: S.computed,
    unmatchedSubtitles: S.unmatchedSubtitles
  };
}
async function persistState(){
  await idbSet('appState', buildStateSnapshot());
}
async function restoreState(){
  let saved;
  try{ saved = await idbGet('appState'); }catch(e){ return false; }
  if(!saved) return false;
  S.tab = saved.tab || 'upload';
  S.weekLabel = saved.weekLabel || '';
  if(saved.data) S.data = saved.data;
  if(saved.rc) S.rc = saved.rc;
  S.rcReview = saved.rcReview || [];
  S.duplicates = saved.duplicates || [];
  S.duplicateChoice = saved.duplicateChoice || {};
  S.newStores = saved.newStores || [];
  S.newStoreDraft = saved.newStoreDraft || {};
  S.hubNameMap = saved.hubNameMap || {};
  S.storeClosureIncidents = saved.storeClosureIncidents || [];
  if(saved.results) S.results = saved.results;
  S.computed = !!saved.computed;
  S.unmatchedSubtitles = saved.unmatchedSubtitles || [];
  if(S.data.conditions && S.data.conditions.length) buildMaps();
  return true;
}
async function clearSavedState(){
  await idbDelete('appState');
}
let persistTimer = null;
function schedulePersist(){
  if(persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(()=>{ persistState(); }, 600);
}

function render(){
  renderNav();
  if(S.tab==='upload') renderUpload();
  else if(S.tab==='rules') renderRules();
  else if(S.tab==='checks') renderChecks();
  else if(S.tab==='orders') renderOrdersPage();
  else if(S.tab==='loginhours') renderLoginHoursPage();
  else if(S.tab==='eph') renderEPH();
  else if(S.tab==='results') renderResults();
  else if(S.tab==='storeclosure') renderStoreClosure();
  schedulePersist();
}

/* =========================================================================
   INIT
   ========================================================================= */
(async function init(){
  const savedRules = loadRules();
  S.rules = (savedRules && savedRules.length) ? savedRules : DEFAULT_RULES.slice();
  document.getElementById('main').innerHTML = '<p class="pagesub">Loading&hellip;</p>';
  await restoreState();
  render();
  document.getElementById('modalWrap').addEventListener('click', e=>{
    if(e.target.id==='modalWrap') closeModal();
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape') closeModal();
  });
  document.addEventListener('click', e=>{
    const dd = document.getElementById('rulesMenuDropdown');
    const btn = document.getElementById('rulesMenuBtn');
    if(dd && dd.style.display!=='none' && !dd.contains(e.target) && e.target!==btn){
      dd.style.display = 'none';
    }
  });
})();
