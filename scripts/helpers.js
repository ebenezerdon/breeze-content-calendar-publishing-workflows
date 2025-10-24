(function(){
  'use strict';
  window.App = window.App || {};

  // Storage wrapper with namespaced keys
  const NS = 'cc_';
  const keys = {
    channels: NS + 'channels',
    posts: NS + 'posts',
    prefs: NS + 'prefs'
  };

  function save(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){ console.error('Storage save failed', e); }
  }
  function load(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e){ console.error('Storage load failed', e); return fallback; }
  }

  // Date helpers
  const DateUtil = {
    toISO(d){
      if (!d) return '';
      const yr = d.getFullYear();
      const mo = String(d.getMonth()+1).padStart(2,'0');
      const da = String(d.getDate()).padStart(2,'0');
      return `${yr}-${mo}-${da}`;
    },
    parseISO(s){
      if (!s) return null;
      const parts = s.split('-');
      if (parts.length !== 3) return null;
      const d = new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    },
    monthLabel(d){
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    },
    startOfMonth(d){
      return new Date(d.getFullYear(), d.getMonth(), 1);
    },
    endOfMonth(d){
      return new Date(d.getFullYear(), d.getMonth()+1, 0);
    },
    // Returns 6 weeks grid matrix: [{date, inMonth, isToday}]
    monthMatrix(baseDate){
      const start = DateUtil.startOfMonth(baseDate);
      const end = DateUtil.endOfMonth(baseDate);
      const startDay = start.getDay(); // 0=Sun
      const todayISO = DateUtil.toISO(new Date());
      // Start from previous Sunday
      const gridStart = new Date(start);
      gridStart.setDate(start.getDate() - startDay);
      const cells = [];
      for (let i=0;i<42;i++){
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate()+i);
        const iso = DateUtil.toISO(d);
        cells.push({ date: d, iso, inMonth: d.getMonth() === baseDate.getMonth(), isToday: iso === todayISO });
      }
      return cells;
    }
  };

  function uid(){
    return 'p_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3);
  }

  const AppStorage = {
    keys,
    save,
    load,
    getChannels(){ return load(keys.channels, null); },
    setChannels(list){ save(keys.channels, list); },
    getPosts(){ return load(keys.posts, null); },
    setPosts(list){ save(keys.posts, list); },
    getPrefs(){ return load(keys.prefs, null); },
    setPrefs(obj){ save(keys.prefs, obj); },
    seedIfEmpty(){
      let channels = AppStorage.getChannels();
      let posts = AppStorage.getPosts();
      let prefs = AppStorage.getPrefs();
      if (!channels){
        channels = [
          { id: 'c_blog', name: 'Blog' },
          { id: 'c_linkedin', name: 'LinkedIn' },
          { id: 'c_instagram', name: 'Instagram' },
          { id: 'c_x', name: 'X' }
        ];
        AppStorage.setChannels(channels);
      }
      if (!posts){
        const today = new Date();
        const in2 = new Date(today); in2.setDate(in2.getDate()+2);
        const in5 = new Date(today); in5.setDate(in5.getDate()+5);
        const yest = new Date(today); yest.setDate(yest.getDate()-1);
        posts = [
          { id: uid(), title: 'Launch teaser', channelId: 'c_instagram', notes: '3-slide carousel', status: 'In Review', publishDate: DateUtil.toISO(in2), tags: [] },
          { id: uid(), title: 'Product blog: 1.2 release', channelId: 'c_blog', notes: 'Screenshots and changelog', status: 'Draft', publishDate: '', tags: ['release'] },
          { id: uid(), title: 'Customer story: Acme', channelId: 'c_linkedin', notes: 'Quote from CTO', status: 'Scheduled', publishDate: DateUtil.toISO(in5), tags: [] },
          { id: uid(), title: 'Weekly recap thread', channelId: 'c_x', notes: '5 tips + CTA', status: 'Published', publishDate: DateUtil.toISO(yest), tags: [] }
        ];
        AppStorage.setPosts(posts);
      }
      if (!prefs){
        prefs = { view: 'calendar', monthISO: DateUtil.toISO(DateUtil.startOfMonth(new Date())), fullWidth: false, filters: { search: '', channels: [], statuses: [] } };
        AppStorage.setPrefs(prefs);
      }
    }
  };

  // In-memory data facade
  const Data = {
    channels: [],
    posts: [],
    prefs: { view: 'calendar', monthISO: '', fullWidth: false, filters: { search: '', channels: [], statuses: [] } },

    load(){
      AppStorage.seedIfEmpty();
      Data.channels = AppStorage.getChannels() || [];
      Data.posts = AppStorage.getPosts() || [];
      Data.prefs = AppStorage.getPrefs() || Data.prefs;
    },
    persist(){ AppStorage.setChannels(Data.channels); AppStorage.setPosts(Data.posts); AppStorage.setPrefs(Data.prefs); },

    addChannel(name){
      const id = 'c_' + Math.random().toString(36).slice(2,8);
      Data.channels.push({ id, name: String(name).trim() });
      Data.persist();
      return id;
    },
    deleteChannel(id){
      Data.channels = Data.channels.filter(c => c.id !== id);
      // Reassign or remove posts from deleted channel: move to first channel if available
      if (Data.channels.length){
        const fallback = Data.channels[0].id;
        Data.posts = Data.posts.map(p => p.channelId === id ? { ...p, channelId: fallback } : p);
      }
      Data.persist();
    },

    addPost(post){
      const id = uid();
      const base = { id, title: '', channelId: Data.channels[0]?.id || '', notes: '', status: 'Draft', publishDate: '', tags: [] };
      const created = { ...base, ...post, id };
      Data.posts.push(created);
      Data.persist();
      return created;
    },
    updatePost(id, patch){
      Data.posts = Data.posts.map(p => p.id === id ? { ...p, ...patch } : p);
      Data.persist();
    },
    deletePost(id){
      Data.posts = Data.posts.filter(p => p.id !== id);
      Data.persist();
    },

    setView(view){ Data.prefs.view = view; Data.persist(); },
    setMonthISO(iso){ Data.prefs.monthISO = iso; Data.persist(); },
    setFilters(filters){ Data.prefs.filters = { ...Data.prefs.filters, ...filters }; Data.persist(); },
    setFullWidth(flag){ Data.prefs.fullWidth = !!flag; Data.persist(); },

    getMonthDate(){
      const d = DateUtil.parseISO(Data.prefs.monthISO);
      return d || DateUtil.startOfMonth(new Date());
    },

    // Filter utility
    filteredPosts(){
      const f = Data.prefs.filters || { search: '', channels: [], statuses: [] };
      const search = (f.search || '').toLowerCase();
      const chs = f.channels || [];
      const sts = f.statuses || [];
      return Data.posts.filter(p => {
        const bySearch = !search || p.title.toLowerCase().includes(search) || (p.tags||[]).join(' ').toLowerCase().includes(search) || (p.notes||'').toLowerCase().includes(search);
        const byChannel = !chs.length || chs.includes(p.channelId);
        const byStatus = !sts.length || sts.includes(p.status);
        return bySearch && byChannel && byStatus;
      });
    },

    postsByDateMap(){
      const map = {};
      for (const p of Data.filteredPosts()){
        if (p.publishDate){
          if (!map[p.publishDate]) map[p.publishDate] = [];
          map[p.publishDate].push(p);
        }
      }
      return map;
    },

    unscheduled(){
      return Data.filteredPosts().filter(p => !p.publishDate);
    },

    moveToDate(postId, iso){
      const p = Data.posts.find(x => x.id === postId);
      if (!p) return;
      const patch = { publishDate: iso };
      if (p.status === 'Draft' || p.status === 'In Review') patch.status = 'Scheduled';
      Data.updatePost(postId, patch);
    },
    moveToStatus(postId, status){
      const p = Data.posts.find(x => x.id === postId);
      if (!p) return;
      const patch = { status };
      if (status !== 'Scheduled') patch.publishDate = p.publishDate; // keep date unless unscheduling manually via modal
      Data.updatePost(postId, patch);
    }
  };

  // Expose on window.App
  window.App.AppStorage = AppStorage;
  window.App.DateUtil = DateUtil;
  window.App.Data = Data;
})();
