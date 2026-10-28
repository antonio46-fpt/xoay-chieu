/** Đồng bộ nháp an toàn và Sổ của đúng tài khoản; bản gốc luôn được giữ trên máy. */
const LearningSync = (() => {
  let loadedOwner = '', loading = false, busy = false, timer = null, error = '';
  const store = p => p.cloud ||= {versions:{},saved:{},pending:{},conflicts:{},backups:[]};
  const identity = owner => profile && Core.key(profile) === owner;
  const safe = draft => {
    const copy = JSON.parse(JSON.stringify(draft));
    for (const [key,value] of Object.entries(copy.answers)) {
      if (typeof value === 'string' && Core.safetyMatches(value, CONTENT.an_toan)) copy.answers[key] = Safety.hidden;
    }
    return copy;
  };
  const fingerprint = draft => {
    const value=safe(draft), sorted=object=>Object.fromEntries(Object.keys(object).sort().map(key=>[key,object[key]]));
    return JSON.stringify({id:value.id,version:value.version,step:value.step,answers:sorted(value.answers),started:value.started,hints:sorted(value.hints),sourceId:value.sourceId||''});
  };
  async function flushBeforeLogout() {
    const owner=profile&&Core.key(profile), deadline=Date.now()+APP_CONFIG.rpcTimeoutMs+1000;
    while(busy && identity(owner) && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,100));
    if(identity(owner)) await flush();
    if(identity(owner) && !error && Object.keys(store(person()).pending).length) await flush();
  }
  function reset() {loadedOwner='';loading=false;error='';clearInterval(timer);timer=null;}
  function begin() {reset();loading=true;}
  function remember() {
    if (!LIVE || !profile || loadedOwner !== Core.key(profile)) return;
    const p=person(), cloud=store(p);
    for (const [week,draft] of Object.entries(p.drafts)) {
      if (cloud.conflicts[week] || p.history.some(item=>item.sent && item.record.id===draft.id)) continue;
      const fp=fingerprint(draft), pending=cloud.pending[week];
      if (cloud.saved[week]===fp && !pending) continue;
      if (!pending || !pending.attempted) cloud.pending[week]={week:Number(week),mutationId:pending?.mutationId || Core.id(),expectedRevision:cloud.versions[week] || 0,draft:safe(draft),attempted:false};
    }
    for (const week of Object.keys(cloud.pending)) if (!p.drafts[week]) delete cloud.pending[week];
    if (!timer) timer=setInterval(syncMinute,APP_CONFIG.syncIntervalMs || 60000);
    view();
  }
  function conflict(cloud,week,remote,revision) {
    cloud.conflicts[week]={draft:remote,revision};
    error='Có nháp khác trên Sheet. Hai bản vẫn được giữ; hãy chọn bản muốn tiếp tục.';
  }
  async function load() {
    if (!LIVE || !studentAuthorized(profile)) {loading=false;return;}
    const auth=studentAuth, owner=Core.key(profile), p=person(), before=JSON.stringify(p.drafts);
    loading=true;view();
    try {
      const result=await rpc('getStudentLearning',{...profile,token:auth.token});
      if (!identity(owner) || studentAuth!==auth) return;
      if (!result?.ok) {
        if(result?.code==='AUTH_REQUIRED'){studentAuth=null;showStudentReauth();}
        throw Error(result?.error || 'Chưa tải được nháp từ Sheet.');
      }
      if(!Array.isArray(result.states)||!Array.isArray(result.records)) throw Error('Máy chủ chưa hỗ trợ khôi phục nháp. Hãy cập nhật Learning.gs.');
      const cloud=store(p), changedWhileLoading=JSON.stringify(p.drafts)!==before;
      for (const record of result.records) {
        if (Core.key(record)!==owner || record.loai!=='chu_trinh') continue;
        const old=p.history.find(item=>item.record.id===record.id);
        if (!old) p.history.push({record,sent:true,remoteCopy:true});
        else if (Object.entries(record).every(([key,value])=>key==='thoi_gian_nhan' || (Core.safeRecord(old.record,CONTENT.an_toan)[key] ?? '')===value)) old.sent=true;
      }
      p.history.sort((a,b)=>String(a.record.thoi_gian).localeCompare(String(b.record.thoi_gian)));
      const states=new Map(result.states.filter(state=>Number.isInteger(state.week)&&state.week>=1&&state.week<=4&&Number.isInteger(state.revision)).map(state=>[String(state.week),state]));
      for(let number=1;number<=4;number++) {
        const week=String(number), state=states.get(week)||{week:number,revision:0,draft:null}, local=p.drafts[week], pending=cloud.pending[week];
        const previousVersion=cloud.versions[week];
        let acknowledgedPending=false;
        if (pending && state.mutationId===pending.mutationId && state.draft && fingerprint(state.draft)===fingerprint(pending.draft)) {
          cloud.saved[week]=fingerprint(pending.draft);delete cloud.pending[week];acknowledgedPending=true;
        }
        if (local && p.history.some(item=>item.sent&&item.record.id===local.id)) {
          if(tab==='work' && activeWeek===number) conflict(cloud,week,null,state.revision);
          else {cloud.backups.push({week:number,draft:local,reason:'Bài đã được xác nhận trên Sheet'});delete p.drafts[week];delete cloud.pending[week];}
        } else if (state.draft) {
          if (!local) {
            // Không dựng lại ô viết đang mở từ một phản hồi mạng đến chậm.
            if(!(changedWhileLoading&&tab==='work'&&activeWeek===number)) p.drafts[week]=state.draft;
            cloud.saved[week]=fingerprint(state.draft);
          } else if (fingerprint(local)===fingerprint(state.draft)) cloud.saved[week]=fingerprint(state.draft);
          else if (acknowledgedPending) { /* ACK trước bị mất; giữ phần mới viết sau snapshot đó. */ }
          else if (pending && pending.expectedRevision===state.revision) { /* Nháp trên máy mới hơn, giữ gói chờ. */ }
          else if (previousVersion===state.revision && previousVersion!==undefined) { /* Giữ phần mới chưa đồng bộ. */ }
          else if (cloud.saved[week]===fingerprint(local) && !(tab==='work'&&activeWeek===number)) {
            cloud.backups.push({week:number,draft:local,reason:'Trước khi khôi phục bản mới từ Sheet'});
            p.drafts[week]=state.draft;cloud.saved[week]=fingerprint(state.draft);
          } else conflict(cloud,week,state.draft,state.revision);
        } else if (local && previousVersion>state.revision) conflict(cloud,week,null,state.revision);
        cloud.versions[week]=state.revision;
      }
      if (!persist()) throw Error('Chưa ghi được tiến trình tải về trên thiết bị; không tự gửi nháp.');
      loadedOwner=owner;error=Object.keys(cloud.conflicts).length?'Có hai bản nháp cần bạn chọn.':'';
      remember();persist();
    } catch(e) {if(identity(owner)) error=e.message+' Nháp trên máy vẫn được giữ.';}
    finally {if(identity(owner) && (!studentAuth || studentAuth===auth)){loading=false;view();}}
  }
  async function syncMinute() {
    if (!profile || loadedOwner!==Core.key(profile) || loadBroken || storageConflict) return;
    const owner=Core.key(profile);
    collect();
    if(!persist())return;
    remember();persist();
    if(!studentAuthorized(profile)){error='Phiên học sinh hết hạn. Nhập lại mật khẩu để tiếp tục đồng bộ.';showStudentReauth();view();return;}
    await flush();
    // Nếu lần trước mất ACK, gửi nốt snapshot mới sau khi đã xác nhận snapshot cũ.
    if(identity(owner) && !error && Object.keys(store(person()).pending).length) await flush();
  }
  async function flush() {
    if(busy || !LIVE || !navigator.onLine || !studentAuthorized(profile) || loadedOwner!==Core.key(profile) || loadBroken || storageConflict) return;
    remember();
    const owner=Core.key(profile),auth=studentAuth,p=person(),cloud=store(p);
    busy=true;
    try {
      for(const week of Object.keys(cloud.pending)) {
        if(cloud.conflicts[week])continue;
        const item=cloud.pending[week];item.attempted=true;
        if(!persist())break;
        const result=await rpc('saveStudentDraft',{...profile,token:auth.token,week:item.week,mutationId:item.mutationId,expectedRevision:item.expectedRevision,draft:item.draft});
        // Không cho ACK của tài khoản cũ tác động đến tài khoản đang mở.
        if(!identity(owner) || studentAuth!==auth)return;
        if(result?.ok && result.mutationId===item.mutationId && Number.isInteger(result.revision)) {
          cloud.versions[week]=result.revision;cloud.saved[week]=fingerprint(item.draft);delete cloud.pending[week];cloud.lastSyncedAt=result.updatedAt || new Date().toISOString();error='';
        } else if(result?.code==='STATE_CONFLICT') {
          conflict(cloud,week,result.draft,result.revision);
        } else if(result?.code==='ALREADY_SUBMITTED') {
          error=result.error;await load();
        } else {
          if(result?.code==='AUTH_REQUIRED'){studentAuth=null;showStudentReauth();}
          throw Error(result?.error || 'Chưa nhận xác nhận lưu nháp.');
        }
        persist();
      }
    } catch(e){if(identity(owner))error=e.message+' Bản nháp vẫn ở trên máy, sẽ thử lại khi có mạng.';}
    finally {busy=false;if(identity(owner)){remember();persist();view();}}
  }
  function resolve(week,useRemote) {
    collect();const p=person(),cloud=store(p),choice=cloud.conflicts[week];
    if(!choice)return;
    const previousDrafts=JSON.parse(JSON.stringify(p.drafts)),previousCloud=JSON.parse(JSON.stringify(cloud));
    if(p.drafts[week])cloud.backups.push({week:Number(week),draft:JSON.parse(JSON.stringify(p.drafts[week])),reason:'Trước khi chọn bản nháp'});
    if(choice.draft)cloud.backups.push({week:Number(week),draft:JSON.parse(JSON.stringify(choice.draft)),reason:'Bản trên Sheet khi xử lý xung đột'});
    if(useRemote) {
      if(choice.draft){p.drafts[week]=JSON.parse(JSON.stringify(choice.draft));cloud.saved[week]=fingerprint(choice.draft);}
      else {delete p.drafts[week];delete cloud.saved[week];}
    } else if(p.drafts[week]) {
      p.drafts[week].id=Core.id();delete cloud.saved[week];
    }
    cloud.versions[week]=choice.revision;delete cloud.conflicts[week];delete cloud.pending[week];error='';
    if(!persist()){p.drafts=previousDrafts;p.cloud=previousCloud;toast('Chưa lưu được lựa chọn. Hai bản nháp vẫn được giữ; hãy tải bản sao trong Cài đặt.');return;}
    remember();persist();
    if(tab==='work'&&activeWeek===Number(week)&&!p.drafts[week])tab='home';
    render();flush();
  }
  function view() {
    if(!LIVE || !profile || !$('page'))return;
    const cloud=store(person()), pending=Object.keys(cloud.pending).length;
    const text=error || (loading?'Đang khôi phục nháp và bài cũ từ Sheet…':busy?'Đang lưu nháp lên Sheet…':loadedOwner!==Core.key(profile)?'Chưa khôi phục tiến trình từ Sheet. Nháp trên máy vẫn được giữ.':pending?'Nháp đã lưu trên máy, đang chờ đồng bộ lên Sheet.':'Nháp đã đồng bộ. Tuần sau đăng nhập cùng tài khoản để tiếp tục.');
    const confirmed=cloud.lastSyncedAt && Number.isFinite(Date.parse(cloud.lastSyncedAt)) ? ' · Xác nhận gần nhất '+new Date(cloud.lastSyncedAt).toLocaleTimeString('vi-VN') : '';
    const detail=text+' · Tự đồng bộ mỗi 60 giây khi có thay đổi'+confirmed;
    if($('draftStatus'))$('draftStatus').textContent=detail;
    let status=$('learningStatus');
    if(!status){status=document.createElement('p');status.id='learningStatus';status.className='notice';status.setAttribute('role','status');$('page').prepend(status);}
    status.textContent=detail;
    $('learningNotice')?.remove();
    const conflicts=Object.entries(cloud.conflicts);
    if(!conflicts.length)return;
    const notice=document.createElement('section');notice.id='learningNotice';notice.className='notice';
    notice.innerHTML=`<p role="status">Có hai bản nháp. Cả hai được giữ trong bản sao của thiết bị; chọn bản bạn muốn tiếp tục.</p>${conflicts.map(([week])=>`<p>Tuần ${E(week)}</p><div class="row"><button type="button" data-cloud-local="${E(week)}">Giữ bản trên máy thành lượt mới</button><button type="button" data-cloud-remote="${E(week)}">Dùng bản trên Sheet</button></div>`).join('')}`;
    $('page').prepend(notice);
    notice.querySelectorAll('[data-cloud-local]').forEach(button=>button.onclick=()=>resolve(button.dataset.cloudLocal,false));
    notice.querySelectorAll('[data-cloud-remote]').forEach(button=>button.onclick=()=>resolve(button.dataset.cloudRemote,true));
  }
  return {begin,reset,load,remember,flush,flushBeforeLogout,view,get loading(){return loading;},get ready(){return !!profile&&loadedOwner===Core.key(profile);},get pending(){return !!profile&&Object.keys(store(person()).pending).length>0;}};
})();
