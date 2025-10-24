(function(){
  'use strict';
  window.App = window.App || {};

  const STATUS = ['Draft', 'In Review', 'Scheduled', 'Published'];

  function channelById(id){
    return (window.App.Data.channels || []).find(c => c.id === id) || { id, name: 'Unknown' };
  }

  function statusBadge(status){
    if (status === 'Draft') return '<span class="badge-draft">Draft</span>';
    if (status === 'In Review') return '<span class="badge-review">In Review</span>';
    if (status === 'Scheduled') return '<span class="badge-scheduled">Scheduled</span>';
    if (status === 'Published') return '<span class="badge-published">Published</span>';
    return `<span class="badge">${status}</span>`;
  }

  function channelPill(id){
    const ch = channelById(id);
    const initial = (ch.name || '?').slice(0,1).toUpperCase();
    return `<span class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700"><span class="inline-block h-1.5 w-1.5 rounded-full bg-sky-500"></span>${ch.name || 'Channel'}<span class="ml-1 rounded bg-slate-100 px-1 text-[10px]">${initial}</span></span>`;
  }

  function postCard(p){
    const ch = channelById(p.channelId);
    const dateShort = p.publishDate ? new Date(p.publishDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    return `
      <article class="post-card" tabindex="0" role="button" data-id="${p.id}" draggable="true" aria-label="Post ${p.title}">
        <div class="flex items-start justify-between gap-2">
          <h4 class="line-clamp-2 font-semibold">${escapeHTML(p.title)}</h4>
          <button class="btn-ghost !px-2 !py-1 text-xs action-edit" data-id="${p.id}">Edit</button>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          ${channelPill(p.channelId)}
          ${statusBadge(p.status)}
          ${dateShort ? `<span class="badge bg-slate-100 text-slate-700">${dateShort}</span>` : ''}
        </div>
      </article>
    `;
  }

  function escapeHTML(str){
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str || '').replace(/[&<>"']/g, m => map[m]);
  }

  // Render calendar
  function renderCalendar(){
    const $wrap = $('#calendar-view').empty();
    const monthDate = window.App.Data.getMonthDate();
    const label = window.App.DateUtil.monthLabel(monthDate);
    $('#month-label').text(label);

    const grid = window.App.DateUtil.monthMatrix(monthDate);
    const byDate = window.App.Data.postsByDateMap();

    const $grid = $('<div class="calendar-grid min-w-[84rem]" role="grid" aria-label="Monthly calendar"></div>');
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const $heads = $('<div class="grid grid-cols-7 gap-3 mb-2 min-w-[84rem]"></div>');
    weekdays.forEach(w => $heads.append(`<div class="text-xs font-semibold text-slate-500 px-2">${w}</div>`));

    const $scroll = $('<div class="overflow-x-auto w-full min-w-0 pb-2"></div>');
    $scroll.append($heads);

    grid.forEach(cell => {
      const classes = ['calendar-cell'];
      if (!cell.inMonth) classes.push('calendar-cell-muted');
      const $cell = $(`
        <div class="${classes.join(' ')}" tabindex="0" role="gridcell" aria-label="${cell.iso}" data-date="${cell.iso}">
          <div class="calendar-date">
            <span class="${cell.isToday ? 'text-sky-700' : ''}">${new Date(cell.date).getDate()}</span>
            ${cell.isToday ? '<span class="badge bg-sky-100 text-sky-800">Today</span>' : ''}
          </div>
          <div class="space-y-2 day-posts"></div>
        </div>
      `);
      const posts = byDate[cell.iso] || [];
      posts.forEach(p => $cell.find('.day-posts').append(postCard(p)));
      $grid.append($cell);
    });

    $scroll.append($grid);
    $wrap.append($scroll);
  }

  // Render Kanban board
  function renderBoard(){
    const $wrap = $('#board-view').empty();
    const cols = STATUS.map(s => ({ key: s, title: s }));
    const posts = window.App.Data.filteredPosts();

    const $board = $('<div class="flex gap-3 overflow-x-auto pb-2"></div>');
    cols.forEach(col => {
      const $col = $(`
        <section class="kanban-col" data-status="${col.key}" aria-label="${col.title} column">
          <div class="kanban-title">
            <span>${col.title}</span>
            <span class="text-slate-400" data-count></span>
          </div>
          <div class="space-y-2 col-posts"></div>
        </section>
      `);
      const inCol = posts.filter(p => p.status === col.key);
      $col.find('[data-count]').text(inCol.length);
      inCol.forEach(p => $col.find('.col-posts').append(postCard(p)));
      $board.append($col);
    });

    $wrap.append($board);
  }

  function renderBacklog(){
    const $list = $('#backlog-list').empty();
    const items = window.App.Data.unscheduled();
    if (!items.length){
      $list.append('<p class="mute text-sm">No unscheduled posts.</p>');
      return;
    }
    items.forEach(p => $list.append(postCard(p)));
  }

  function renderFilters(){
    const f = window.App.Data.prefs.filters || { search: '', channels: [], statuses: [] };
    $('#search').val(f.search || '');
    const $ch = $('#filter-channels').empty();
    (window.App.Data.channels || []).forEach(c => {
      const active = (f.channels||[]).includes(c.id);
      $ch.append(`
        <button class="chip filter-channel ${active ? 'ring-2 ring-sky-200' : ''}" data-id="${c.id}" aria-pressed="${active}">
          <span class="h-2 w-2 rounded-full bg-sky-500"></span>
          ${escapeHTML(c.name)}
        </button>
      `);
    });
    const $st = $('#filter-status').empty();
    STATUS.forEach(s => {
      const active = (f.statuses||[]).includes(s);
      $st.append(`
        <button class="chip filter-status ${active ? 'ring-2 ring-sky-200' : ''}" data-id="${s}" aria-pressed="${active}">
          ${statusBadge(s)}
        </button>
      `);
    });
  }

  function renderChannelModal(){
    const $list = $('#channel-list').empty();
    window.App.Data.channels.forEach(c => {
      const count = window.App.Data.posts.filter(p => p.channelId === c.id).length;
      const $row = $(`
        <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <div class="flex items-center gap-2 text-sm">
            <span class="inline-block h-2 w-2 rounded-full bg-sky-500"></span>
            <span class="font-medium">${escapeHTML(c.name)}</span>
            <span class="text-xs text-slate-500">${count} posts</span>
          </div>
          <button class="btn-ghost btn-delete-channel" data-id="${c.id}">Remove</button>
        </div>
      `);
      $list.append($row);
    });
  }

  function renderPostModal(post){
    const channels = window.App.Data.channels || [];
    const $sel = $('#post-channel').empty();
    channels.forEach(c => $sel.append(`<option value="${c.id}">${escapeHTML(c.name)}</option>`));

    if (post){
      $('#post-modal-title').text('Edit Post');
      $('#post-id').val(post.id);
      $('#post-title').val(post.title);
      $('#post-channel').val(post.channelId);
      $('#post-date').val(post.publishDate || '');
      $('#post-status').val(post.status);
      $('#post-notes').val(post.notes || '');
      $('#post-delete').show();
    } else {
      $('#post-modal-title').text('New Post');
      $('#post-id').val('');
      $('#post-title').val('');
      $('#post-channel').val(channels[0]?.id || '');
      $('#post-date').val('');
      $('#post-status').val('Draft');
      $('#post-notes').val('');
      $('#post-delete').hide();
    }
    openModal('#post-modal');
  }

  function openModal(sel){ $(sel).removeClass('hidden').addClass('show').attr('aria-hidden','false'); }
  function closeModal(sel){ $(sel).addClass('hidden').removeClass('show').attr('aria-hidden','true'); }

  function bindCommon(){
    // Tabs
    $('.tab-btn').on('click', function(){
      const view = $(this).data('view');
      window.App.Data.setView(view);
      $('.tab-btn').attr('aria-pressed','false');
      $(this).attr('aria-pressed','true');
      toggleViews();
    });

    $('#btn-add').on('click', function(){ renderPostModal(null); });

    // Full-width calendar toggle
    $('#btn-toggle-fullwidth').on('click', function(){
      const next = !Boolean(window.App.Data.prefs.fullWidth);
      window.App.Data.setFullWidth(next);
      applyFullWidthLayout();
    });

    // Month nav
    $('#btn-prev').on('click', function(){
      const d = window.App.Data.getMonthDate();
      const prev = new Date(d.getFullYear(), d.getMonth()-1, 1);
      window.App.Data.setMonthISO(window.App.DateUtil.toISO(prev));
      window.App.render();
    });
    $('#btn-next').on('click', function(){
      const d = window.App.Data.getMonthDate();
      const next = new Date(d.getFullYear(), d.getMonth()+1, 1);
      window.App.Data.setMonthISO(window.App.DateUtil.toISO(next));
      window.App.render();
    });
    $('#btn-today').on('click', function(){
      const todayStart = window.App.DateUtil.startOfMonth(new Date());
      window.App.Data.setMonthISO(window.App.DateUtil.toISO(todayStart));
      window.App.render();
    });

    // Filters
    $('#search').on('input', function(){
      const v = $(this).val();
      const f = window.App.Data.prefs.filters || {};
      window.App.Data.setFilters({ ...f, search: v });
      window.App.render();
    });
    $('#filter-channels').on('click', '.filter-channel', function(){
      const id = $(this).data('id');
      const f = window.App.Data.prefs.filters || { channels: [] };
      const list = new Set(f.channels || []);
      if (list.has(id)) list.delete(id); else list.add(id);
      window.App.Data.setFilters({ ...f, channels: Array.from(list) });
      window.App.render();
    });
    $('#filter-status').on('click', '.filter-status', function(){
      const id = $(this).data('id');
      const f = window.App.Data.prefs.filters || { statuses: [] };
      const list = new Set(f.statuses || []);
      if (list.has(id)) list.delete(id); else list.add(id);
      window.App.Data.setFilters({ ...f, statuses: Array.from(list) });
      window.App.render();
    });
    $('#btn-clear-filters').on('click', function(){ window.App.Data.setFilters({ search:'', channels:[], statuses:[] }); window.App.render(); });

    // Backlog collapse
    $('#btn-collapse-backlog').on('click', function(){
      $('#backlog-list').toggleClass('hide');
      $(this).text($('#backlog-list').hasClass('hide') ? 'Expand' : 'Collapse');
    });

    // Modals
    $('#post-modal-close, #post-cancel').on('click', function(){ closeModal('#post-modal'); });
    $('#channels-close').on('click', function(){ closeModal('#channels-modal'); });
    $('#btn-manage-channels').on('click', function(){ renderChannelModal(); openModal('#channels-modal'); });

    // Form submit
    $('#post-form').on('submit', function(e){
      e.preventDefault();
      const id = $('#post-id').val();
      const title = String($('#post-title').val() || '').trim();
      const channelId = $('#post-channel').val();
      const publishDate = $('#post-date').val();
      const status = $('#post-status').val();
      const notes = $('#post-notes').val();
      if (!title){
        $('#post-title').focus();
        return;
      }
      if (id){
        window.App.Data.updatePost(id, { title, channelId, publishDate, status, notes });
      } else {
        window.App.Data.addPost({ title, channelId, publishDate, status, notes });
      }
      closeModal('#post-modal');
      window.App.render();
    });
    $('#post-delete').on('click', function(){
      const id = $('#post-id').val();
      if (id){ window.App.Data.deletePost(id); closeModal('#post-modal'); window.App.render(); }
    });

    $('#channel-form').on('submit', function(e){
      e.preventDefault();
      const name = String($('#channel-name').val() || '').trim();
      if (!name) return;
      window.App.Data.addChannel(name);
      $('#channel-name').val('');
      renderChannelModal();
      renderFilters();
      renderPostModal(null); // refresh modal channel options if open
      $('#post-modal').addClass('hidden'); // avoid reopening unintentionally
    });
    $('#channel-list').on('click', '.btn-delete-channel', function(){
      const id = $(this).data('id');
      window.App.Data.deleteChannel(id);
      renderChannelModal();
      renderFilters();
      window.App.render();
    });

    // Delegated edit buttons on cards
    $('#calendar-view, #board-view, #backlog').on('click', '.action-edit', function(e){
      e.stopPropagation();
      const id = $(this).data('id');
      const post = window.App.Data.posts.find(x => x.id === id);
      renderPostModal(post);
    });

    // Clicking card opens modal
    $('#calendar-view, #board-view, #backlog').on('click', '.post-card', function(e){
      if ($(e.target).closest('.action-edit').length) return; // already handled
      const id = $(this).data('id');
      const post = window.App.Data.posts.find(x => x.id === id);
      renderPostModal(post);
    });

    // Drag and drop for posts onto calendar cells
    $(document).on('dragstart', '.post-card', function(ev){
      const id = $(this).data('id');
      try { ev.originalEvent.dataTransfer.setData('text/plain', id); } catch(e){}
    });
    $(document).on('dragover', '.calendar-cell', function(ev){ ev.preventDefault(); $(this).addClass('drag-over'); });
    $(document).on('dragleave', '.calendar-cell', function(){ $(this).removeClass('drag-over'); });
    $(document).on('drop', '.calendar-cell', function(ev){
      ev.preventDefault();
      $(this).removeClass('drag-over');
      const id = (ev.originalEvent.dataTransfer && ev.originalEvent.dataTransfer.getData('text/plain')) || '';
      const iso = $(this).data('date');
      if (id && iso){ window.App.Data.moveToDate(id, iso); window.App.render(); }
    });

    // Drag and drop within Kanban
    $(document).on('dragover', '.kanban-col', function(ev){ ev.preventDefault(); });
    $(document).on('drop', '.kanban-col', function(ev){
      ev.preventDefault();
      const id = (ev.originalEvent.dataTransfer && ev.originalEvent.dataTransfer.getData('text/plain')) || '';
      const status = $(this).data('status');
      if (id && status){ window.App.Data.moveToStatus(id, status); window.App.render(); }
    });
  }

  function toggleViews(){
    const v = window.App.Data.prefs.view || 'calendar';
    if (v === 'calendar'){
      $('#calendar-view').removeClass('hidden');
      $('#board-view').addClass('hidden');
    } else {
      $('#board-view').removeClass('hidden');
      $('#calendar-view').addClass('hidden');
    }
  }

  function applyFullWidthLayout(){
    const on = !!(window.App.Data && window.App.Data.prefs && window.App.Data.prefs.fullWidth);
    // Update button state/text
    $('#btn-toggle-fullwidth').attr('aria-pressed', String(on)).text(on ? 'Exit full width' : 'Full width');
    // Toggle sidebars visibility
    if (on) {
      $('#filters, #backlog').addClass('hidden');
      $('#layout').removeClass('lg:grid');
    } else {
      $('#filters, #backlog').removeClass('hidden');
      $('#layout').addClass('lg:grid');
    }
  }

  function syncTabButtons(){
    const v = window.App.Data.prefs.view || 'calendar';
    $('.tab-btn').attr('aria-pressed','false');
    $(`.tab-btn[data-view="${v}"]`).attr('aria-pressed','true');
  }

  function hydrateChannelSelect(){
    const channels = window.App.Data.channels || [];
    const $sel = $('#post-channel').empty();
    channels.forEach(c => $sel.append(`<option value="${c.id}">${escapeHTML(c.name)}</option>`));
  }

  // Public API
  window.App.init = function(){
    window.App.Data.load();
    // If first load without month, set to current month
    if (!window.App.Data.prefs.monthISO){
      const iso = window.App.DateUtil.toISO(window.App.DateUtil.startOfMonth(new Date()));
      window.App.Data.setMonthISO(iso);
    }
    bindCommon();
  };

  window.App.render = function(){
    renderFilters();
    hydrateChannelSelect();
    syncTabButtons();
    renderBacklog();
    renderCalendar();
    renderBoard();
    applyFullWidthLayout();
    toggleViews();
  };
})();
